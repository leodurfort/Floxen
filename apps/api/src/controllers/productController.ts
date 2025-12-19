import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductStatus, SyncStatus } from '@prisma/client';
import {
  ProductFieldOverrides,
  ProductFieldOverride,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  validateStaticValue,
} from '@productsynch/shared';
import { getProduct as getProductRecord, listProducts as listProductsForShop, updateProduct as updateProductRecord } from '../services/productService';
import { syncQueue } from '../jobs';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { reprocessProduct } from '../services/productReprocessService';

const updateProductSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  syncStatus: z.nativeEnum(SyncStatus).optional(),
  manualTitle: z.string().optional(),
  manualDescription: z.string().optional(),
  feedEnableSearch: z.boolean().optional(),
  feedEnableCheckout: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(['enable_search', 'disable_search', 'sync']).default('sync'),
  productIds: z.array(z.string()).min(1),
});

export function listProducts(req: Request, res: Response) {
  const { id } = req.params;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  listProductsForShop(id, page, limit)
    .then((result) => {
      logger.info('Products list retrieved successfully', {
        shopId: id,
        page,
        limit,
        count: result.products.length,
        total: result.pagination.total
      });
      res.json(result);
    })
    .catch((err) => {
      logger.error('Failed to list products', {
        error: err,
        shopId: id,
        page,
        limit,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function getProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  getProductRecord(id, pid)
    .then((product) => {
      if (!product) {
        logger.warn('Product not found', { shopId: id, productId: pid });
        return res.status(404).json({ error: 'Product not found' });
      }
      logger.info('Product retrieved successfully', {
        shopId: id,
        productId: pid,
        status: product.status
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to get product', {
        error: err,
        shopId: id,
        productId: pid,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function updateProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateProductSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('Invalid product update request', {
      shopId: id,
      productId: pid,
      validationErrors: parse.error.flatten(),
      requestBody: req.body,
    });
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateProductRecord(id, pid, parse.data)
    .then((product) => {
      if (!product) {
        logger.warn('Product not found for update', { shopId: id, productId: pid });
        return res.status(404).json({ error: 'Product not found' });
      }
      logger.info('Product updated successfully', {
        shopId: id,
        productId: pid,
        updatedFields: Object.keys(parse.data),
        userId: (req as any).user?.id,
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to update product', {
        error: err,
        shopId: id,
        productId: pid,
        updateData: parse.data,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function bulkAction(req: Request, res: Response) {
  const parse = bulkActionSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('products:bulk invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const { action, productIds } = parse.data;
  Promise.all(
    productIds.map(async (pid) => {
      const updated = await updateProductRecord(req.params.id, pid, {
        feedEnableSearch: action === 'enable_search' ? true : action === 'disable_search' ? false : undefined,
        syncStatus: action === 'sync' ? 'PENDING' : undefined,
      });
      if (action === 'sync' && updated) {
        syncQueue?.queue.add('product-sync', { shopId: req.params.id, productId: pid }, { removeOnComplete: true });
      }
      return { id: pid, updated: Boolean(updated) };
    }),
  )
    .then((results) => {
      logger.info('products:bulk', { shopId: req.params.id, action, count: results.length });
      res.json({ action, results });
    })
    .catch((err) => {
      logger.error('products:bulk error', err);
      res.status(500).json({ error: err.message });
    });
}

/**
 * Get product WooCommerce raw data for field mapping preview
 */
export async function getProductWooData(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  try {
    // Fetch product with WooCommerce raw JSON
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { wooRawJson: true },
    });

    if (!product) {
      logger.warn('Product WooCommerce data fetched successfully', { shopId, productId, wooProductId: (product as any)?.wooProductId });
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch shop data for units and currency
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopCurrency: true,
        dimensionUnit: true,
        weightUnit: true,
        sellerName: true,
        sellerUrl: true,
        sellerPrivacyPolicy: true,
        sellerTos: true,
        returnPolicy: true,
        returnWindow: true,
      },
    });

    logger.info('Product WooCommerce data fetched successfully', {
      shopId,
      productId,
      wooProductId: (product.wooRawJson as any)?.id,
    });

    logger.info('Sending shop data in response', {
      shopId,
      productId,
      shopData: shop,
      hasSellerName: !!shop?.sellerName,
      hasSellerUrl: !!shop?.sellerUrl,
    });

    res.json({
      wooData: product.wooRawJson,
      shopData: shop,
    });
  } catch (err) {
    logger.error('Failed to get product WooCommerce data', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch product data' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT FIELD OVERRIDE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const productOverrideSchema = z.object({
  type: z.enum(['mapping', 'static']),
  value: z.string(),
});

const updateOverridesSchema = z.object({
  overrides: z.record(z.string(), productOverrideSchema),
});

/**
 * GET /shops/:shopId/products/:productId/field-overrides
 * Get product field overrides along with resolved values
 */
export async function getProductFieldOverrides(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: {
        id: true,
        wooTitle: true,
        productFieldOverrides: true,
        openaiAutoFilled: true,
        feedEnableSearch: true,
        feedEnableCheckout: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get shop-level mappings for reference
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    const shopMappings: Record<string, string | null> = {};
    for (const mapping of fieldMappings) {
      shopMappings[mapping.openaiField.attribute] = mapping.wooField?.value || null;
    }

    const productOverrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

    logger.info('Product field overrides retrieved', {
      shopId,
      productId,
      overrideCount: Object.keys(productOverrides).length,
    });

    res.json({
      productId: product.id,
      productTitle: product.wooTitle,
      overrides: productOverrides,
      shopMappings,
      resolvedValues: product.openaiAutoFilled || {},
      feedEnableSearch: product.feedEnableSearch,
      feedEnableCheckout: product.feedEnableCheckout,
    });
  } catch (err) {
    logger.error('Failed to get product field overrides', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to fetch field overrides' });
  }
}

/**
 * PUT /shops/:shopId/products/:productId/field-overrides
 * Update product field overrides
 */
export async function updateProductFieldOverrides(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  const parse = updateOverridesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { overrides } = parse.data;

  try {
    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate each override
    const validationErrors: Record<string, string> = {};

    for (const [attribute, override] of Object.entries(overrides)) {
      const isLockedField = LOCKED_FIELD_SET.has(attribute);
      const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(attribute);

      // Check if field allows this type of override
      if (override.type === 'mapping' && isLockedField) {
        validationErrors[attribute] = 'Custom mapping not allowed for locked fields';
        continue;
      }

      if (override.type === 'static' && isLockedField && !allowsStaticOverride) {
        validationErrors[attribute] = 'Static value not allowed for this locked field';
        continue;
      }

      // Validate static values
      if (override.type === 'static') {
        const validation = validateStaticValue(attribute, override.value);
        if (!validation.isValid) {
          validationErrors[attribute] = validation.error || 'Invalid value';
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors,
      });
    }

    // Update product overrides
    await prisma.product.update({
      where: { id: productId },
      data: {
        productFieldOverrides: overrides,
      },
    });

    // Reprocess product to update openaiAutoFilled
    await reprocessProduct(productId);

    // Fetch updated product
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        productFieldOverrides: true,
        openaiAutoFilled: true,
        isValid: true,
        validationErrors: true,
      },
    });

    logger.info('Product field overrides updated', {
      shopId,
      productId,
      overrideCount: Object.keys(overrides).length,
    });

    res.json({
      success: true,
      overrides: updatedProduct?.productFieldOverrides || {},
      resolvedValues: updatedProduct?.openaiAutoFilled || {},
      isValid: updatedProduct?.isValid,
      validationErrors: updatedProduct?.validationErrors,
    });
  } catch (err) {
    logger.error('Failed to update product field overrides', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to update field overrides' });
  }
}

/**
 * DELETE /shops/:shopId/products/:productId/field-overrides/:attribute
 * Reset a single field to shop default
 */
export async function deleteProductFieldOverride(req: Request, res: Response) {
  const { id: shopId, pid: productId, attribute } = req.params;

  try {
    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: {
        id: true,
        productFieldOverrides: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

    if (!overrides[attribute]) {
      return res.status(404).json({ error: 'No override found for this field' });
    }

    // Remove the override
    delete overrides[attribute];

    await prisma.product.update({
      where: { id: productId },
      data: {
        productFieldOverrides: overrides as any,
      },
    });

    // Reprocess product
    await reprocessProduct(productId);

    // Fetch updated product
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        productFieldOverrides: true,
        openaiAutoFilled: true,
      },
    });

    logger.info('Product field override deleted', {
      shopId,
      productId,
      attribute,
    });

    res.json({
      success: true,
      overrides: updatedProduct?.productFieldOverrides || {},
      resolvedValues: updatedProduct?.openaiAutoFilled || {},
    });
  } catch (err) {
    logger.error('Failed to delete product field override', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
      attribute,
    });
    res.status(500).json({ error: 'Failed to delete field override' });
  }
}

