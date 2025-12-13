import { Request, Response } from 'express';
import { z } from 'zod';
import { mockStore } from '../services/mockStore';

const updateProductSchema = z.object({
  status: z.string().optional(),
  syncStatus: z.string().optional(),
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
  const products = mockStore.getProducts(id);
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const start = (page - 1) * limit;
  const data = products.slice(start, start + limit);

  return res.json({
    products: data,
    pagination: {
      page,
      limit,
      total: products.length,
      totalPages: Math.ceil(products.length / limit),
    },
  });
}

export function getProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  const product = mockStore.getProduct(id, pid);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product });
}

export function updateProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateProductSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const product = mockStore.updateProduct(id, pid, parse.data);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product });
}

export function triggerEnrichment(req: Request, res: Response) {
  const { id, pid } = req.params;
  const product = mockStore.updateProduct(id, pid, {
    aiEnriched: true,
    status: 'PENDING_REVIEW',
    syncStatus: 'PENDING',
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product, message: 'Enrichment queued (stub)' });
}

export function previewFeed(req: Request, res: Response) {
  const { id, pid } = req.params;
  const product = mockStore.getProduct(id, pid);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({
    feed: {
      id: `${id}-${product.wooProductId}`,
      title: product.wooTitle,
      description: product.wooDescription,
      availability: product.syncStatus === 'COMPLETED' ? 'in_stock' : 'preorder',
      price: product.wooPrice ? `${product.wooPrice} USD` : null,
    },
  });
}

export function bulkAction(req: Request, res: Response) {
  const parse = bulkActionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const { action, productIds } = parse.data;
  const results = productIds.map((pid) => {
    const updated = mockStore.updateProduct(req.params.id, pid, {
      feedEnableSearch: action === 'enable_search' ? true : action === 'disable_search' ? false : undefined,
      syncStatus: action === 'sync' ? 'PENDING' : undefined,
    });
    return { id: pid, updated: Boolean(updated) };
  });
  return res.json({ action, results });
}
