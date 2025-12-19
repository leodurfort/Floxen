/**
 * Product Data Transform Functions
 *
 * Functions for extracting product-specific data like GTIN, brand, and custom variants.
 */

import type { TransformFunction } from '../types';

/**
 * Extract GTIN from meta_data
 *
 * Looks for various barcode fields: gtin, upc, ean, isbn.
 * Checks both plain string values and meta_data array.
 *
 * @param value - GTIN value or meta_data array
 * @returns GTIN string or null if not found
 *
 * @example
 * extractGtin("1234567890123") // "1234567890123"
 * extractGtin([{ key: "_gtin", value: "1234567890123" }]) // "1234567890123"
 */
export const extractGtin: TransformFunction = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  const metaData = Array.isArray(value) ? value : null;
  if (!metaData) return null;

  const gtinKeys = ['_gtin', 'gtin', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'];
  const gtinField = metaData.find((m: any) => gtinKeys.includes(m.key));

  return gtinField?.value || null;
};

/**
 * Extract brand from WooCommerce Brands plugin or attributes
 *
 * Tries two sources:
 * 1. WooCommerce Brands plugin (brands array)
 * 2. Product attributes (attribute named "brand")
 *
 * @param brands - Brands array from WooCommerce Brands plugin
 * @param wooProduct - WooCommerce product object
 * @returns Brand name or null if not found
 *
 * @example
 * extractBrand([{ name: "Nike" }], product) // "Nike"
 * extractBrand(null, product) // Falls back to attributes
 */
export const extractBrand: TransformFunction = (brands, wooProduct) => {
  // Try WooCommerce Brands plugin first
  if (brands && Array.isArray(brands) && brands.length > 0) {
    return brands[0].name;
  }

  // Fallback to attributes
  const brandAttr = wooProduct.attributes?.find((a: any) =>
    a.name.toLowerCase() === 'brand'
  );
  if (!brandAttr) return null;
  // Handle both variation format (option string) and parent format (options array)
  return brandAttr.option ?? brandAttr.options?.[0] ?? null;
};

/**
 * Extract custom variant category
 *
 * Gets the name of the first custom variant attribute.
 *
 * @param attributes - Product attributes array
 * @returns First attribute name or null
 *
 * @example
 * // Input: [{ name: "Wood Type", options: ["Oak"] }]
 * // Output: "Wood Type"
 */
export const extractCustomVariant: TransformFunction = (attributes) => {
  if (!Array.isArray(attributes) || attributes.length === 0) return null;
  return attributes[0]?.name || null;
};

/**
 * Extract custom variant option
 *
 * Gets the value of the first custom variant attribute.
 *
 * @param attributes - Product attributes array
 * @returns First attribute option or null
 *
 * @example
 * // Input: [{ name: "Wood Type", options: ["Oak"] }]
 * // Output: "Oak"
 */
export const extractCustomVariantOption: TransformFunction = (attributes) => {
  if (!Array.isArray(attributes) || attributes.length === 0) return null;
  const attr = attributes[0];
  // Handle both variation format (option string) and parent format (options array)
  return attr?.option ?? attr?.options?.[0] ?? null;
};

/**
 * Build shipping string
 *
 * Placeholder for future shipping configuration.
 * Currently returns null, letting shop settings handle shipping.
 *
 * @param shippingClass - WooCommerce shipping class
 * @param wooProduct - WooCommerce product object
 * @param shop - Shop configuration object
 * @returns Shipping string or null
 */
export const buildShippingString: TransformFunction = (shippingClass, wooProduct, shop) => {
  // This would need shop-level shipping configuration
  // For now, return null and let shop settings handle it
  return null;
};

/**
 * Calculate popularity score from total sales
 *
 * Converts total sales count to a 0-5 popularity score using logarithmic scale.
 *
 * @param totalSales - Total number of sales
 * @returns Popularity score (0-5) or null if no sales
 *
 * @example
 * calculatePopularityScore(10) // ~1.0
 * calculatePopularityScore(100) // ~2.0
 * calculatePopularityScore(10000) // ~4.0
 */
export const calculatePopularityScore: TransformFunction = (totalSales) => {
  if (!totalSales || totalSales === 0) return null;

  // Simple logarithmic scale: log10(sales) scaled to 0-5
  const score = Math.min(5, Math.log10(totalSales + 1));
  return parseFloat(score.toFixed(1));
};

/**
 * Format Q&A from structured data
 *
 * Converts FAQ data to plain text format for OpenAI feed.
 *
 * @param faqData - FAQ data (array of {q, a} objects or string)
 * @returns Formatted Q&A string or null
 *
 * @example
 * // Input: [{ q: "Is it waterproof?", a: "Yes" }]
 * // Output: "Q: Is it waterproof?\nA: Yes"
 */
export const formatQAndA: TransformFunction = (faqData) => {
  if (!faqData) return null;

  // If it's already an array of {q, a} objects
  if (Array.isArray(faqData)) {
    return faqData.map((item: any) => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');
  }

  // If it's a string, return as-is
  if (typeof faqData === 'string') {
    return faqData;
  }

  return null;
};
