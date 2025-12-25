import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { generateFeedPayload } from '../services/feedService';
import { logger } from '../lib/logger';
import { uploadJsonToStorage } from '../services/storage';

export async function feedGenerationProcessor(job: Job) {
  const { shopId } = job.data as { shopId: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  // Get all product IDs that are used as parent IDs (exclude these parent variable products)
  const parentProductIds = await prisma.product.findMany({
    where: {
      shopId,
      wooParentId: { not: null },
    },
    select: { wooParentId: true },
    distinct: ['wooParentId'],
  });

  const parentIds = parentProductIds.map(p => p.wooParentId).filter((id): id is number => id !== null);

  // Get products excluding parent variable products
  const products = await prisma.product.findMany({
    where: {
      shopId,
      wooProductId: { notIn: parentIds },
    },
  });

  const payload = generateFeedPayload(shop, products);
  const body = JSON.stringify(payload, null, 2);

  try {
    const key = `${shopId}/feed.json`;
    const url = await uploadJsonToStorage(key, body);

    // Create SyncBatch record for history tracking
    await prisma.syncBatch.create({
      data: {
        shopId,
        status: 'COMPLETED',
        syncType: 'FULL',
        totalProducts: products.length,
        syncedProducts: products.length,
        failedProducts: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        feedFileUrl: url,
        triggeredBy: job.data?.triggeredBy || 'manual',
      },
    });

    // Upsert FeedSnapshot for the public feed endpoint
    await prisma.feedSnapshot.upsert({
      where: { shopId },
      update: {
        feedData: payload,
        productCount: payload.items.length,
        generatedAt: new Date(),
      },
      create: {
        shopId,
        feedData: payload,
        productCount: payload.items.length,
        generatedAt: new Date(),
      },
    });

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
    logger.info(`Generated feed payload for shop ${shopId} (items: ${payload.items.length})`, { url });
    return { url };
  } catch (err) {
    logger.error(`feed-generation failed for shop ${shopId}`, { error: err instanceof Error ? err : new Error(String(err)) });
    throw err;
  }
}
