/**
 * Feed Submission Worker
 *
 * Generates feed payload and saves it to database
 * Each sync replaces the previous feed snapshot (latest version only)
 */

import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { generateFeedPayload } from '../services/feedService';
import { logger } from '../lib/logger';

export async function feedSubmissionProcessor(job: Job) {
  const { shopId } = job.data as { shopId: string };

  if (!shopId) {
    logger.error('feed-submission: No shopId provided');
    return;
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    logger.error('feed-submission: Shop not found', { shopId });
    return;
  }

  try {
    // Get valid products only (ready for OpenAI feed)
    const products = await prisma.product.findMany({
      where: {
        shopId,
        isValid: true,
        feedEnableSearch: true,
      },
    });

    if (products.length === 0) {
      logger.warn('feed-submission: No valid products to submit', { shopId });
      return;
    }

    // Generate complete feed payload
    const feedPayload = generateFeedPayload(shop, products);

    // Save/update feed snapshot in database
    // This will replace the previous snapshot (upsert with unique shopId)
    await prisma.feedSnapshot.upsert({
      where: { shopId },
      create: {
        shopId,
        feedData: feedPayload as any,
        productCount: products.length,
        generatedAt: new Date(),
      },
      update: {
        feedData: feedPayload as any,
        productCount: products.length,
        generatedAt: new Date(),
      },
    });

    logger.info('feed-submission: Feed saved to database', {
      shopId,
      shopName: shop.shopName,
      productCount: products.length,
      feedSize: JSON.stringify(feedPayload).length,
    });

    // Update shop with last feed generation time
    await prisma.shop.update({
      where: { id: shopId },
      data: { lastSyncAt: new Date() },
    });

    return {
      success: true,
      productCount: products.length,
    };
  } catch (err: any) {
    logger.error('feed-submission: Failed to save feed', {
      shopId,
      error: err.message,
      stack: err.stack,
    });
    throw err; // Let BullMQ handle retry
  }
}
