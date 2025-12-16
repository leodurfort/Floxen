import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { productSyncQueue } from '../jobs';

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
    // Get shop to retrieve webhook secret
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, wooWebhookSecret: true },
    });

    if (!shop) {
      logger.warn('Webhook received for non-existent shop', { shopId });
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Verify webhook signature if secret is configured
    if (shop.wooWebhookSecret) {
      if (!signature) {
        logger.warn('Webhook received without signature', { shopId });
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const isValid = verifyWebhookSignature(
        webhookBody,
        signature,
        shop.wooWebhookSecret
      );

      if (!isValid) {
        logger.error('Invalid webhook signature', {
          shopId,
          hasSignature: !!signature,
        });
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    } else {
      logger.warn('Webhook secret not configured for shop', { shopId });
    }

    // Enqueue sync job for the product
    const event = req.body;
    if (event.id) {
      await productSyncQueue.add(
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
