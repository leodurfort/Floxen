import { Request, Response } from 'express';
import { handleWebhookEvent } from '../services/billingService';
import { logger } from '../lib/logger';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * NOTE: This route must be registered BEFORE express.json() middleware
 * to receive the raw body for signature verification
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;
  const rawRequestId = req.headers['x-request-id'];
  const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId || `webhook-${Date.now()}`;

  logger.info('[WEBHOOK] Stripe webhook received', {
    requestId,
    hasSignature: !!signature,
    bodyLength: req.body?.length,
    contentType: req.headers['content-type'],
  });

  if (!signature) {
    logger.warn('[WEBHOOK] Missing stripe-signature header', { requestId });
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    logger.debug('[WEBHOOK] Processing webhook event', { requestId });

    await handleWebhookEvent(req.body, signature);

    logger.info('[WEBHOOK] Webhook processed successfully', { requestId });
    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler failed';

    if (message === 'Invalid signature') {
      logger.error('[WEBHOOK] Invalid signature - possible webhook secret mismatch', {
        requestId,
        signaturePrefix: signature?.substring(0, 20),
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.error('[WEBHOOK] Webhook handler FAILED', {
      requestId,
      error: err instanceof Error ? err : new Error(String(err)),
      message,
    });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
