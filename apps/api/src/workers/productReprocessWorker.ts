import { Job } from 'bullmq';
import { logger } from '../lib/logger';
import { reprocessAllProducts, reprocessChangedFields } from '../services/productReprocessService';
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
  const { shopId, reason, fieldsToClclearOverrides, changedFields } = job.data as {
    shopId: string;
    reason?: string;
    fieldsToClclearOverrides?: string[];
    changedFields?: string[];  // NEW: fields that actually changed (for selective reprocessing)
  };

  if (!shopId) {
    logger.warn('product-reprocess: missing shopId', { jobId: job.id });
    return;
  }

  const useSelectiveReprocess = changedFields && changedFields.length > 0;

  logger.info('product-reprocess: starting', {
    shopId,
    reason,
    fieldsToClclearOverrides,
    changedFields,
    selective: useSelectiveReprocess,
    jobId: job.id,
  });

  try {
    // Use selective reprocessing if changed fields are provided (optimized path)
    // Otherwise fall back to full reprocessing (backward compatible)
    const result = useSelectiveReprocess
      ? await reprocessChangedFields(shopId, changedFields, fieldsToClclearOverrides)
      : await reprocessAllProducts(shopId, fieldsToClclearOverrides);

    logger.info('product-reprocess: completed', {
      shopId,
      reason,
      productCount: result.productCount,
      overridesCleared: result.overridesCleared,
      selective: useSelectiveReprocess,
      jobId: job.id,
    });

    return { shopId, ...result };
  } catch (err) {
    logger.error('product-reprocess: failed', {
      shopId,
      reason,
      fieldsToClclearOverrides,
      changedFields,
      selective: useSelectiveReprocess,
      error: err instanceof Error ? err : new Error(String(err)),
      jobId: job.id,
    });
    throw err;
  }
}
