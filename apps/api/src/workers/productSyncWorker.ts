import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchStoreCurrency, fetchProductVariations, fetchStoreSettings, fetchAllCategories, enrichProductCategories } from '../services/wooClient';
import { transformWooProduct, mergeParentAndVariation, checksum } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { validateProduct, ProductFieldOverrides } from '@productsynch/shared';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { Shop } from '@prisma/client';

/**
 * Process a single product (simple product or merged variation)
 */
async function processProduct(data: any, shop: Shop, shopId: string, autoFillService: AutoFillService) {
  const existing = await prisma.product.findUnique({
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
    select: {
      id: true,
      checksum: true,
      status: true,
      feedEnableSearch: true,
      feedEnableCheckout: true,
      productFieldOverrides: true,
      updatedAt: true,
    },
  });

  // Check if field mappings or shop settings changed since product was last updated
  const mappingsChangedSinceLastUpdate = shop.fieldMappingsUpdatedAt &&
    existing?.updatedAt &&
    shop.fieldMappingsUpdatedAt > existing.updatedAt;

  // Check if shop settings (currency, units, seller info) changed since product was last updated
  const settingsChangedSinceLastUpdate = shop.shopSettingsUpdatedAt &&
    existing?.updatedAt &&
    shop.shopSettingsUpdatedAt > existing.updatedAt;

  const needsReprocessing = mappingsChangedSinceLastUpdate || settingsChangedSinceLastUpdate;

  if (existing && existing.checksum === data.checksum && !needsReprocessing) {
    logger.info(`product-sync: skipping unchanged product`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
    });
    return;
  }

  if (existing) {
    let reason = 'checksum changed';
    if (mappingsChangedSinceLastUpdate) reason = 'mappings changed';
    else if (settingsChangedSinceLastUpdate) reason = 'shop settings changed';

    logger.info(`product-sync: updating product (${reason})`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
      oldChecksum: existing.checksum,
      newChecksum: data.checksum,
      mappingsChangedSinceLastUpdate,
      settingsChangedSinceLastUpdate,
    });
  } else {
    logger.info(`product-sync: creating new product`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
    });
  }

  // Determine product-level flags (use existing if available, otherwise shop defaults)
  const enableSearch = existing?.feedEnableSearch ?? shop.defaultEnableSearch;
  const enableCheckout = existing?.feedEnableCheckout ?? shop.defaultEnableCheckout;

  // Get existing product-level field overrides (if any)
  const productOverrides = (existing?.productFieldOverrides as unknown as ProductFieldOverrides) || {};

  // Auto-fill all 70 OpenAI attributes from WooCommerce data (including flags and overrides)
  const openaiAutoFilled = autoFillService.autoFillProduct(
    data.wooRawJson,
    { enableSearch, enableCheckout },
    productOverrides
  );

  // Validate the product with auto-filled values (using shared validation)
  const validation = validateProduct(
    openaiAutoFilled,
    enableCheckout
  );

  await prisma.product.upsert({
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
    create: {
      shopId,
      status: existing?.status || 'PENDING_REVIEW',
      syncStatus: 'PENDING',
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      // Apply shop defaults for toggle fields on new products
      feedEnableSearch: shop.defaultEnableSearch,
      feedEnableCheckout: shop.defaultEnableCheckout,
      ...data,
    },
    update: {
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      ...data,
      status: existing?.status || 'PENDING_REVIEW',
      syncStatus: 'PENDING',
      // DON'T update toggle fields on sync - preserve user's product-level settings
    },
  });

  logger.info('product-sync: auto-filled and validated', {
    shopId,
    wooProductId: data.wooProductId,
    wooParentId: data.wooParentId,
    isValid: validation.isValid,
    errorCount: Object.keys(validation.errors).length,
  });
}

