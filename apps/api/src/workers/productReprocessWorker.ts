import { Job } from 'bullmq';
import { logger } from '../lib/logger';
import { reprocessAllProducts } from '../services/productReprocessService';
import { prisma } from '../lib/prisma';

/**
 * Product Reprocess Worker
 *
 * Reprocesses all products for a shop without fetching from WooCommerce.
 * Uses stored wooRawJson and re-runs AutoFillService + validation.
 *
 * Triggered when:
 * - Field mappings are updated
 * - Shop settings change (sellerName, returnPolicy, etc.)
 */
export async function productReprocessProcessor(job: Job) {
  const { shopId, reason } = job.data as { shopId: string; reason?: string };

  if (!shopId) {
    logger.warn('product-reprocess: missing shopId', { jobId: job.id });
    return;
  }

  logger.info('product-reprocess: starting', { shopId, reason, jobId: job.id });

  try {
    const productCount = await reprocessAllProducts(shopId);

    logger.info('product-reprocess: completed', {
      shopId,
      reason,
      productCount,
      jobId: job.id,
    });

    return { shopId, productCount };
  } catch (err) {
    logger.error('product-reprocess: failed', {
      shopId,
      reason,
      error: err instanceof Error ? err : new Error(String(err)),
      jobId: job.id,
    });
    throw err;
  }
}
