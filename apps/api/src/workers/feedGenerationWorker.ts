import { Job } from 'bullmq';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { prisma } from '../lib/prisma';
import { generateFeedPayload, toJsonl } from '../services/feedService';
import { logger } from '../lib/logger';
import { uploadGzipToStorage } from '../services/storage';
import { getParentProductIds } from '../services/productService';

const gzipAsync = promisify(gzip);

export async function feedGenerationProcessor(job: Job) {
  const { shopId } = job.data as { shopId: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  // Check if shop needs product reselection (downgrade scenario)
  if (shop.needsProductReselection) {
    logger.warn('feed-generation: skipping - shop needs product reselection', { shopId });
    return;
  }

  const parentIds = await getParentProductIds(shopId);

  // Get products excluding parent variable products
  const products = await prisma.product.findMany({
    where: {
      shopId,
      wooProductId: { notIn: parentIds },
    },
  });

  const payload = generateFeedPayload(shop, products);
  const jsonl = toJsonl(payload.items);
  const gzipped = await gzipAsync(Buffer.from(jsonl, 'utf-8'));

  try {
    const key = `${shopId}/feed.jsonl.gz`;
    const url = await uploadGzipToStorage(key, gzipped);

    // Create new FeedSnapshot (keeps history for 7 days)
    await prisma.feedSnapshot.create({
      data: {
        shopId,
        feedData: payload as any,
        feedFileUrl: url,
        productCount: payload.items.length,
        generatedAt: new Date(),
      },
    });

    // Cleanup: Delete snapshots older than 7 days for this shop
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deleted = await prisma.feedSnapshot.deleteMany({
      where: {
        shopId,
        generatedAt: { lt: sevenDaysAgo },
      },
    });

    if (deleted.count > 0) {
      logger.info(`Cleaned up ${deleted.count} old feed snapshots for shop ${shopId}`);
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { feedStatus: 'COMPLETED', lastFeedGeneratedAt: new Date() },
    });
    logger.info(`Generated feed payload for shop ${shopId} (items: ${payload.items.length})`, { url });
    return { url };
  } catch (err) {
    logger.error(`feed-generation failed for shop ${shopId}`, {
      error: err instanceof Error ? err : new Error(String(err)),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });

    // Only mark FAILED on last attempt
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
    if (isLastAttempt) {
      await prisma.shop.update({
        where: { id: shopId },
        data: { feedStatus: 'FAILED' },
      });
    }

    throw err;
  }
}
