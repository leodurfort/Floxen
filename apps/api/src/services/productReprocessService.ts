/**
 * Product Reprocess Service
 *
 * Handles re-processing products when field mapping overrides change.
 * Updates openaiAutoFilled and validation state.
 */

import { ProductFieldOverrides, validateProduct } from '@productsynch/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AutoFillService } from './autoFillService';

/**
 * Internal type for batch product processing
 */
interface ProductForReprocess {
  id: string;
  wooRawJson: unknown;
  wooParentId: number | null;
  feedEnableSearch: boolean;
  productFieldOverrides: unknown;
}

/**
 * Internal helper: Process a single product with pre-loaded AutoFillService
 * Used by batch operations to avoid N+1 queries on field mappings
 *
 * @returns Product id and validation status, or null if skipped
 */
async function reprocessProductWithService(
  product: ProductForReprocess,
  autoFillService: AutoFillService,
  shopId: string
): Promise<{ id: string; isValid: boolean } | null> {
  const wooProduct = product.wooRawJson;

  if (!wooProduct) {
    logger.warn('Cannot reprocess product without wooRawJson', {
      productId: product.id,
      shopId,
    });
    return null;
  }

  const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

  const autoFilled = autoFillService.autoFillProduct(
    wooProduct,
    {
      enableSearch: product.feedEnableSearch,
      // enable_checkout is always false (feature not yet available)
      enableCheckout: false,
    },
    overrides
  );

  // Validate the auto-filled data
  // enable_checkout is always false, so checkout-related validation is skipped
  // Pass product context to properly validate conditional fields like item_group_id
  const validation = validateProduct(autoFilled, false, {
    isVariation: !!product.wooParentId,
    wooProductType: (wooProduct as any)?.type,
  });

  await prisma.product.update({
    where: { id: product.id },
    data: {
      openaiAutoFilled: autoFilled,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      updatedAt: new Date(),
    },
  });

  logger.info('Product reprocessed', {
    productId: product.id,
    shopId,
    isValid: validation.isValid,
    overrideCount: Object.keys(overrides).length,
  });

  return { id: product.id, isValid: validation.isValid };
}

/**
 * Reprocess a single product with its current overrides
 * Call this when product overrides change
 */
export async function reprocessProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const autoFillService = await AutoFillService.create(product.shop);
  const wooProduct = product.wooRawJson;

  if (!wooProduct) {
    logger.warn('Cannot reprocess product without wooRawJson', { productId });
    return;
  }

  const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

  const autoFilled = autoFillService.autoFillProduct(
    wooProduct,
    {
      enableSearch: product.feedEnableSearch,
      // enable_checkout is always false (feature not yet available)
      enableCheckout: false,
    },
    overrides
  );

  // Validate the auto-filled data
  // enable_checkout is always false, so checkout-related validation is skipped
  // Pass product context to properly validate conditional fields like item_group_id
  const validation = validateProduct(autoFilled, false, {
    isVariation: !!(product as any).wooParentId,
    wooProductType: (wooProduct as any)?.type,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      openaiAutoFilled: autoFilled,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      updatedAt: new Date(),
    },
  });

  logger.info('Product reprocessed', {
    productId,
    shopId: product.shopId,
    isValid: validation.isValid,
    overrideCount: Object.keys(overrides).length,
  });
}

/**
 * Clear overrides for a specific field from ALL products in a shop
 * Call this when shop mapping changes with "apply_all" mode
 *
 * Optimized to batch-fetch products and create AutoFillService once,
 * reducing queries from 4N+1 to 2N+3 for N affected products.
 *
 * @returns Number of products that were updated
 */
