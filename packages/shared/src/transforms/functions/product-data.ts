/**
 * Product Data Transform Functions
 */

import type { TransformFunction } from '../types';

const GTIN_KEYS = ['_gtin', 'gtin', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'];

/**
 * Extract GTIN from value or meta_data array
 */
export const extractGtin: TransformFunction = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!Array.isArray(value)) return null;
  const gtinField = value.find((m: any) => GTIN_KEYS.includes(m.key));
  return gtinField?.value || null;
};

/**
 * Extract brand from WooCommerce Brands plugin or attributes
 */
export const extractBrand: TransformFunction = (brands, wooProduct) => {
  if (Array.isArray(brands) && brands.length > 0) {
    return brands[0].name;
  }

  const brandAttr = wooProduct.attributes?.find((a: any) =>
    a.name.toLowerCase() === 'brand'
  );
  return brandAttr?.option ?? brandAttr?.options?.[0] ?? null;
};

/**
 * Extract first custom variant category name
 */
export const extractCustomVariant: TransformFunction = (attributes) => {
  if (!Array.isArray(attributes) || attributes.length === 0) return null;
  return attributes[0]?.name || null;
};

/**
 * Extract first custom variant option value
 */
export const extractCustomVariantOption: TransformFunction = (attributes) => {
  if (!Array.isArray(attributes) || attributes.length === 0) return null;
  const attr = attributes[0];
  return attr?.option ?? attr?.options?.[0] ?? null;
};

/**
 * Build shipping string (placeholder for future implementation)
 */
export const buildShippingString: TransformFunction = () => null;

/**
 * Calculate popularity score (0-5) from total sales using logarithmic scale
 */
export const calculatePopularityScore: TransformFunction = (totalSales) => {
  if (!totalSales || totalSales === 0) return null;
  const score = Math.min(5, Math.log10(totalSales + 1));
  return parseFloat(score.toFixed(1));
};

/**
 * Format Q&A from structured data to plain text
 */
export const formatQAndA: TransformFunction = (faqData) => {
  if (!faqData) return null;
  if (Array.isArray(faqData)) {
    return faqData.map((item: any) => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');
  }
  return typeof faqData === 'string' ? faqData : null;
};
