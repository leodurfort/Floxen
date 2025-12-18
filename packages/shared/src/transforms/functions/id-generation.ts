/**
 * ID Generation Transform Functions
 *
 * Functions for generating stable, unique IDs for products, variants, and offers.
 */

import type { TransformFunction } from '../types';

/**
 * Generate stable product ID
 *
 * Combines shop ID, WooCommerce product ID, and SKU for uniqueness.
 * Must remain stable over time for OpenAI feed consistency.
 *
 * @param _ - Unused (ID is generated, not extracted)
 * @param wooProduct - WooCommerce product object
 * @param shop - Shop configuration object
 * @returns Stable product ID
 *
 * @example
 * // With SKU: "shop123-456-SKU789"
 * // Without SKU: "shop123-456"
 */
export const generateStableId: TransformFunction = (_, wooProduct, shop) => {
  const sku = wooProduct.sku || '';
  return `${shop.id}-${wooProduct.id}${sku ? `-${sku}` : ''}`;
};

/**
 * Generate item group ID for variants
 *
 * Groups all variants of a product together.
 * Variants share the same item_group_id but have different IDs.
 *
 * @param parentId - WooCommerce parent product ID (for variants)
 * @param wooProduct - WooCommerce product object
 * @param shop - Shop configuration object
 * @returns Item group ID
 *
 * @example
 * // For variant: "shop123-789" (uses parent ID)
 * // For simple product: "shop123-456" (uses own ID)
 */
export const generateGroupId: TransformFunction = (parentId, wooProduct, shop) => {
  if (parentId && parentId > 0) {
    // This is a variant, use parent ID
    return `${shop.id}-${parentId}`;
  }
  // Simple product, use its own ID
  return `${shop.id}-${wooProduct.id}`;
};

/**
 * Generate offer ID (unique per variant)
 *
 * Creates unique offer ID by combining SKU with color/size attributes.
 * Used to distinguish different variants with the same base SKU.
 *
 * @param sku - Product SKU
 * @param wooProduct - WooCommerce product object
 * @param shop - Shop configuration object (unused but required for signature)
 * @returns Offer ID
 *
 * @example
 * // "SKU789-Blue-Large"
 * // "SKU789-Red"
 * // "prod-456" (fallback if no SKU)
 */
export const generateOfferId: TransformFunction = (sku, wooProduct, shop) => {
  const baseSku = sku || `prod-${wooProduct.id}`;
  const color = wooProduct.attributes?.find((a: any) => a.name.toLowerCase() === 'color')?.options?.[0];
  const size = wooProduct.attributes?.find((a: any) => a.name.toLowerCase() === 'size')?.options?.[0];

  let offerId = `${baseSku}`;
  if (color) offerId += `-${color}`;
  if (size) offerId += `-${size}`;

  return offerId;
};

/**
 * Format related product IDs
 *
 * Converts WooCommerce product IDs to stable IDs for cross-referencing.
 *
 * @param relatedIds - Array of WooCommerce product IDs
 * @param wooProduct - WooCommerce product object (unused)
 * @param shop - Shop configuration object
 * @returns Comma-separated stable IDs
 *
 * @example
 * // Input: [123, 456, 789]
 * // Output: "shop123-123,shop123-456,shop123-789"
 */
export const formatRelatedIds: TransformFunction = (relatedIds, wooProduct, shop) => {
  if (!Array.isArray(relatedIds) || relatedIds.length === 0) return null;

  // Convert WooCommerce product IDs to our stable IDs
  return relatedIds.map((id: number) => `${shop.id}-${id}`).join(',');
};
