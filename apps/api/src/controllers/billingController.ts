import { Request, Response } from 'express';
import { createCheckoutSession, createPortalSession, getBillingInfo } from '../services/billingService';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { getUserId } from '../utils/request';

/**
 * POST /api/v1/billing/checkout
 * Create a Stripe Checkout session and return the URL
 */
export async function createCheckout(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Validate priceId is one of our configured prices
    const validPriceIds = [
      env.stripe.prices.starterMonthly,
      env.stripe.prices.starterAnnual,
      env.stripe.prices.proMonthly,
      env.stripe.prices.proAnnual,
    ].filter(Boolean);

    if (!validPriceIds.includes(priceId)) {
      return res.status(400).json({ error: 'Invalid priceId' });
    }

    const baseUrl = env.webBaseUrl || 'http://localhost:3000';
    const successUrl = `${baseUrl}/settings/billing?success=true`;
    const cancelUrl = `${baseUrl}/settings/billing?canceled=true`;

    const checkoutUrl = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);

    res.json({ url: checkoutUrl });
  } catch (err) {
    logger.error('Failed to create checkout session', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId: getUserId(req),
    });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/v1/billing/portal
 * Create a Stripe Customer Portal session and return the URL
 */
export async function createPortal(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    const baseUrl = env.webBaseUrl || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/settings/billing`;

    const portalUrl = await createPortalSession(userId, returnUrl);

    res.json({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';

    if (message === 'No active subscription to manage') {
      return res.status(400).json({ error: message });
    }

    logger.error('Failed to create portal session', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId: getUserId(req),
    });
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

/**
 * GET /api/v1/billing
 * Get current user's billing information
 */
export async function getBilling(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const billingInfo = await getBillingInfo(userId);

    res.json(billingInfo);
  } catch (err) {
    logger.error('Failed to get billing info', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId: getUserId(req),
    });
    res.status(500).json({ error: 'Failed to get billing information' });
  }
}

/**
 * GET /api/v1/billing/prices
 * Get available subscription prices
 */
export async function getPrices(_req: Request, res: Response) {
  res.json({
    starter: {
      monthly: env.stripe.prices.starterMonthly,
      annual: env.stripe.prices.starterAnnual,
    },
    professional: {
      monthly: env.stripe.prices.proMonthly,
      annual: env.stripe.prices.proAnnual,
    },
  });
}
