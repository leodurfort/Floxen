import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SyncStatus } from '@prisma/client';
import { syncQueue, isQueueAvailable, DEFAULT_JOB_OPTIONS, JOB_PRIORITIES } from '../lib/redis';
import { logger } from '../lib/logger';
import { generateFeedPayload } from '../services/feedService';
import { getUserId } from '../utils/request';
import {
  buildFeedEligibilityWhere,
  getParentProductIds,
  FEED_ELIGIBILITY_SELECT,
} from '../lib/feedEligibility';

export async function triggerSync(req: Request, res: Response) {
  if (!isQueueAvailable()) {
    logger.error('sync:trigger failed - Redis unavailable', { shopId: req.params.id });
    return res.status(503).json({
      error: 'Sync service unavailable',
      details: 'Redis queue not configured. Please set REDIS_URL environment variable.',
    });
  }

  try {
    // Check if shop exists and needs product reselection
    const existingShop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      select: { id: true, needsProductReselection: true },
    });

    if (!existingShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Block sync if shop needs product reselection (downgrade scenario)
    if (existingShop.needsProductReselection) {
      logger.warn('sync:trigger blocked - shop needs product reselection', { shopId: req.params.id });
      return res.status(400).json({
        error: 'Product reselection required',
        code: 'NEEDS_RESELECTION',
        details: 'Please update your product selection to match your current plan limits.',
      });
    }

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
    return res.status(500).json({ error: 'Failed to trigger sync' });
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
  const download = req.query.download === 'true';
  const limit = download ? undefined : Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = download ? undefined : parseInt(req.query.offset as string) || 0;

  try {
    const userId = getUserId(req);

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get parent product IDs to exclude (same as feed generation)
    const parentIds = await getParentProductIds(prisma, shopId);

    // Fetch feed-eligible products using centralized criteria
    // This ensures preview matches actual feed generation
    const products = await prisma.product.findMany({
      where: buildFeedEligibilityWhere(shopId, parentIds),
      select: FEED_ELIGIBILITY_SELECT,
      skip: offset,
      take: limit ? limit + 1 : undefined, // Fetch one extra to determine hasMore (only for pagination)
      orderBy: { wooProductId: 'asc' },
    });

    const hasMore = limit ? products.length > limit : false;
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
      download,
    });

    return res.json({
      items: feedPayload.items,
      hasMore,
      offset: offset ?? 0,
      limit: limit ?? feedPayload.items.length,
    });
  } catch (err: any) {
    logger.error('feed:preview error', { shopId, error: err.message });
    return res.status(500).json({ error: 'Failed to generate preview' });
  }
}
