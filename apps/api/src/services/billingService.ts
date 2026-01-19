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
  logger.debug('[BILLING] createCheckoutSession started', {
    userId,
    priceId,
    successUrl,
    cancelUrl,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  logger.debug('[BILLING] User lookup result', {
    userId,
    found: !!user,
    hasStripeCustomerId: !!user?.stripeCustomerId,
    email: user?.email,
  });

  if (!user) {
    logger.error('[BILLING] User not found for checkout', { userId });
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
    logger.debug('[BILLING] Using existing Stripe customer', {
      userId,
      stripeCustomerId: user.stripeCustomerId,
    });
  } else {
    sessionParams.customer_email = user.email;
    logger.debug('[BILLING] Using customer email (new customer)', {
      userId,
      email: user.email,
    });
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);

  logger.info('[BILLING] Stripe checkout session created', {
    userId,
    sessionId: session.id,
    priceId,
    checkoutUrl: session.url,
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
  logger.debug('[BILLING] createPortalSession started', { userId, returnUrl });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  logger.debug('[BILLING] Portal session user lookup', {
    userId,
    hasStripeCustomerId: !!user?.stripeCustomerId,
  });

  if (!user?.stripeCustomerId) {
    logger.warn('[BILLING] No stripeCustomerId for portal session', { userId });
    throw new Error('No active subscription to manage');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  logger.info('[BILLING] Stripe portal session created', {
    userId,
    portalUrl: session.url,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<void> {
  logger.debug('[BILLING-WEBHOOK] handleWebhookEvent called', {
    payloadLength: payload.length,
    hasSignature: !!signature,
  });

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.stripe.webhookSecret
    );
    logger.debug('[BILLING-WEBHOOK] Signature verification successful');
  } catch (err) {
    logger.error('[BILLING-WEBHOOK] Signature verification FAILED', {
      error: err instanceof Error ? err : new Error(String(err)),
      webhookSecretConfigured: !!env.stripe.webhookSecret,
    });
    throw new Error('Invalid signature');
  }

  logger.info('[BILLING-WEBHOOK] Event received', {
    type: event.type,
    id: event.id,
    created: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
  });

  switch (event.type) {
    case 'checkout.session.completed':
      logger.debug('[BILLING-WEBHOOK] Processing checkout.session.completed');
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      logger.debug('[BILLING-WEBHOOK] Processing customer.subscription.updated');
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      logger.debug('[BILLING-WEBHOOK] Processing customer.subscription.deleted');
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
      logger.debug('[BILLING-WEBHOOK] Processing invoice.paid');
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      logger.debug('[BILLING-WEBHOOK] Processing invoice.payment_failed');
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.info('[BILLING-WEBHOOK] Unhandled event type', { type: event.type });
  }

  logger.debug('[BILLING-WEBHOOK] Event processing completed', {
    type: event.type,
    id: event.id,
  });
}

/**
 * Handle checkout.session.completed - initial subscription creation
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  logger.debug('[BILLING-WEBHOOK] handleCheckoutCompleted started', {
    sessionId: session.id,
    metadata: session.metadata,
    customerId: session.customer,
    subscriptionId: session.subscription,
    paymentStatus: session.payment_status,
    status: session.status,
  });

  const userId = session.metadata?.userId;
  if (!userId) {
    logger.error('[BILLING-WEBHOOK] Checkout session missing userId in metadata', {
      sessionId: session.id,
      metadata: session.metadata,
    });
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  logger.debug('[BILLING-WEBHOOK] Fetching subscription details from Stripe', {
    subscriptionId,
  });

  // Fetch subscription to get price and period
  const subscriptionResponse = await getStripe().subscriptions.retrieve(subscriptionId) as any;

  logger.debug('[BILLING-WEBHOOK] Subscription fetched from Stripe', {
    subscriptionId,
    status: subscriptionResponse.status,
    currentPeriodEnd: subscriptionResponse.current_period_end,
    cancelAtPeriodEnd: subscriptionResponse.cancel_at_period_end,
    itemsCount: subscriptionResponse.items?.data?.length,
  });

  const priceId = subscriptionResponse.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId) || 'FREE';
  const productLimit = getTierLimit(tier);

  logger.debug('[BILLING-WEBHOOK] Tier determined from priceId', {
    priceId,
    tier,
    productLimit,
  });

  logger.debug('[BILLING-WEBHOOK] Updating user in database', {
    userId,
    tier,
    subscriptionId,
    customerId,
    status: subscriptionResponse.status,
  });

  // Handle case where current_period_end might be missing
  const currentPeriodEndTimestamp = subscriptionResponse.current_period_end;
  const currentPeriodEnd = currentPeriodEndTimestamp
    ? new Date(currentPeriodEndTimestamp * 1000)
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      subscriptionId,
      subscriptionStatus: subscriptionResponse.status,
      subscriptionTier: tier,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscriptionResponse.cancel_at_period_end ?? false,
    },
  });

  logger.debug('[BILLING-WEBHOOK] User updated successfully, now updating shops', {
    userId,
    productLimit,
  });

  // Update product limits on all user's shops
  const shopUpdateResult = await prisma.shop.updateMany({
    where: { userId },
    data: { productLimit },
  });

  logger.info('[BILLING-WEBHOOK] Checkout completed - subscription activated', {
    userId,
    tier,
    subscriptionId,
    productLimit,
    shopsUpdated: shopUpdateResult.count,
  });
}

/**
 * Handle customer.subscription.updated - plan changes, renewals
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  logger.info('[BILLING-WEBHOOK] handleSubscriptionUpdated - RAW DATA', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: subscription.current_period_end,
    canceled_at: subscription.canceled_at,
    cancel_at: subscription.cancel_at,
  });

  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
    select: { id: true, subscriptionTier: true },
  });

  logger.debug('[BILLING-WEBHOOK] User lookup by subscriptionId', {
    subscriptionId: subscription.id,
    found: !!user,
    userId: user?.id,
    currentTier: user?.subscriptionTier,
  });

  if (!user) {
    logger.warn('[BILLING-WEBHOOK] Subscription updated for unknown user - NO USER FOUND', {
      subscriptionId: subscription.id,
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const newTier = getTierFromPriceId(priceId) || 'FREE';
  const oldTier = user.subscriptionTier as SubscriptionTier;
  const productLimit = getTierLimit(newTier);

  // Handle case where current_period_end might be missing
  const currentPeriodEndTimestamp = subscription.current_period_end;
  const currentPeriodEnd = currentPeriodEndTimestamp
    ? new Date(currentPeriodEndTimestamp * 1000)
    : null;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  logger.debug('[BILLING-WEBHOOK] Subscription data analysis', {
    userId: user.id,
    priceId,
    oldTier,
    newTier,
    productLimit,
    cancelAtPeriodEnd,
    currentPeriodEnd: currentPeriodEnd?.toISOString(),
    rawCancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionTier: newTier,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
  });

  logger.debug('[BILLING-WEBHOOK] User updated in database', {
    userId: user.id,
    newTier,
    status: subscription.status,
    cancelAtPeriodEnd,
    currentPeriodEnd: currentPeriodEnd?.toISOString(),
  });

  // Update product limits on all user's shops
  const shopUpdateResult = await prisma.shop.updateMany({
    where: { userId: user.id },
    data: { productLimit },
  });

  logger.debug('[BILLING-WEBHOOK] Shops productLimit updated', {
    userId: user.id,
    productLimit,
    shopsUpdated: shopUpdateResult.count,
  });

  // If downgrading, flag shops for product reselection
  const isDowngrade =
    (oldTier === 'PROFESSIONAL' && newTier !== 'PROFESSIONAL') ||
    (oldTier === 'STARTER' && newTier === 'FREE');

  if (isDowngrade) {
    const reselectionResult = await prisma.shop.updateMany({
      where: { userId: user.id },
      data: { needsProductReselection: true },
    });

    logger.info('[BILLING-WEBHOOK] User DOWNGRADED - flagged for product reselection', {
      userId: user.id,
      oldTier,
      newTier,
      shopsFlagged: reselectionResult.count,
    });
  }

  logger.info('[BILLING-WEBHOOK] Subscription updated successfully', {
    userId: user.id,
    oldTier,
    newTier,
    status: subscription.status,
    cancelAtPeriodEnd,
    currentPeriodEnd: currentPeriodEnd?.toISOString(),
    isDowngrade,
  });
}

/**
 * Handle customer.subscription.deleted - subscription cancelled/expired
 */
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  logger.debug('[BILLING-WEBHOOK] handleSubscriptionDeleted started', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
    select: { id: true },
  });

  logger.debug('[BILLING-WEBHOOK] User lookup for deleted subscription', {
    subscriptionId: subscription.id,
    found: !!user,
    userId: user?.id,
  });

  if (!user) {
    logger.warn('[BILLING-WEBHOOK] Subscription deleted for unknown user - NO USER FOUND', {
      subscriptionId: subscription.id,
    });
    return;
  }

  const freeLimit = getTierLimit('FREE');

  logger.debug('[BILLING-WEBHOOK] Reverting user to FREE tier', {
    userId: user.id,
    freeLimit,
  });

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
  const shopUpdateResult = await prisma.shop.updateMany({
    where: { userId: user.id },
    data: {
      productLimit: freeLimit,
      needsProductReselection: true,
    },
  });

  logger.info('[BILLING-WEBHOOK] Subscription DELETED - reverted to FREE tier', {
    userId: user.id,
    freeLimit,
    shopsReset: shopUpdateResult.count,
  });
}

/**
 * Handle invoice.paid - successful payment
 */
async function handleInvoicePaid(invoice: any): Promise<void> {
  logger.debug('[BILLING-WEBHOOK] handleInvoicePaid started', {
    invoiceId: invoice.id,
    subscription: invoice.subscription,
    status: invoice.status,
    amountPaid: invoice.amount_paid,
  });

  // Invoice.subscription can be string, Subscription, or null depending on invoice type
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    logger.debug('[BILLING-WEBHOOK] Invoice has no subscriptionId, skipping', {
      invoiceId: invoice.id,
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
    select: { id: true },
  });

  logger.debug('[BILLING-WEBHOOK] User lookup for invoice.paid', {
    subscriptionId,
    found: !!user,
    userId: user?.id,
  });

  if (!user) {
    logger.warn('[BILLING-WEBHOOK] Invoice paid but no user found', {
      invoiceId: invoice.id,
      subscriptionId,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'active' },
  });

  logger.info('[BILLING-WEBHOOK] Invoice PAID - subscription now active', {
    userId: user.id,
    invoiceId: invoice.id,
    subscriptionId,
  });
}

/**
 * Handle invoice.payment_failed - payment failure
 */
async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  logger.debug('[BILLING-WEBHOOK] handleInvoicePaymentFailed started', {
    invoiceId: invoice.id,
    subscription: invoice.subscription,
    attemptCount: invoice.attempt_count,
  });

  // Invoice.subscription can be string, Subscription, or null depending on invoice type
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    logger.debug('[BILLING-WEBHOOK] Failed invoice has no subscriptionId, skipping', {
      invoiceId: invoice.id,
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
    select: { id: true },
  });

  logger.debug('[BILLING-WEBHOOK] User lookup for payment_failed', {
    subscriptionId,
    found: !!user,
    userId: user?.id,
  });

  if (!user) {
    logger.warn('[BILLING-WEBHOOK] Invoice payment failed but no user found', {
      invoiceId: invoice.id,
      subscriptionId,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.warn('[BILLING-WEBHOOK] Invoice PAYMENT FAILED - subscription now past_due', {
    userId: user.id,
    invoiceId: invoice.id,
    subscriptionId,
    attemptCount: invoice.attempt_count,
  });
}

/**
 * Get user's billing info
 */
export async function getBillingInfo(userId: string) {
  logger.debug('[BILLING] getBillingInfo called', { userId });

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
    logger.error('[BILLING] getBillingInfo - User not found', { userId });
    throw new Error('User not found');
  }

  const billingInfo = {
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  };

  logger.debug('[BILLING] getBillingInfo returning', {
    userId,
    tier: billingInfo.tier,
    status: billingInfo.status,
    currentPeriodEnd: billingInfo.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd,
  });

  return billingInfo;
}
