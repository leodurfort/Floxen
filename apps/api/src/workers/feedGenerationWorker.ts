import { Job } from 'bullmq';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { prisma } from '../lib/prisma';
import { generateFeedPayload, toJsonl } from '../services/feedService';
import { logger } from '../lib/logger';
import { uploadGzipToStorage, deleteFromStorage } from '../services/storage';
import { buildFeedEligibilityWhere, getParentProductIds } from '../lib/feedEligibility';

/**
 * Generate a timestamped key for R2 storage
 * Format: {shopId}/feed-{timestamp}.jsonl.gz
 * Example: clv8x9k2p0001n9z9xyz/feed-1705123456789.jsonl.gz
 */
function generateFeedKey(shopId: string): string {
  const timestamp = Date.now();
  return `${shopId}/feed-${timestamp}.jsonl.gz`;
}

/**
 * Extract the R2 key from a feed file URL
 * URL format: {endpoint}/{bucket}/{key}
 */
function extractKeyFromUrl(url: string): string | null {
  // URL format: https://endpoint/bucket/shopId/feed-timestamp.jsonl.gz
  // We need to extract: shopId/feed-timestamp.jsonl.gz
  const match = url.match(/\/([^/]+\/feed-\d+\.jsonl\.gz)$/);
  return match ? match[1] : null;
}

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

  const parentIds = await getParentProductIds(prisma, shopId);

  // Get feed-eligible products using centralized criteria
  // This ensures feed generation uses the same filters as preview and stats
  const products = await prisma.product.findMany({
    where: buildFeedEligibilityWhere(shopId, parentIds),
  });

  const payload = generateFeedPayload(shop, products);
  const jsonl = toJsonl(payload.items);
  const gzipped = await gzipAsync(Buffer.from(jsonl, 'utf-8'));

  try {
    const key = generateFeedKey(shopId);
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

    // PHASE 1: Atomic DB operations - find and delete in single transaction
    // This prevents race conditions where new snapshots could be inserted between find and delete
    const deletedSnapshots = await prisma.$transaction(async (tx) => {
      const oldSnapshots = await tx.feedSnapshot.findMany({
        where: {
          shopId,
          generatedAt: { lt: sevenDaysAgo },
        },
        select: { id: true, feedFileUrl: true },
      });

      if (oldSnapshots.length > 0) {
        await tx.feedSnapshot.deleteMany({
          where: {
            shopId,
            generatedAt: { lt: sevenDaysAgo },
          },
        });
      }

      return oldSnapshots;
    });

    // PHASE 2: External cleanup - delete R2 files (best effort, outside transaction)
    // S3 operations can't be rolled back, so we do them after DB commit
    if (deletedSnapshots.length > 0) {
      let r2Deleted = 0;
      let r2Errors = 0;

      for (const snapshot of deletedSnapshots) {
        if (snapshot.feedFileUrl) {
          const r2Key = extractKeyFromUrl(snapshot.feedFileUrl);
          if (r2Key) {
            const success = await deleteFromStorage(r2Key);
            if (success) {
              r2Deleted++;
            } else {
              r2Errors++;
            }
          }
        }
      }

      if (r2Errors > 0) {
        logger.warn(`feed-cleanup: deleted ${deletedSnapshots.length} DB snapshots, but ${r2Errors} R2 files failed`, {
          shopId,
          dbDeleted: deletedSnapshots.length,
          r2Deleted,
          r2Errors,
        });
      } else {
        logger.info(`Cleaned up ${deletedSnapshots.length} old feed snapshots and R2 files for shop ${shopId}`);
      }
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
