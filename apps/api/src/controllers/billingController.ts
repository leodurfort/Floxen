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
  const userId = getUserId(req);
  const { priceId } = req.body;

  logger.debug('[BILLING-API] POST /billing/checkout called', {
    userId,
    priceId,
    body: req.body,
  });

  try {
    if (!priceId) {
      logger.warn('[BILLING-API] Checkout request missing priceId', { userId });
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Validate priceId is one of our configured prices
    const validPriceIds = [
      env.stripe.prices.starterMonthly,
      env.stripe.prices.starterAnnual,
      env.stripe.prices.proMonthly,
      env.stripe.prices.proAnnual,
    ].filter(Boolean);

    logger.debug('[BILLING-API] Validating priceId', {
      userId,
      priceId,
      validPriceIds,
      isValid: validPriceIds.includes(priceId),
    });

    if (!validPriceIds.includes(priceId)) {
      logger.warn('[BILLING-API] Invalid priceId submitted', { userId, priceId, validPriceIds });
      return res.status(400).json({ error: 'Invalid priceId' });
    }

    const baseUrl = env.webBaseUrl || 'http://localhost:3000';
    const successUrl = `${baseUrl}/settings/billing?success=true`;
    const cancelUrl = `${baseUrl}/settings/billing?canceled=true`;

    logger.debug('[BILLING-API] Creating checkout session', {
      userId,
      priceId,
      successUrl,
      cancelUrl,
    });

    const checkoutUrl = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);

    logger.info('[BILLING-API] Checkout session created successfully', {
      userId,
      priceId,
      checkoutUrl,
    });

    res.json({ url: checkoutUrl });
  } catch (err) {
    logger.error('[BILLING-API] Failed to create checkout session', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId,
      priceId,
    });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/v1/billing/portal
 * Create a Stripe Customer Portal session and return the URL
 */
export async function createPortal(req: Request, res: Response) {
  const userId = getUserId(req);

  logger.debug('[BILLING-API] POST /billing/portal called', { userId });

  try {
    const baseUrl = env.webBaseUrl || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/settings/billing`;

    logger.debug('[BILLING-API] Creating portal session', { userId, returnUrl });

    const portalUrl = await createPortalSession(userId, returnUrl);

    logger.info('[BILLING-API] Portal session created successfully', {
      userId,
      portalUrl,
    });

    res.json({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';

    if (message === 'No active subscription to manage') {
      logger.warn('[BILLING-API] Portal request failed - no active subscription', { userId });
      return res.status(400).json({ error: message });
    }

    logger.error('[BILLING-API] Failed to create portal session', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId,
    });
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

/**
 * GET /api/v1/billing
 * Get current user's billing information
 */
export async function getBilling(req: Request, res: Response) {
  const userId = getUserId(req);

  logger.debug('[BILLING-API] GET /billing called', { userId });

  try {
    const billingInfo = await getBillingInfo(userId);

    logger.debug('[BILLING-API] Returning billing info', {
      userId,
      tier: billingInfo.tier,
      status: billingInfo.status,
      currentPeriodEnd: billingInfo.currentPeriodEnd,
      cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd,
    });

    res.json(billingInfo);
  } catch (err) {
    logger.error('[BILLING-API] Failed to get billing info', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId,
    });
    res.status(500).json({ error: 'Failed to get billing information' });
  }
}

/**
 * GET /api/v1/billing/prices
 * Get available subscription prices
 */
export async function getPrices(req: Request, res: Response) {
  const userId = getUserId(req);

  const prices = {
    starter: {
      monthly: env.stripe.prices.starterMonthly,
      annual: env.stripe.prices.starterAnnual,
    },
    professional: {
      monthly: env.stripe.prices.proMonthly,
      annual: env.stripe.prices.proAnnual,
    },
  };

  logger.debug('[BILLING-API] GET /billing/prices called', {
    userId,
    pricesConfigured: {
      starterMonthly: !!prices.starter.monthly,
      starterAnnual: !!prices.starter.annual,
      proMonthly: !!prices.professional.monthly,
      proAnnual: !!prices.professional.annual,
    },
  });

  res.json(prices);
}
