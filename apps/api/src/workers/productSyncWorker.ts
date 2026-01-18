import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { wrapNonRetryableError, classifyError } from '../lib/errors';
import { initConcurrency, cleanupConcurrency, getConcurrencyStats } from '../lib/adaptiveConcurrency';
import { createWooClient, fetchAllProducts, fetchSelectedProducts, fetchStoreCurrency, fetchStoreSettings, fetchAllCategories, enrichProductCategories, fetchVariationsParallel } from '../services/wooClient';
import { transformWooProduct, mergeParentAndVariation } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { validateProduct, ProductFieldOverrides } from '@productsynch/shared';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { Shop } from '@prisma/client';
import { isUnlimitedTier, type SubscriptionTier } from '../config/billing';

interface SyncJobData {
  shopId: string;
  triggeredBy?: string;
}

// Refresh shop data every N products to pick up user changes during sync
const SHOP_REFRESH_INTERVAL = 50;

/**
 * Process a single product (simple product or merged variation)
 * @param processAllProducts - If true (PRO tier), sets isSelected=true on all products
 */
async function processProduct(data: any, shop: Shop, shopId: string, autoFillService: AutoFillService, processAllProducts: boolean = false) {
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

  // For variations, look up parent's isSelected to inherit it
  let parentIsSelected: boolean | null = null;
  if (data.wooParentId && !existing?.id) {
    const parent = await prisma.product.findFirst({
      where: { shopId, wooProductId: data.wooParentId },
      select: { isSelected: true },
    });
    parentIsSelected = parent?.isSelected ?? null;
    logger.info('product-sync: new variation inheriting parent selection', {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      parentIsSelected,
    });
  }

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
      // PRO tier auto-selects all; variations inherit parent selection; others false
      isSelected: processAllProducts ? true : existing?.id ? undefined : (parentIsSelected ?? false),
      syncState: 'synced',
      ...data,
    },
    update: {
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      syncState: 'synced',
      // PRO tier ensures products stay selected
      ...(processAllProducts ? { isSelected: true } : {}),
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
 * For variable products, variations should be pre-fetched and passed in variationsMap
 * @param processAllProducts - If true (PRO tier), sets isSelected=true on all products
 */
async function processSingleWooProduct(
  wooProd: any,
  shop: Shop,
  shopId: string,
  autoFillService: AutoFillService,
  categoryMap: Map<number, any>,
  variationsMap: Map<number, any[]>,
  processAllProducts: boolean
) {
  const enrichedProduct = enrichProductCategories(wooProd, categoryMap);
  const isVariable = enrichedProduct.type === 'variable';

  if (isVariable) {
    // Get pre-fetched variations from the map
    const variations = variationsMap.get(enrichedProduct.id) || [];

    logger.info(`product-sync: processing ${variations.length} variations for variable product`, {
      shopId,
      parentId: enrichedProduct.id,
      title: enrichedProduct.name,
    });

    for (const variation of variations) {
      await processProduct(
        mergeParentAndVariation(enrichedProduct, variation),
        shop,
        shopId,
        autoFillService,
        processAllProducts
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
      autoFillService,
      processAllProducts
    );
  }
}

/**
 * Update sync progress in database (0-100)
 */
async function updateSyncProgress(shopId: string, progress: number) {
  await prisma.shop.update({
    where: { id: shopId },
    data: { syncProgress: Math.min(100, Math.max(0, Math.round(progress))) },
  });
}

/**
 * Full sync - fetch and process products
 * Only processes selected products (or all for PRO tier)
 * Uses parallel variation fetching with adaptive concurrency
 */
async function runFullSync(
  shop: Shop,
  shopId: string,
  client: any
) {
  logger.info('product-sync: running full sync', { shopId });

  // Initialize adaptive concurrency tracking for this sync
  initConcurrency(shopId);

  try {
    // Get user's subscription tier to determine if we should process all products
    const user = await prisma.user.findUnique({
      where: { id: shop.userId },
      select: { subscriptionTier: true },
    });
    const tier = (user?.subscriptionTier || 'FREE') as SubscriptionTier;
    const processAllProducts = isUnlimitedTier(tier);

    // Get selected product IDs (wooProductId) if not PRO tier
    let selectedWooProductIds: Set<number> | null = null;
    if (!processAllProducts) {
      const selectedProducts = await prisma.product.findMany({
        where: {
          shopId,
          isSelected: true,
          wooParentId: null, // Only parent products
        },
        select: { wooProductId: true },
      });
      selectedWooProductIds = new Set(selectedProducts.map(p => p.wooProductId));
      logger.info('product-sync: selective sync mode', {
        shopId,
        tier,
        selectedCount: selectedWooProductIds.size,
      });
    } else {
      logger.info('product-sync: PRO tier - processing all products', { shopId, tier });
    }

    // Initialize progress to 0
    await updateSyncProgress(shopId, 0);

    // Fetch products - PRO tier fetches all, others fetch only selected (much faster)
    let products: any[];
    if (processAllProducts) {
      products = await fetchAllProducts(client);
      logger.info(`product-sync: fetched all products from WooCommerce`, { shopId, count: products.length });
    } else {
      // Use selective fetch - only fetch the specific products that are selected
      // This is MUCH faster than fetching all 1000+ products and filtering in memory
      const selectedIds = Array.from(selectedWooProductIds!);
      products = await fetchSelectedProducts(client, selectedIds);
      logger.info(`product-sync: fetched selected products from WooCommerce`, {
        shopId,
        requested: selectedIds.length,
        fetched: products.length,
      });
    }

    const categoryMap = await fetchAllCategories(client);
    logger.info(`product-sync: fetched categories`, { shopId, categoryCount: categoryMap.size });

    // Identify variable products that need variation fetching (only from selected products)
    const variableProducts = products.filter((p: any) => p.type === 'variable');
    logger.info('product-sync: identified variable products', {
      shopId,
      variableCount: variableProducts.length,
      simpleCount: products.length - variableProducts.length,
    });

    // Fetch all variations in parallel with adaptive concurrency
    let variationsMap = new Map<number, any[]>();
    if (variableProducts.length > 0) {
      const startTime = Date.now();
      variationsMap = await fetchVariationsParallel(client, variableProducts, shopId);
      const duration = Date.now() - startTime;

      // Count total variations fetched
      let totalVariations = 0;
      variationsMap.forEach(variations => {
        totalVariations += variations.length;
      });

      const stats = getConcurrencyStats(shopId);
      logger.info('product-sync: parallel variation fetch complete', {
        shopId,
        variableProducts: variableProducts.length,
        totalVariations,
        durationMs: duration,
        avgMsPerParent: variableProducts.length > 0 ? Math.round(duration / variableProducts.length) : 0,
        finalConcurrency: stats?.current,
      });
    }

    const autoFillService = await AutoFillService.create(shop);

    const totalProducts = products.length;
    let processedCount = 0;
    let lastReportedProgress = 0;
    let currentShop = shop;

    for (const wooProd of products) {
      // Periodically refresh shop data to pick up user changes during sync
      // This prevents race condition where user edits profile while sync is running
      if (processedCount > 0 && processedCount % SHOP_REFRESH_INTERVAL === 0) {
        const freshShop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (freshShop) {
          // Check if shop settings changed (user edited profile)
          const settingsChanged =
            freshShop.sellerName !== currentShop.sellerName ||
            freshShop.returnPolicy !== currentShop.returnPolicy ||
            freshShop.returnWindow !== currentShop.returnWindow ||
            freshShop.shopSettingsUpdatedAt?.getTime() !== currentShop.shopSettingsUpdatedAt?.getTime();

          if (settingsChanged) {
            logger.info('product-sync: shop settings changed during sync, refreshing', {
              shopId,
              processedCount,
              oldSellerName: currentShop.sellerName,
              newSellerName: freshShop.sellerName,
              oldReturnPolicy: currentShop.returnPolicy,
              newReturnPolicy: freshShop.returnPolicy,
            });
          }

          currentShop = freshShop;
          autoFillService.refreshShop(freshShop);
        }
      }

      await processSingleWooProduct(wooProd, currentShop, shopId, autoFillService, categoryMap, variationsMap, processAllProducts);
      processedCount++;

      // Update progress every 5% or at least every 10 products
      const currentProgress = totalProducts > 0 ? (processedCount / totalProducts) * 100 : 0;
      if (currentProgress - lastReportedProgress >= 5 || processedCount % 10 === 0) {
        await updateSyncProgress(shopId, currentProgress);
        lastReportedProgress = currentProgress;
      }
    }

    // Update syncState to 'synced' for all processed products
    await prisma.product.updateMany({
      where: {
        shopId,
        isSelected: true,
      },
      data: { syncState: 'synced' },
    });

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

    logger.info('product-sync: sync completed', { shopId, productCount: products.length, tier });
  } finally {
    // Always clean up concurrency tracking
    cleanupConcurrency(shopId);
  }
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
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date(), syncProgress: null },
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
        data: { syncStatus: 'FAILED', syncProgress: null },
      });
    }

    // Wrap error appropriately for BullMQ retry decision
    throw wrapNonRetryableError(err);
  }
}
