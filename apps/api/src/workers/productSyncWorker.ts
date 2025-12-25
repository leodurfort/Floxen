import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchStoreCurrency, fetchProductVariations, fetchStoreSettings, fetchAllCategories, enrichProductCategories, fetchSingleProduct } from '../services/wooClient';
import { transformWooProduct, mergeParentAndVariation } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { validateProduct, ProductFieldOverrides } from '@productsynch/shared';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { Shop } from '@prisma/client';

interface SyncJobData {
  shopId: string;
  productId?: string;
  parentId?: string;  // For variation webhooks: the parent product's WooCommerce ID
  type?: 'FULL' | 'INCREMENTAL';
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
  const validation = validateProduct(
    openaiAutoFilled,
    false
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
        mergeParentAndVariation(enrichedProduct, variation, shop.shopCurrency || 'USD'),
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
      transformWooProduct(enrichedProduct, shop.shopCurrency || 'USD'),
      shop,
      shopId,
      autoFillService
    );
  }
}

/**
 * Incremental sync - fetch and process a single product
 *
 * For variations: WooCommerce variations live at /products/{parent}/variations/{id},
 * NOT at /products/{id}. So when syncing a variation, we detect this and sync the
 * parent product instead (which fetches all its variations).
 */
async function runIncrementalSync(
  shop: Shop,
  shopId: string,
  productId: string,
  parentIdHint: string | undefined,
  client: any
) {
  logger.info('product-sync: running incremental sync', { shopId, productId, parentIdHint });

  const wooProductId = parseInt(productId, 10);
  if (isNaN(wooProductId)) {
    logger.error('product-sync: invalid productId for incremental sync', { shopId, productId });
    return;
  }

  // Determine the actual product ID to fetch:
  // 1. If parentIdHint is provided (from webhook), this is a variation - sync the parent
  // 2. If the product exists in our DB with a wooParentId, it's a known variation - sync the parent
  // 3. Otherwise, sync the product directly
  let targetProductId = wooProductId;
  let isVariationSync = false;

  if (parentIdHint) {
    // Webhook provided parent ID - this is a variation
    const parentWooId = parseInt(parentIdHint, 10);
    if (!isNaN(parentWooId)) {
      logger.info('product-sync: variation detected via webhook parentId, syncing parent instead', {
        shopId,
        variationId: wooProductId,
        parentId: parentWooId,
      });
      targetProductId = parentWooId;
      isVariationSync = true;
    }
  } else {
    // Check if this product exists in our DB as a variation
    const existingProduct = await prisma.product.findUnique({
      where: { shopId_wooProductId: { shopId, wooProductId } },
      select: { wooParentId: true },
    });

    if (existingProduct?.wooParentId) {
      logger.info('product-sync: variation detected via DB lookup, syncing parent instead', {
        shopId,
        variationId: wooProductId,
        parentId: existingProduct.wooParentId,
      });
      targetProductId = existingProduct.wooParentId;
      isVariationSync = true;
    }
  }

  const wooProd = await fetchSingleProduct(client, targetProductId);
  if (!wooProd) {
    // If we were trying to sync a variation's parent and it failed,
    // the parent product might have been deleted
    if (isVariationSync) {
      logger.warn('product-sync: parent product not found in WooCommerce (variation orphaned?)', {
        shopId,
        originalProductId: wooProductId,
        parentProductId: targetProductId,
      });
    } else {
      logger.warn('product-sync: product not found in WooCommerce', { shopId, productId: String(targetProductId) });
    }
    return;
  }

  // Fetch categories for enrichment
  const categoryMap = await fetchAllCategories(client);
  const autoFillService = await AutoFillService.create(shop);

  await processSingleWooProduct(wooProd, shop, shopId, autoFillService, client, categoryMap);

  logger.info('product-sync: incremental sync completed', {
    shopId,
    productId: String(targetProductId),
    wasVariationSync: isVariationSync,
    originalVariationId: isVariationSync ? String(wooProductId) : undefined,
  });
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
  const { shopId, productId, parentId, type, triggeredBy } = job.data as SyncJobData;
  const isIncremental = productId && type === 'INCREMENTAL';

  logger.info(`product-sync job received`, {
    shopId,
    productId,
    parentId,
    type: type || 'FULL',
    triggeredBy,
    isIncremental,
  });

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

    // Only refresh shop settings on full sync (not needed for single product updates)
    if (!isIncremental) {
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
    }

    // Run incremental or full sync
    if (isIncremental) {
      await runIncrementalSync(shop, shopId, productId, parentId, client);
    } else {
      await runFullSync(shop, shopId, client);
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
  } catch (err) {
    logger.error(`product-sync failed for shop ${shopId}`, {
      error: err instanceof Error ? err : new Error(String(err)),
      isIncremental,
      productId,
    });
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
