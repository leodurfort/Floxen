/**
 * Product Reprocess Service - handles re-processing products when field mapping overrides change.
 */

import { ProductFieldOverrides, validateProduct } from '@productsynch/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AutoFillService } from './autoFillService';

interface ProductForReprocess {
  id: string;
  wooRawJson: unknown;
  wooParentId: number | null;
  feedEnableSearch: boolean;
  productFieldOverrides: unknown;
  openaiAutoFilled?: unknown;  // Optional - only needed for selective reprocessing
}

async function processProduct(
  product: ProductForReprocess,
  autoFillService: AutoFillService,
  shopId: string
): Promise<{ id: string; isValid: boolean } | null> {
  const wooProduct = product.wooRawJson;

  if (!wooProduct) {
    logger.warn('Cannot reprocess product without wooRawJson', { productId: product.id, shopId });
    return null;
  }

  const overrides = (product.productFieldOverrides as ProductFieldOverrides) || {};
  const autoFilled = autoFillService.autoFillProduct(
    wooProduct,
    { enableSearch: product.feedEnableSearch, enableCheckout: false },
    overrides
  );

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

export async function reprocessProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const autoFillService = await AutoFillService.create(product.shop);

  await processProduct(
    {
      id: product.id,
      wooRawJson: product.wooRawJson,
      wooParentId: product.wooParentId,
      feedEnableSearch: product.feedEnableSearch,
      productFieldOverrides: product.productFieldOverrides,
    },
    autoFillService,
    product.shopId
  );
}

export async function clearOverridesForField(shopId: string, attribute: string): Promise<number> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  const products = await fetchProductsForReprocess(shopId);
  const productsWithOverride = products.filter(p => {
    const overrides = (p.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    return !!overrides[attribute];
  });

  if (productsWithOverride.length === 0) {
    logger.info('Cleared field overrides for shop (none found)', { shopId, attribute, productsUpdated: 0 });
    return 0;
  }

  const autoFillService = await AutoFillService.create(shop);
  let updatedCount = 0;

  for (const product of productsWithOverride) {
    const updatedOverrides = { ...((product.productFieldOverrides as unknown as ProductFieldOverrides) || {}) };
    delete updatedOverrides[attribute];

    await prisma.product.update({
      where: { id: product.id },
      data: { productFieldOverrides: updatedOverrides as any },
    });

    await processProduct({ ...product, productFieldOverrides: updatedOverrides }, autoFillService, shopId);
    updatedCount++;
  }

  logger.info('Cleared field overrides for shop', { shopId, attribute, productsUpdated: updatedCount });
  return updatedCount;
}

interface ReprocessResult {
  productCount: number;
  overridesCleared: number;
}

export async function reprocessAllProducts(
  shopId: string,
  fieldsToClclearOverrides?: string[]
): Promise<ReprocessResult> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  let products = await fetchProductsForReprocess(shopId);

  if (products.length === 0) {
    logger.info('Reprocessed all products for shop (none found)', { shopId, productCount: 0 });
    return { productCount: 0, overridesCleared: 0 };
  }

  let overridesCleared = 0;
  const fieldsToClear = fieldsToClclearOverrides || [];

  // BATCH clear overrides in one transaction (if needed)
  if (fieldsToClear.length > 0) {
    overridesCleared = await batchClearOverrides(shopId, fieldsToClear, products);
    // Refetch products with updated overrides for correct reprocessing
    products = await fetchProductsForReprocess(shopId);
  }

  const autoFillService = await AutoFillService.create(shop);
  let processedCount = 0;

  // Single pass: reprocess all products
  for (const product of products) {
    const result = await processProduct(product as ProductForReprocess, autoFillService, shopId);
    if (result) processedCount++;
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: { productsReprocessedAt: new Date() },
  });

  logger.info('Reprocessed all products for shop', {
    shopId,
    productCount: products.length,
    processedCount,
    skippedCount: products.length - processedCount,
    overridesCleared,
    fieldsCleared: fieldsToClear,
  });

  return { productCount: products.length, overridesCleared };
}

const SELECTIVE_BATCH_SIZE = 150;

interface SelectiveReprocessResult extends ReprocessResult {
  fieldsUpdated: string[];
}

/**
 * Reprocess only changed fields for all products (optimized path).
 * Falls back to full reprocessing if changedFields is empty.
 *
 * Performance: ~10-30 seconds for 15k products vs ~3 minutes for full reprocess.
 */