export async function productSyncProcessor(job: Job) {
  logger.info(`product-sync job received`, job.data);
  const { shopId } = job.data as { shopId: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  // If no Woo credentials, mark sync complete.
  if (!shop.wooConsumerKey || !shop.wooConsumerSecret) {
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
    return;
  }

  try {
    const client = createWooClient({
      storeUrl: shop.wooStoreUrl,
      consumerKey: shop.wooConsumerKey,
      consumerSecret: shop.wooConsumerSecret,
    });

    // Refresh shop settings from WooCommerce on each sync
    logger.info('product-sync: refreshing shop settings from WooCommerce', { shopId });
    const settings = await fetchStoreSettings(client, shop.wooStoreUrl);

    if (settings) {
      // Check if any auto-fill-affecting settings have changed
      const settingsChanged =
        shop.shopCurrency !== settings.shopCurrency ||
        shop.dimensionUnit !== settings.dimensionUnit ||
        shop.weightUnit !== settings.weightUnit;

      const updateData: any = {
        shopCurrency: settings.shopCurrency,
        dimensionUnit: settings.dimensionUnit,
        weightUnit: settings.weightUnit,
        // Populate sellerUrl from wooStoreUrl if not set
        sellerUrl: shop.sellerUrl || shop.wooStoreUrl,
      };

      // If settings changed, update shopSettingsUpdatedAt to trigger product reprocessing
      if (settingsChanged) {
        updateData.shopSettingsUpdatedAt = new Date();
        logger.info('product-sync: shop settings changed, will reprocess products', {
          shopId,
          oldCurrency: shop.shopCurrency,
          newCurrency: settings.shopCurrency,
          oldDimensionUnit: shop.dimensionUnit,
          newDimensionUnit: settings.dimensionUnit,
          oldWeightUnit: shop.weightUnit,
          newWeightUnit: settings.weightUnit,
        });
      }
      // sellerName, sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only

      await prisma.shop.update({
        where: { id: shopId },
        data: updateData,
      });

      logger.info('product-sync: shop settings refreshed', {
        shopId,
        shopCurrency: settings.shopCurrency,
        dimensionUnit: settings.dimensionUnit,
        weightUnit: settings.weightUnit,
        settingsChanged,
      });

      // Update local shop object cache
      if (settingsChanged) {
        shop.shopSettingsUpdatedAt = updateData.shopSettingsUpdatedAt;
      }
      shop.shopCurrency = settings.shopCurrency || null;
      shop.dimensionUnit = settings.dimensionUnit || null;
      shop.weightUnit = settings.weightUnit || null;
      if (!shop.sellerUrl) {
        shop.sellerUrl = shop.wooStoreUrl;
      }
    } else {
      logger.warn('product-sync: failed to fetch shop settings, using existing values', { shopId });

      // Fallback: Pull currency if not set yet
      if (!shop.shopCurrency) {
        const currency = await fetchStoreCurrency(client);
        if (currency) {
          await prisma.shop.update({
            where: { id: shopId },
            data: { shopCurrency: currency, shopSettingsUpdatedAt: new Date() },
          });
          logger.info('product-sync: currency updated from Woo (fallback)', { shopId, currency });
          shop.shopCurrency = currency;
          shop.shopSettingsUpdatedAt = new Date();
        }
      }
    }

    // Always do full sync - checksum optimization prevents unnecessary DB writes
    const products = await fetchAllProducts(client);

    logger.info(`product-sync: fetched products`, {
      shopId,
      count: products.length,
    });

    // Fetch all categories to enable proper category hierarchy building
    const categoryMap = await fetchAllCategories(client);
    logger.info(`product-sync: fetched categories`, {
      shopId,
      categoryCount: categoryMap.size,
    });

    // Create AutoFillService once with custom field mappings from database
    const autoFillService = await AutoFillService.create(shop);

    for (const wooProd of products) {
      // Enrich product categories with parent field for hierarchy building
      const enrichedProduct = enrichProductCategories(wooProd, categoryMap);
      // Check if this is a variable product
      const isVariable = enrichedProduct.type === 'variable';

      if (isVariable) {
        logger.info(`product-sync: detected variable product, fetching variations`, {
          shopId,
          parentId: enrichedProduct.id,
          title: enrichedProduct.name,
        });

        // Fetch all variations for this variable product
        const variations = await fetchProductVariations(client, enrichedProduct.id);

        logger.info(`product-sync: processing ${variations.length} variations`, {
          shopId,
          parentId: enrichedProduct.id,
        });

        // Process each variation
        for (const variation of variations) {
          await processProduct(
            mergeParentAndVariation(enrichedProduct, variation, shop.shopCurrency || 'USD'),
            shop,
            shopId,
            autoFillService
          );
        }

        // Skip creating an entry for the parent variable product
        logger.info(`product-sync: skipped parent variable product`, {
          shopId,
          parentId: enrichedProduct.id,
          variationsCount: variations.length,
        });
      } else {
        // Process simple products normally
        await processProduct(transformWooProduct(enrichedProduct, shop.shopCurrency || 'USD'), shop, shopId, autoFillService);
      }
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });

    // Automatically discover meta_data fields after sync completes
    logger.info('product-sync: triggering field discovery', { shopId });
    try {
      const discoveryResult = await FieldDiscoveryService.discoverFields(shopId);
      logger.info('product-sync: field discovery completed', {
        shopId,
        discovered: discoveryResult.discovered.length,
        saved: discoveryResult.saved,
        skipped: discoveryResult.skipped,
        errors: discoveryResult.errors.length,
      });
    } catch (discoveryErr) {
      logger.error('product-sync: field discovery failed (non-fatal)', {
        shopId,
        error: discoveryErr instanceof Error ? discoveryErr : new Error(String(discoveryErr)),
      });
      // Don't fail the sync if field discovery fails
    }
  } catch (err) {
    logger.error(`product-sync failed for shop ${shopId}`, { error: err instanceof Error ? err : new Error(String(err)) });
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
