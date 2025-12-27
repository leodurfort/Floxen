import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { wrapNonRetryableError, classifyError } from '../lib/errors';
import { createWooClient, fetchAllProducts, fetchStoreCurrency, fetchProductVariations, fetchStoreSettings, fetchAllCategories, enrichProductCategories } from '../services/wooClient';
import { transformWooProduct, mergeParentAndVariation } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { validateProduct, ProductFieldOverrides } from '@productsynch/shared';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { Shop } from '@prisma/client';

interface SyncJobData {
  shopId: string;
  triggeredBy?: string;
}

/**
 * Process a single product (simple product or merged variation)
 */
async function processProduct(data: any, shop: Shop, shopId: string, autoFillService: AutoFillService) {
  const existing = await prisma.product.findUnique({
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
    select: {
      id: true,
      checksum: true,
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
  // enable_checkout is always false (feature not yet available)
  const enableCheckout = false;

  // Get existing product-level field overrides (if any)
  const productOverrides = (existing?.productFieldOverrides as unknown as ProductFieldOverrides) || {};

  // Auto-fill all 70 OpenAI attributes from WooCommerce data (including flags and overrides)
  const openaiAutoFilled = autoFillService.autoFillProduct(
    data.wooRawJson,
    { enableSearch, enableCheckout },
    productOverrides
  );

  // Validate the product with auto-filled values (using shared validation)
  // enable_checkout is always false, so checkout-related validation is skipped
  // Pass product context to properly validate conditional fields like item_group_id
  const validation = validateProduct(
    openaiAutoFilled,
    false,
    {
      isVariation: !!data.wooParentId,
      wooProductType: data.wooRawJson?.type,
    }
  );

  await prisma.product.upsert({
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
    create: {
      shopId,
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      // Apply shop defaults for enable_search, always false for enable_checkout
      feedEnableSearch: shop.defaultEnableSearch,
      feedEnableCheckout: false,
      ...data,
    },
    update: {
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      ...data,
      // DON'T update flag fields on sync - preserve user's product-level settings
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

/**
 * Process a single WooCommerce product (handles both simple and variable products)
 */
async function processSingleWooProduct(
  wooProd: any,
  shop: Shop,
  shopId: string,
  autoFillService: AutoFillService,
  client: any,
  categoryMap: Map<number, any>
) {
  const enrichedProduct = enrichProductCategories(wooProd, categoryMap);
  const isVariable = enrichedProduct.type === 'variable';

  if (isVariable) {
    logger.info(`product-sync: detected variable product, fetching variations`, {
      shopId,
      parentId: enrichedProduct.id,
      title: enrichedProduct.name,
    });

    const variations = await fetchProductVariations(client, enrichedProduct.id);

    logger.info(`product-sync: processing ${variations.length} variations`, {
      shopId,
      parentId: enrichedProduct.id,
    });

    for (const variation of variations) {
      await processProduct(
        mergeParentAndVariation(enrichedProduct, variation),
        shop,
        shopId,
        autoFillService
      );
    }

    logger.info(`product-sync: skipped parent variable product`, {
      shopId,
      parentId: enrichedProduct.id,
      variationsCount: variations.length,
    });
  } else {
    await processProduct(
      transformWooProduct(enrichedProduct),
      shop,
      shopId,
      autoFillService
    );
  }
}

/**
 * Full sync - fetch and process all products
 */
async function runFullSync(
  shop: Shop,
  shopId: string,
  client: any
) {
  logger.info('product-sync: running full sync', { shopId });

  const products = await fetchAllProducts(client);
  logger.info(`product-sync: fetched products`, { shopId, count: products.length });

  const categoryMap = await fetchAllCategories(client);
  logger.info(`product-sync: fetched categories`, { shopId, categoryCount: categoryMap.size });

  const autoFillService = await AutoFillService.create(shop);

  for (const wooProd of products) {
    await processSingleWooProduct(wooProd, shop, shopId, autoFillService, client, categoryMap);
  }

  // Field discovery only on full sync
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
  }

  logger.info('product-sync: full sync completed', { shopId, productCount: products.length });
}

export async function productSyncProcessor(job: Job) {
  const { shopId, triggeredBy } = job.data as SyncJobData;

  logger.info(`product-sync job received`, { shopId, triggeredBy });

  if (!shopId) return;

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  // If no Woo credentials, mark sync complete
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

    // Refresh shop settings from WooCommerce
    logger.info('product-sync: refreshing shop settings from WooCommerce', { shopId });
    const settings = await fetchStoreSettings(client, shop.wooStoreUrl);

    if (settings) {
      const settingsChanged =
        shop.shopCurrency !== settings.shopCurrency ||
        shop.dimensionUnit !== settings.dimensionUnit ||
        shop.weightUnit !== settings.weightUnit;

      const updateData: any = {
        shopCurrency: settings.shopCurrency,
        dimensionUnit: settings.dimensionUnit,
        weightUnit: settings.weightUnit,
        sellerUrl: shop.sellerUrl || shop.wooStoreUrl,
      };

      if (settingsChanged) {
        updateData.shopSettingsUpdatedAt = new Date();
        logger.info('product-sync: shop settings changed, will reprocess products', {
          shopId,
          oldCurrency: shop.shopCurrency,
          newCurrency: settings.shopCurrency,
        });
      }

      await prisma.shop.update({ where: { id: shopId }, data: updateData });

      // Update local shop object
      if (settingsChanged) shop.shopSettingsUpdatedAt = updateData.shopSettingsUpdatedAt;
      shop.shopCurrency = settings.shopCurrency || null;
      shop.dimensionUnit = settings.dimensionUnit || null;
      shop.weightUnit = settings.weightUnit || null;
      if (!shop.sellerUrl) shop.sellerUrl = shop.wooStoreUrl;
    } else {
      logger.warn('product-sync: failed to fetch shop settings, using existing values', { shopId });

      if (!shop.shopCurrency) {
        const currency = await fetchStoreCurrency(client);
        if (currency) {
          await prisma.shop.update({
            where: { id: shopId },
            data: { shopCurrency: currency, shopSettingsUpdatedAt: new Date() },
          });
          shop.shopCurrency = currency;
          shop.shopSettingsUpdatedAt = new Date();
        }
      }
    }

    await runFullSync(shop, shopId, client);

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
  } catch (err) {
    const classification = classifyError(err);

    logger.error(`product-sync failed for shop ${shopId}`, {
      error: err instanceof Error ? err : new Error(String(err)),
      errorClassification: classification,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });

    // Only mark FAILED on last attempt or non-retryable error
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
    if (isLastAttempt || !classification.isRetryable) {
      await prisma.shop.update({
        where: { id: shopId },
        data: { syncStatus: 'FAILED' },
      });
    }

    // Wrap error appropriately for BullMQ retry decision
    throw wrapNonRetryableError(err);
  }
}