export async function clearOverridesForField(
  shopId: string,
  attribute: string
): Promise<number> {
  // 1 query: Fetch shop
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    throw new Error(`Shop not found: ${shopId}`);
  }

  // 1 query: Find all products with fields needed for reprocessing
  const products = await prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      wooRawJson: true,
      wooParentId: true,
      feedEnableSearch: true,
      productFieldOverrides: true,
    },
  });

  // Filter to only products that have this override
  const productsWithOverride = products.filter(product => {
    const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    return !!overrides[attribute];
  });

  if (productsWithOverride.length === 0) {
    logger.info('Cleared field overrides for shop (none found)', {
      shopId,
      attribute,
      productsUpdated: 0,
    });
    return 0;
  }

  // 1 query: Create AutoFillService ONCE (fetches field mappings)
  const autoFillService = await AutoFillService.create(shop);

  let updatedCount = 0;

  for (const product of productsWithOverride) {
    // Clone overrides to avoid mutating the original object
    const originalOverrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    const updatedOverrides = { ...originalOverrides };

    // Remove this field's override
    delete updatedOverrides[attribute];

    // 1 query: Update the override
    await prisma.product.update({
      where: { id: product.id },
      data: {
        productFieldOverrides: updatedOverrides as any,
      },
    });

    // 1 query: Reprocess with pre-loaded service (instead of 3 queries)
    await reprocessProductWithService(
      {
        id: product.id,
        wooRawJson: product.wooRawJson,
        wooParentId: product.wooParentId,
        feedEnableSearch: product.feedEnableSearch,
        productFieldOverrides: updatedOverrides,
      },
      autoFillService,
      shopId
    );
    updatedCount++;
  }

  logger.info('Cleared field overrides for shop', {
    shopId,
    attribute,
    productsUpdated: updatedCount,
  });

  return updatedCount;
}

/**
 * Reprocess all products in a shop
 * Call this after shop-level mapping changes
 *
 * Optimized to batch-fetch products and create AutoFillService once,
 * reducing queries from 3N+2 to N+4 for N products.
 */
export async function reprocessAllProducts(shopId: string): Promise<number> {
  // 1 query: Fetch shop
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    throw new Error(`Shop not found: ${shopId}`);
  }

  // 1 query: Fetch ALL products with fields needed for reprocessing
  const products = await prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      wooRawJson: true,
      wooParentId: true,
      feedEnableSearch: true,
      productFieldOverrides: true,
    },
  });

  if (products.length === 0) {
    logger.info('Reprocessed all products for shop (none found)', {
      shopId,
      productCount: 0,
    });
    return 0;
  }

  // 1 query: Create AutoFillService ONCE (fetches field mappings)
  const autoFillService = await AutoFillService.create(shop);

  // N queries: Update each product sequentially
  let processedCount = 0;
  for (const product of products) {
    const result = await reprocessProductWithService(
      product as ProductForReprocess,
      autoFillService,
      shopId
    );
    if (result) {
      processedCount++;
    }
  }

  // 1 query: Update shop to track when products were last reprocessed
  await prisma.shop.update({
    where: { id: shopId },
    data: { productsReprocessedAt: new Date() },
  });

  logger.info('Reprocessed all products for shop', {
    shopId,
    productCount: products.length,
    processedCount,
    skippedCount: products.length - processedCount,
  });

  return products.length;
}

/**
 * Get count of products with overrides for a specific field
 */
export async function getOverrideCountForField(
  shopId: string,
  attribute: string
): Promise<number> {
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { productFieldOverrides: true },
  });

  return products.filter(p => {
    const overrides = (p.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    return !!overrides[attribute];
  }).length;
}

/**
 * Get override counts for ALL fields in a single query
 * Returns a map of attribute -> count (only includes fields with count > 0)
 */
export async function getOverrideCountsByField(
  shopId: string
): Promise<Record<string, number>> {
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { productFieldOverrides: true },
  });

  const counts: Record<string, number> = {};

  for (const product of products) {
    const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    for (const attribute of Object.keys(overrides)) {
      counts[attribute] = (counts[attribute] || 0) + 1;
    }
  }

  return counts;
}
