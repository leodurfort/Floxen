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
 */
export const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [env.stripe.prices.starterMonthly]: 'STARTER',
  [env.stripe.prices.starterAnnual]: 'STARTER',
  [env.stripe.prices.proMonthly]: 'PROFESSIONAL',
  [env.stripe.prices.proAnnual]: 'PROFESSIONAL',
};

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
