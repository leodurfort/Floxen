import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Feed Eligibility Module - Single Source of Truth
 *
 * A product appears in the feed when ALL conditions are met:
 * - isValid = true (passes validation)
 * - feedEnableSearch = true (enabled for feed)
 * - isSelected = true (user selected the product)
 * - syncState = 'synced' (successfully synced)
 * - NOT a parent product (variations are included, parent containers are not)
 *
 * This module centralizes feed eligibility logic to prevent inconsistencies
 * across different code paths (feed preview, feed generation, stats, etc.)
 */

/**
 * Minimum fields required for feed eligibility checks and feed generation.
 * All queries that need to determine feed eligibility must select these fields.
 */
export const FEED_ELIGIBILITY_SELECT = {
  id: true,
  wooProductId: true,
  wooParentId: true,
  wooTitle: true,
  openaiAutoFilled: true,
  isValid: true,
  feedEnableSearch: true,
  isSelected: true,
  syncState: true,
} as const satisfies Prisma.ProductSelect;

/**
 * Build Prisma where clause for feed-eligible products.
 * This is the canonical definition of what makes a product feed-eligible.
 *
 * @param shopId - The shop ID
 * @param parentIds - Parent product IDs to exclude (from getParentProductIds)
 * @returns Prisma where clause for feed-eligible products
 */
export function buildFeedEligibilityWhere(
  shopId: string,
  parentIds: number[]
): Prisma.ProductWhereInput {
  return {
    shopId,
    isValid: true,
    feedEnableSearch: true,
    isSelected: true,
    syncState: 'synced',
    // Exclude parent products - only their variations should be in the feed
    // Use [0] as fallback when no parents exist to avoid empty IN clause issues
    wooProductId: { notIn: parentIds.length > 0 ? parentIds : [0] },
  };
}

/**
 * Build base filter for catalog queries (selected, synced, non-parent products).
 * This is the subset of feed eligibility used for catalog listing.
 *
 * @param shopId - The shop ID
 * @param parentIds - Parent product IDs to exclude
 * @returns Prisma where clause for catalog base filter
 */
export function buildCatalogBaseWhere(
  shopId: string,
  parentIds: number[]
): Prisma.ProductWhereInput {
  return {
    shopId,
    isSelected: true,
    syncState: 'synced',
    wooProductId: { notIn: parentIds.length > 0 ? parentIds : [0] },
  };
}

/**
 * Check if a product object is feed-eligible (in-memory check).
 * Use this when you already have the product data loaded.
 *
 * Note: This does NOT check parent product status - that must be handled
 * at the query level using buildFeedEligibilityWhere.
 *
 * @param product - Product with feed eligibility fields
 * @returns true if product is feed-eligible
 */
export function isFeedEligible(product: {
  isValid?: boolean | null;
  feedEnableSearch?: boolean | null;
  isSelected?: boolean | null;
  syncState?: string | null;
}): boolean {
  return (
    product.isValid === true &&
    product.feedEnableSearch === true &&
    product.isSelected === true &&
    product.syncState === 'synced'
  );
}

/**
 * Helper to get parent product IDs for a shop.
 * Parent products are those that have variations pointing to them.
 *
 * @param prisma - Prisma client instance
 * @param shopId - The shop ID
 * @returns Array of parent product wooProductIds
 */
export async function getParentProductIds(
  prisma: PrismaClient | Prisma.TransactionClient,
  shopId: string
): Promise<number[]> {
  const parentProductIds = await (prisma as PrismaClient).product.findMany({
    where: {
      shopId,
      wooParentId: { not: null },
    },
    select: { wooParentId: true },
    distinct: ['wooParentId'],
  });

  return parentProductIds
    .map((p) => p.wooParentId)
    .filter((id): id is number => id !== null);
}