export async function reprocessChangedFields(
  shopId: string,
  changedFields: string[],
  fieldsToClclearOverrides?: string[]
): Promise<SelectiveReprocessResult> {
  // Fallback: if no specific fields, do full reprocess
  if (!changedFields || changedFields.length === 0) {
    const result = await reprocessAllProducts(shopId, fieldsToClclearOverrides);
    return { ...result, fieldsUpdated: [] };
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  // Fetch products WITH openaiAutoFilled for selective update
  let products = await fetchProductsForSelectiveReprocess(shopId);
  if (products.length === 0) {
    logger.info('product-reprocess: selective - no products found', { shopId });
    return { productCount: 0, overridesCleared: 0, fieldsUpdated: changedFields };
  }

  // Clear overrides first (existing logic)
  let overridesCleared = 0;
  const fieldsToClear = fieldsToClclearOverrides || [];
  if (fieldsToClear.length > 0) {
    overridesCleared = await batchClearOverrides(shopId, fieldsToClear, products);
    // Refetch with updated overrides
    products = await fetchProductsForSelectiveReprocess(shopId);
  }

  const autoFillService = await AutoFillService.create(shop);

  // Process in batches for better performance and memory usage
  let processedCount = 0;
  for (let i = 0; i < products.length; i += SELECTIVE_BATCH_SIZE) {
    const batch = products.slice(i, i + SELECTIVE_BATCH_SIZE);
    const batchProcessed = await processSelectiveBatch(batch, autoFillService, shopId, changedFields);
    processedCount += batchProcessed;

    logger.debug('product-reprocess: selective batch completed', {
      shopId,
      batchStart: i,
      batchEnd: Math.min(i + SELECTIVE_BATCH_SIZE, products.length),
      batchProcessed,
      totalProducts: products.length,
    });
  }

  // Update timestamp to signal completion to frontend polling
  await prisma.shop.update({
    where: { id: shopId },
    data: { productsReprocessedAt: new Date() },
  });

  logger.info('product-reprocess: selective completed', {
    shopId,
    productCount: products.length,
    processedCount,
    fieldsUpdated: changedFields,
    overridesCleared,
  });

  return { productCount: products.length, overridesCleared, fieldsUpdated: changedFields };
}

/**
 * Process a batch of products with selective field updates.
 * Uses transaction for atomicity.
 */
async function processSelectiveBatch(
  products: ProductForReprocess[],
  autoFillService: AutoFillService,
  shopId: string,
  changedFields: string[]
): Promise<number> {
  const updates: Array<{
    id: string;
    openaiAutoFilled: any;
    isValid: boolean;
    validationErrors: any;
  }> = [];

  for (const product of products) {
    const wooProduct = product.wooRawJson;
    if (!wooProduct) continue;

    const overrides = (product.productFieldOverrides as ProductFieldOverrides) || {};

    // Compute only changed fields (not all 71)
    const newValues = autoFillService.computeSelectedFields(
      changedFields,
      wooProduct,
      { enableSearch: product.feedEnableSearch, enableCheckout: false },
      overrides
    );

    // Get existing openaiAutoFilled (fetched with product)
    const existing = (product.openaiAutoFilled as Record<string, any>) || {};

    // Merge: new values override existing, null/undefined removes field
    const merged = { ...existing };
    for (const [key, value] of Object.entries(newValues)) {
      if (value === null || value === undefined) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    // Re-validate full product (validation may have cross-field dependencies)
    const validation = validateProduct(merged, false, {
      isVariation: !!product.wooParentId,
      wooProductType: (wooProduct as any)?.type,
    });

    updates.push({
      id: product.id,
      openaiAutoFilled: merged,
      isValid: validation.isValid,
      validationErrors: validation.errors,
    });
  }

  // Batch update using transaction for atomicity
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map(({ id, openaiAutoFilled, isValid, validationErrors }) =>
        prisma.product.update({
          where: { id },
          data: {
            openaiAutoFilled,
            isValid,
            validationErrors,
            updatedAt: new Date(),
          },
        })
      )
    );
  }

  return updates.length;
}

/**
 * Fetch products for selective reprocessing (includes openaiAutoFilled).
 */
async function fetchProductsForSelectiveReprocess(shopId: string): Promise<ProductForReprocess[]> {
  return prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      wooRawJson: true,
      wooParentId: true,
      feedEnableSearch: true,
      productFieldOverrides: true,
      openaiAutoFilled: true,  // Need this for merging
    },
  });
}

/**
 * Batch clear overrides for specified fields using a database transaction.
 * Returns count of products that had overrides cleared.
 */
async function batchClearOverrides(
  shopId: string,
  fieldsToClear: string[],
  products: Array<{ id: string; productFieldOverrides: unknown }>
): Promise<number> {
  // Build batch updates for products that have any of the fields to clear
  const updates: Array<{ id: string; newOverrides: ProductFieldOverrides }> = [];

  for (const product of products) {
    const overrides = (product.productFieldOverrides as ProductFieldOverrides) || {};
    const hasFieldsToClear = fieldsToClear.some(field => field in overrides);

    if (hasFieldsToClear) {
      const newOverrides = { ...overrides };
      for (const field of fieldsToClear) {
        delete newOverrides[field];
      }
      updates.push({ id: product.id, newOverrides });
    }
  }

  if (updates.length === 0) {
    logger.info('Batch clear overrides: none to clear', { shopId, fieldsToClear });
    return 0;
  }

  // Execute batch update using transaction for atomicity
  await prisma.$transaction(
    updates.map(({ id, newOverrides }) =>
      prisma.product.update({
        where: { id },
        data: { productFieldOverrides: newOverrides as any },
      })
    )
  );

  logger.info('Batch cleared overrides', {
    shopId,
    fieldsToClear,
    productsUpdated: updates.length,
  });

  return updates.length;
}

async function fetchProductsForReprocess(shopId: string) {
  return prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      wooRawJson: true,
      wooParentId: true,
      feedEnableSearch: true,
      productFieldOverrides: true,
    },
  });
}

export async function getOverrideCountForField(shopId: string, attribute: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { productFieldOverrides: true },
  });

  return products.filter(p => {
    const overrides = (p.productFieldOverrides as unknown as ProductFieldOverrides) || {};
    return !!overrides[attribute];
  }).length;
}

export async function getOverrideCountsByField(shopId: string): Promise<Record<string, number>> {
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
