import { Request, Response } from 'express';
import { mockStore } from '../services/mockStore';

const history = [
  {
    id: 'batch_1',
    status: 'COMPLETED',
    syncType: 'FULL',
    totalProducts: 2,
    syncedProducts: 2,
    failedProducts: 0,
    startedAt: new Date(Date.now() - 3600_000).toISOString(),
    completedAt: new Date(Date.now() - 3500_000).toISOString(),
  },
];

export function triggerSync(req: Request, res: Response) {
  const shop = mockStore.getShop(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  mockStore.updateShop(shop.id, { syncStatus: 'SYNCING' });
  return res.json({ shopId: shop.id, status: 'QUEUED', syncType: req.body?.type || 'FULL' });
}

export function getSyncStatus(req: Request, res: Response) {
  const shop = mockStore.getShop(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({
    shopId: shop.id,
    status: shop.syncStatus,
    lastSyncAt: shop.lastSyncAt,
    queuedBatches: history.length,
  });
}

export function getSyncHistory(_req: Request, res: Response) {
  return res.json({ history });
}

export function pushFeed(req: Request, res: Response) {
  const shop = mockStore.getShop(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shopId: shop.id, pushed: true, feedUrl: `https://cdn.productsynch.dev/${shop.id}/feed.json` });
}

export function previewFeed(req: Request, res: Response) {
  const products = mockStore.getProducts(req.params.id);
  return res.json({
    shopId: req.params.id,
    products: products.map((p) => ({
      id: p.id,
      title: p.wooTitle,
      price: p.wooPrice,
    })),
  });
}

export function downloadFeed(req: Request, res: Response) {
  const products = mockStore.getProducts(req.params.id);
  return res.json({
    generatedAt: new Date().toISOString(),
    count: products.length,
    items: products,
  });
}
