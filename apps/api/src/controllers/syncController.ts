import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SyncStatus } from '@prisma/client';
import { productSyncQueue, feedGenerationQueue } from '../jobs';

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
  prisma.shop
    .update({
      where: { id: req.params.id },
      data: { syncStatus: SyncStatus.SYNCING, lastSyncAt: new Date() },
    })
    .then((shop) => {
      productSyncQueue?.queue.add('sync', { shopId: shop.id, type: req.body?.type || 'FULL' }, { removeOnComplete: true });
      return res.json({ shopId: shop.id, status: 'QUEUED', syncType: req.body?.type || 'FULL' });
    })
    .catch(() => res.status(404).json({ error: 'Shop not found' }));
}

export function getSyncStatus(req: Request, res: Response) {
  prisma.shop
    .findUnique({ where: { id: req.params.id } })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({
        shopId: shop.id,
        status: shop.syncStatus,
        lastSyncAt: shop.lastSyncAt,
        queuedBatches: history.length,
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function getSyncHistory(_req: Request, res: Response) {
  return res.json({ history });
}

export function pushFeed(req: Request, res: Response) {
  prisma.shop
    .findUnique({ where: { id: req.params.id } })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      feedGenerationQueue?.queue.add('feed', { shopId: shop.id }, { removeOnComplete: true });
      return res.json({ shopId: shop.id, pushed: true, feedUrl: `https://cdn.productsynch.dev/${shop.id}/feed.json` });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function previewFeed(req: Request, res: Response) {
  prisma.product
    .findMany({ where: { shopId: req.params.id }, take: 50, orderBy: { updatedAt: 'desc' } })
    .then((products) =>
      res.json({
        shopId: req.params.id,
        products: products.map((p) => ({
          id: p.id,
          title: p.wooTitle,
          price: p.wooPrice,
        })),
      }),
    )
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function downloadFeed(req: Request, res: Response) {
  prisma.product
    .findMany({ where: { shopId: req.params.id } })
    .then((products) =>
      res.json({
        generatedAt: new Date().toISOString(),
        count: products.length,
        items: products,
      }),
    )
    .catch((err) => res.status(500).json({ error: err.message }));
}
