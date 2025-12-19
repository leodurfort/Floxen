import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SyncStatus } from '@prisma/client';
import { syncQueue, isQueueAvailable } from '../lib/redis';
import { logger } from '../lib/logger';

export function triggerSync(req: Request, res: Response) {
  // Check Redis availability FIRST before modifying shop status
  if (!isQueueAvailable()) {
    logger.error('sync:trigger failed - Redis unavailable', { shopId: req.params.id });
    return res.status(503).json({
      error: 'Sync service unavailable',
      details: 'Redis queue not configured. Please set REDIS_URL environment variable.',
    });
  }

  prisma.shop
    .update({
      where: { id: req.params.id },
      data: { syncStatus: SyncStatus.SYNCING },
    })
    .then((shop) => {
      syncQueue!.add('product-sync', { shopId: shop.id }, { removeOnComplete: true, priority: 2 });
      logger.info('sync:trigger', { shopId: shop.id });
      return res.json({ shopId: shop.id, status: 'QUEUED' });
    })
    .catch((err) => {
      logger.error('sync:trigger error', err);
      res.status(404).json({ error: 'Shop not found' });
    });
}

export async function getSyncStatus(req: Request, res: Response) {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const pendingBatches = await prisma.syncBatch.count({
      where: { shopId: shop.id, status: { in: ['PENDING', 'SYNCING'] } },
    });

    logger.info('sync:status', { shopId: shop.id, status: shop.syncStatus });
    return res.json({
      shopId: shop.id,
      status: shop.syncStatus,
      lastSyncAt: shop.lastSyncAt,
      queuedBatches: pendingBatches,
    });
  } catch (err: any) {
    logger.error('sync:status error', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getSyncHistory(req: Request, res: Response) {
  try {
    const history = await prisma.syncBatch.findMany({
      where: { shopId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        syncType: true,
        totalProducts: true,
        syncedProducts: true,
        failedProducts: true,
        startedAt: true,
        completedAt: true,
      },
    });

    logger.info('sync:history', { shopId: req.params.id, count: history.length });
    return res.json({ history });
  } catch (err: any) {
    logger.error('sync:history error', err);
    res.status(500).json({ error: err.message });
  }
}

export function pushFeed(req: Request, res: Response) {
  // Check Redis availability FIRST
  if (!isQueueAvailable()) {
    logger.error('feed:push failed - Redis unavailable', { shopId: req.params.id });
    return res.status(503).json({
      error: 'Feed generation service unavailable',
      details: 'Redis queue not configured. Please set REDIS_URL environment variable.',
    });
  }

  prisma.shop
    .findUnique({ where: { id: req.params.id } })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      syncQueue!.add('feed-generation', { shopId: shop.id }, { removeOnComplete: true });
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
