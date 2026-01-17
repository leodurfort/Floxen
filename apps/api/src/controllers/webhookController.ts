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

  if (!signature) {
    logger.warn('Stripe webhook missing signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    await handleWebhookEvent(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler failed';

    if (message === 'Invalid signature') {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.error('Stripe webhook handler error', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
