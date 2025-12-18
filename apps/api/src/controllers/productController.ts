import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductStatus, SyncStatus } from '@prisma/client';
import { getProduct as getProductRecord, listProducts as listProductsForShop, updateProduct as updateProductRecord } from '../services/productService';
import { productSyncQueue } from '../jobs';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

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
        productSyncQueue?.queue.add('product-sync', { shopId: req.params.id, productId: pid }, { removeOnComplete: true });
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

