import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { generateFeedPayload } from '../services/feedService';
import { logger } from '../lib/logger';
import { uploadJsonToStorage } from '../services/storage';
import { getParentProductIds } from '../services/productService';

export async function feedGenerationProcessor(job: Job) {
  const { shopId } = job.data as { shopId: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  const parentIds = await getParentProductIds(shopId);

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
    logger.error(`feed-generation failed for shop ${shopId}`, { error: err instanceof Error ? err : new Error(String(err)) });
    // Mark feed as failed so the status reflects the feed generation failure
    await prisma.shop.update({
      where: { id: shopId },
      data: { feedStatus: 'FAILED' },
    });
    throw err;
  }
}
