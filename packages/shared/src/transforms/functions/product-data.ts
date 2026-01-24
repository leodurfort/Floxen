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

