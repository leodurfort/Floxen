import { env } from './env';

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL';

/**
 * Product limits per subscription tier (per shop)
 * Billing is based on WooCommerce PRODUCTS (parents), not items/variants
 * Note: -1 represents unlimited (Infinity cannot be serialized to JSON)
 */
export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  FREE: 15,
  STARTER: 500,
  PROFESSIONAL: -1, // -1 = unlimited (Infinity becomes null in JSON)
} as const;

/**
 * Map Stripe Price IDs to subscription tiers
 * Used by webhook handler to determine tier from subscription
 *
 * Note: Only includes non-empty price IDs to prevent key collision
 * when environment variables are missing (all empty strings would
 * collapse to a single '' key, causing incorrect tier mapping)
 */
const priceEntries: [string, SubscriptionTier][] = [
  [env.stripe.prices.starterMonthly, 'STARTER'],
  [env.stripe.prices.starterAnnual, 'STARTER'],
  [env.stripe.prices.proMonthly, 'PROFESSIONAL'],
  [env.stripe.prices.proAnnual, 'PROFESSIONAL'],
].filter((entry): entry is [string, SubscriptionTier] => entry[0] !== '');

export const PRICE_TO_TIER: Record<string, SubscriptionTier> =
  Object.fromEntries(priceEntries);

/**
 * Get tier limit for a given subscription tier
 */
export function getTierLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;
}

/**
 * Check if a tier has unlimited products (-1 = unlimited)
 */
export function isUnlimitedTier(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier] === -1;
}

/**
 * Get tier from Stripe Price ID
 * Returns undefined if price ID is not recognized
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | undefined {
  return PRICE_TO_TIER[priceId];
}

// Warn at startup if Stripe prices are not fully configured
// Only warn if Stripe appears to be configured (secretKey is set)
if (env.stripe.secretKey && Object.keys(PRICE_TO_TIER).length < 4) {
  console.warn(
    '[BILLING] Warning: Not all Stripe price IDs are configured. ' +
      `Only ${Object.keys(PRICE_TO_TIER).length}/4 prices mapped. ` +
      'Webhooks with unknown price IDs will be rejected to prevent silent downgrades.'
  );
}
