import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { syncQueue } from '../jobs';

// Skip webhook sync if a full sync completed within this window
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify WooCommerce webhook signature
 * WooCommerce signs webhooks using HMAC SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Check if we should skip this webhook due to recent sync activity
 */
function shouldSkipWebhook(shop: { syncStatus: string; lastSyncAt: Date | null }): { skip: boolean; reason?: string } {
  // Skip if a sync is currently in progress
  if (shop.syncStatus === 'SYNCING') {
    return { skip: true, reason: 'sync_in_progress' };
  }

  // Skip if a sync completed within the debounce window
  if (shop.lastSyncAt) {
    const timeSinceLastSync = Date.now() - shop.lastSyncAt.getTime();
    if (timeSinceLastSync < DEBOUNCE_WINDOW_MS) {
      return { skip: true, reason: 'recent_sync' };
    }
  }

  return { skip: false };
}

export async function handleWooWebhook(req: Request, res: Response) {
  const { shopId } = req.params;
  const signature = req.headers['x-wc-webhook-signature'] as string;

  try {
    // Get shop with sync status for debouncing
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, syncStatus: true, lastSyncAt: true },
    });

    if (!shop) {
      logger.warn('Webhook received for non-existent shop', { shopId });
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Note: Webhook signature verification can be added when wooWebhookSecret field is added to schema
    if (signature) {
      logger.debug('Webhook signature received', { shopId, hasSignature: true });
    }

    const event = req.body;

    // Check if we should skip due to debouncing
    const { skip, reason } = shouldSkipWebhook(shop);
    if (skip) {
      logger.info('Webhook skipped (debounced)', {
        shopId,
        productId: event.id,
        reason,
        lastSyncAt: shop.lastSyncAt,
        syncStatus: shop.syncStatus,
      });

      return res.status(202).json({
        shopId,
        receivedAt: new Date().toISOString(),
        queued: false,
        skipped: true,
        reason,
      });
    }

    // Enqueue incremental sync job for the product
    if (event.id && syncQueue) {
      await syncQueue.queue.add(
        'product-sync',
        {
          shopId,
          productId: event.id.toString(),
          type: 'INCREMENTAL',
          triggeredBy: 'webhook',
        },
        { removeOnComplete: true }
      );

      logger.info('Webhook processed and sync queued', {
        shopId,
        productId: event.id,
        event: event.action || 'unknown',
      });
    }

    return res.status(202).json({
      shopId,
      receivedAt: new Date().toISOString(),
      queued: !!event.id,
    });
  } catch (error) {
    logger.error('Failed to process webhook', {
      error: error as Error,
      shopId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
