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
      enableCheckout: product.feedEnableCheckout,
    },
    overrides
  );

  // Validate the auto-filled data
  const validation = validateProduct(autoFilled, product.feedEnableCheckout);

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
 * @returns Number of products that were updated
 */
export async function clearOverridesForField(
  shopId: string,
  attribute: string
): Promise<number> {
  // Find all products that have overrides for this field
  const products = await prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      productFieldOverrides: true,
    },
  });

  let updatedCount = 0;

  for (const product of products) {
    const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

    if (overrides[attribute]) {
      // Remove this field's override
      delete overrides[attribute];

      await prisma.product.update({
        where: { id: product.id },
        data: {
          productFieldOverrides: overrides as any,
        },
      });

      // Reprocess the product with updated overrides
      await reprocessProduct(product.id);
      updatedCount++;
    }
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
 */
export async function reprocessAllProducts(shopId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { id: true },
  });

  for (const product of products) {
    await reprocessProduct(product.id);
  }

  logger.info('Reprocessed all products for shop', {
    shopId,
    productCount: products.length,
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
