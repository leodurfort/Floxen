import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductStatus, SyncStatus } from '@prisma/client';
import { buildFeedPreview, getProduct as getProductRecord, listProducts as listProductsForShop, markEnrichmentQueued, updateProduct as updateProductRecord } from '../services/productService';
import { aiEnrichmentQueue, productSyncQueue } from '../jobs';
import { logger } from '../lib/logger';

const updateProductSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  syncStatus: z.nativeEnum(SyncStatus).optional(),
  manualTitle: z.string().optional(),
  manualDescription: z.string().optional(),
  feedEnableSearch: z.boolean().optional(),
  feedEnableCheckout: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(['enable_search', 'disable_search', 'sync', 'enrich']).default('sync'),
  productIds: z.array(z.string()).min(1),
});

export function listProducts(req: Request, res: Response) {
  const { id } = req.params;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  listProductsForShop(id, page, limit)
    .then((result) => {
      logger.info('products:list', { shopId: id, page, count: result.products.length });
      res.json(result);
    })
    .catch((err) => {
      logger.error('products:list error', err);
      res.status(500).json({ error: err.message });
    });
}

export function getProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  getProductRecord(id, pid)
    .then((product) => {
      if (!product) return res.status(404).json({ error: 'Product not found' });
      logger.info('products:get', { shopId: id, productId: pid });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('products:get error', err);
      res.status(500).json({ error: err.message });
    });
}

export function updateProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateProductSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('products:update invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateProductRecord(id, pid, parse.data)
    .then((product) => {
      if (!product) return res.status(404).json({ error: 'Product not found' });
      logger.info('products:update', { shopId: id, productId: pid });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('products:update error', err);
      res.status(500).json({ error: err.message });
    });
}

export function triggerEnrichment(req: Request, res: Response) {
  const { id, pid } = req.params;
  markEnrichmentQueued(id, pid)
    .then((product) => {
      if (!product) return res.status(404).json({ error: 'Product not found' });
      aiEnrichmentQueue?.queue.add('enrich', { productId: product.id }, { removeOnComplete: true });
      logger.info('products:enrich queued', { shopId: id, productId: pid });
      return res.json({ product, message: 'Enrichment queued (stub)' });
    })
    .catch((err) => {
      logger.error('products:enrich error', err);
      res.status(500).json({ error: err.message });
    });
}

export function previewFeed(req: Request, res: Response) {
  const { id, pid } = req.params;
  getProductRecord(id, pid)
    .then((product) => {
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json({
        feed: buildFeedPreview(product, id),
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
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
      if (action === 'enrich' && updated) {
        aiEnrichmentQueue?.queue.add('enrich', { productId: pid }, { removeOnComplete: true });
      }
      if (action === 'sync' && updated) {
        productSyncQueue?.queue.add('sync', { shopId: req.params.id, productId: pid }, { removeOnComplete: true });
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
