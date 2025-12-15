import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SyncStatus } from '@prisma/client';
import { syncQueue } from '../lib/redis';
import { logger } from '../lib/logger';

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
      syncQueue.add('product-sync', { shopId: shop.id, type: req.body?.type || 'FULL' }, { removeOnComplete: true, priority: 2 });
      logger.info('sync:trigger', { shopId: shop.id, type: req.body?.type || 'FULL' });
      return res.json({ shopId: shop.id, status: 'QUEUED', syncType: req.body?.type || 'FULL' });
    })
    .catch((err) => {
      logger.error('sync:trigger error', err);
      res.status(404).json({ error: 'Shop not found' });
    });
}

export function getSyncStatus(req: Request, res: Response) {
  prisma.shop
    .findUnique({ where: { id: req.params.id } })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      logger.info('sync:status', { shopId: shop.id, status: shop.syncStatus });
      return res.json({
        shopId: shop.id,
        status: shop.syncStatus,
        lastSyncAt: shop.lastSyncAt,
        queuedBatches: history.length,
      });
    })
    .catch((err) => {
      logger.error('sync:status error', err);
      res.status(500).json({ error: err.message });
    });
}

export function getSyncHistory(_req: Request, res: Response) {
  return res.json({ history });
}

export function pushFeed(req: Request, res: Response) {
  prisma.shop
    .findUnique({ where: { id: req.params.id } })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      syncQueue.add('feed-generation', { shopId: shop.id }, { removeOnComplete: true });
      logger.info('feed:push', { shopId: shop.id });
      return res.json({ shopId: shop.id, pushed: true });
    })
    .catch((err) => {
      logger.error('feed:push error', err);
      res.status(500).json({ error: err.message });
    });
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

export function latestFeed(req: Request, res: Response) {
  prisma.syncBatch
    .findFirst({
      where: { shopId: req.params.id, feedFileUrl: { not: null } },
      orderBy: { completedAt: 'desc' },
    })
    .then((batch) => {
      if (!batch) return res.status(404).json({ error: 'No feed found' });
      logger.info('feed:latest', { shopId: batch.shopId, feedUrl: batch.feedFileUrl });
      return res.json({
        feedUrl: batch.feedFileUrl,
        completedAt: batch.completedAt,
        totalProducts: batch.totalProducts,
      });
    })
    .catch((err) => {
      logger.error('feed:latest error', err);
      res.status(500).json({ error: err.message });
    });
}
