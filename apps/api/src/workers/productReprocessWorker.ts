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
 * - Field mappings are updated (may include fieldsToClclearOverrides)
 * - Shop settings change (sellerName, returnPolicy, etc.)
 */
export async function productReprocessProcessor(job: Job) {
  const { shopId, reason, fieldsToClclearOverrides } = job.data as {
    shopId: string;
    reason?: string;
    fieldsToClclearOverrides?: string[];
  };

  if (!shopId) {
    logger.warn('product-reprocess: missing shopId', { jobId: job.id });
    return;
  }

  logger.info('product-reprocess: starting', {
    shopId,
    reason,
    fieldsToClclearOverrides,
    jobId: job.id,
  });

  try {
    const result = await reprocessAllProducts(shopId, fieldsToClclearOverrides);

    logger.info('product-reprocess: completed', {
      shopId,
      reason,
      productCount: result.productCount,
      overridesCleared: result.overridesCleared,
      jobId: job.id,
    });

    return { shopId, ...result };
  } catch (err) {
    logger.error('product-reprocess: failed', {
      shopId,
      reason,
      fieldsToClclearOverrides,
      error: err instanceof Error ? err : new Error(String(err)),
      jobId: job.id,
    });
    throw err;
  }
}
