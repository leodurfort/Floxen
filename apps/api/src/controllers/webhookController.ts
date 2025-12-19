import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { syncQueue } from '../jobs';

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

export async function handleWooWebhook(req: Request, res: Response) {
  const { shopId } = req.params;
  const signature = req.headers['x-wc-webhook-signature'] as string;
  const webhookBody = JSON.stringify(req.body);

  try {
    // Get shop to verify it exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      logger.warn('Webhook received for non-existent shop', { shopId });
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Note: Webhook signature verification can be added when wooWebhookSecret field is added to schema
    if (signature) {
      logger.debug('Webhook signature received', { shopId, hasSignature: true });
    }

    // Enqueue sync job for the product
    const event = req.body;
    if (event.id && syncQueue) {
      await syncQueue.queue.add(
        'product-sync',
        {
          shopId,
          productId: event.id.toString(),
          type: 'INCREMENTAL',
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
