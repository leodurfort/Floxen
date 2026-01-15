import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SyncStatus } from '@prisma/client';
import { syncQueue, isQueueAvailable, DEFAULT_JOB_OPTIONS, JOB_PRIORITIES } from '../lib/redis';
import { logger } from '../lib/logger';
import { generateFeedPayload } from '../services/feedService';
import { getUserId } from '../utils/request';

export async function triggerSync(req: Request, res: Response) {
  if (!isQueueAvailable()) {
    logger.error('sync:trigger failed - Redis unavailable', { shopId: req.params.id });
    return res.status(503).json({
      error: 'Sync service unavailable',
      details: 'Redis queue not configured. Please set REDIS_URL environment variable.',
    });
  }

  try {
    const shop = await prisma.shop.update({
      where: { id: req.params.id },
      data: { syncStatus: SyncStatus.SYNCING },
    });
    syncQueue!.add('product-sync', { shopId: shop.id }, {
      ...DEFAULT_JOB_OPTIONS,
      priority: JOB_PRIORITIES.MANUAL,
    });
    logger.info('sync:trigger', { shopId: shop.id });
    return res.json({ shopId: shop.id, status: 'QUEUED' });
  } catch (err: any) {
    logger.error('sync:trigger error', err);
    return res.status(404).json({ error: 'Shop not found' });
  }
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
  }
}

export async function pushFeed(req: Request, res: Response) {
  if (!isQueueAvailable()) {
    logger.error('feed:push failed - Redis unavailable', { shopId: req.params.id });
    return res.status(503).json({
      error: 'Feed generation service unavailable',
      details: 'Redis queue not configured. Please set REDIS_URL environment variable.',
    });
  }

  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    if (shop.syncStatus === 'SYNCING') {
      logger.warn('feed:push blocked - sync in progress', { shopId: shop.id });
      return res.status(409).json({
        error: 'Sync in progress',
        details: 'Cannot generate feed while product sync is running. Please wait for sync to complete.',
        syncStatus: shop.syncStatus,
        lastSyncAt: shop.lastSyncAt,
      });
    }

    syncQueue!.add('feed-generation', { shopId: shop.id }, {
      ...DEFAULT_JOB_OPTIONS,
      priority: JOB_PRIORITIES.MANUAL,
    });
    logger.info('feed:push', { shopId: shop.id, lastSyncAt: shop.lastSyncAt });
    return res.json({
      shopId: shop.id,
      pushed: true,
      syncStatus: shop.syncStatus,
      lastSyncAt: shop.lastSyncAt,
    });
  } catch (err: any) {
    logger.error('feed:push error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function previewFeed(req: Request, res: Response) {
  const shopId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const userId = getUserId(req);

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Fetch only valid, feed-enabled products with minimal fields
    const products = await prisma.product.findMany({
      where: {
        shopId,
        isValid: true,
        feedEnableSearch: true,
      },
      select: {
        id: true,
        wooProductId: true,
        wooTitle: true,
        wooParentId: true,
        openaiAutoFilled: true,
        isValid: true,
        feedEnableSearch: true,
      },
      skip: offset,
      take: limit + 1, // Fetch one extra to determine hasMore
      orderBy: { wooProductId: 'asc' },
    });

    const hasMore = products.length > limit;
    const productsToReturn = hasMore ? products.slice(0, limit) : products;

    // Generate feed WITHOUT validation for performance
    const feedPayload = generateFeedPayload(shop, productsToReturn as any, {
      validateEntries: false,
      skipInvalidEntries: true,
    });

    logger.info('feed:preview generated', {
      shopId,
      userId,
      offset,
      limit,
      returned: feedPayload.items.length,
      hasMore,
    });

    return res.json({
      items: feedPayload.items,
      hasMore,
      offset,
      limit,
    });
  } catch (err: any) {
    logger.error('feed:preview error', { shopId, error: err.message });
    return res.status(500).json({ error: 'Failed to generate preview' });
  }
}

export async function downloadFeed(req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({ where: { shopId: req.params.id } });
    return res.json({
      generatedAt: new Date().toISOString(),
      count: products.length,
      items: products,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function latestFeed(req: Request, res: Response) {
  try {
    const snapshot = await prisma.feedSnapshot.findFirst({
      where: { shopId: req.params.id, feedFileUrl: { not: null } },
      orderBy: { generatedAt: 'desc' },
    });
    if (!snapshot) return res.status(404).json({ error: 'No feed found' });
    logger.info('feed:latest', { shopId: snapshot.shopId, feedUrl: snapshot.feedFileUrl });
    return res.json({
      feedUrl: snapshot.feedFileUrl,
      generatedAt: snapshot.generatedAt,
      productCount: snapshot.productCount,
    });
  } catch (err: any) {
    logger.error('feed:latest error', err);
    return res.status(500).json({ error: err.message });
  }
}
