import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { getTierFromPriceId, getTierLimit, type SubscriptionTier } from '../config/billing';

// Lazy-initialize Stripe client to avoid crashing when key is not configured
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!env.stripe.secretKey) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
    }
    stripeClient = new Stripe(env.stripe.secretKey);
  }
  return stripeClient;
}

/**
 * Check if Stripe billing is configured
 */
export function isStripeConfigured(): boolean {
  return !!env.stripe.secretKey;
}

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: user.id },
  };

  // Use existing Stripe customer if available
  if (user.stripeCustomerId) {
    sessionParams.customer = user.stripeCustomerId;
  } else {
    sessionParams.customer_email = user.email;
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);

  logger.info('Stripe checkout session created', {
    userId,
    sessionId: session.id,
    priceId,
  });

  return session.url!;
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error('No active subscription to manage');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  logger.info('Stripe portal session created', { userId });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<void> {
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.stripe.webhookSecret
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', {
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw new Error('Invalid signature');
  }

  logger.info('Stripe webhook event received', {
    type: event.type,
    id: event.id,
  });

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.info('Unhandled Stripe webhook event', { type: event.type });
  }
}

/**
 * Handle checkout.session.completed - initial subscription creation
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    logger.error('Checkout session missing userId in metadata', { sessionId: session.id });
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Fetch subscription to get price and period
  const subscriptionResponse = await getStripe().subscriptions.retrieve(subscriptionId) as any;
  const priceId = subscriptionResponse.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId) || 'FREE';
  const productLimit = getTierLimit(tier);

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      subscriptionId,
      subscriptionStatus: subscriptionResponse.status,
      subscriptionTier: tier,
      currentPeriodEnd: new Date(subscriptionResponse.current_period_end * 1000),
      cancelAtPeriodEnd: subscriptionResponse.cancel_at_period_end,
    },
  });

  // Update product limits on all user's shops
  await prisma.shop.updateMany({
    where: { userId },
    data: { productLimit },
  });

  logger.info('Checkout completed - subscription activated', {
    userId,
    tier,
    subscriptionId,
    productLimit,
  });
}

/**
 * Handle customer.subscription.updated - plan changes, renewals
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
    select: { id: true, subscriptionTier: true },
  });

  if (!user) {
    logger.warn('Subscription updated for unknown user', { subscriptionId: subscription.id });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const newTier = getTierFromPriceId(priceId) || 'FREE';
  const oldTier = user.subscriptionTier as SubscriptionTier;
  const productLimit = getTierLimit(newTier);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionTier: newTier,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Update product limits on all user's shops
  await prisma.shop.updateMany({
    where: { userId: user.id },
    data: { productLimit },
  });

  // If downgrading, flag shops for product reselection
  const isDowngrade =
    (oldTier === 'PROFESSIONAL' && newTier !== 'PROFESSIONAL') ||
    (oldTier === 'STARTER' && newTier === 'FREE');

  if (isDowngrade) {
    await prisma.shop.updateMany({
      where: { userId: user.id },
      data: { needsProductReselection: true },
    });

    logger.info('User downgraded - flagged for product reselection', {
      userId: user.id,
      oldTier,
      newTier,
    });
  }

  logger.info('Subscription updated', {
    userId: user.id,
    oldTier,
    newTier,
    status: subscription.status,
  });
}

/**
 * Handle customer.subscription.deleted - subscription cancelled/expired
 */
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
    select: { id: true },
  });

  if (!user) {
    logger.warn('Subscription deleted for unknown user', { subscriptionId: subscription.id });
    return;
  }

  const freeLimit = getTierLimit('FREE');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionTier: 'FREE',
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  // Reset all shops to free tier limit and flag for reselection
  await prisma.shop.updateMany({
    where: { userId: user.id },
    data: {
      productLimit: freeLimit,
      needsProductReselection: true,
    },
  });

  logger.info('Subscription deleted - reverted to FREE tier', { userId: user.id });
}

/**
 * Handle invoice.paid - successful payment
 */
async function handleInvoicePaid(invoice: any): Promise<void> {
  // Invoice.subscription can be string, Subscription, or null depending on invoice type
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
    select: { id: true },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'active' },
  });

  logger.info('Invoice paid - subscription active', { userId: user.id });
}

/**
 * Handle invoice.payment_failed - payment failure
 */
async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  // Invoice.subscription can be string, Subscription, or null depending on invoice type
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
    select: { id: true },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.info('Invoice payment failed - subscription past due', { userId: user.id });
}

/**
 * Get user's billing info
 */
export async function getBillingInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  };
}
