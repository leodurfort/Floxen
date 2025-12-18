/**
 * Pricing Transform Functions
 *
 * Functions for formatting prices and sale date ranges.
 */

import type { TransformFunction } from '../types';

/**
 * Format price with currency
 *
 * Converts numeric price to string format with ISO 4217 currency code.
 * Required format: "79.99 USD"
 *
 * @param price - Price value (string or number)
 * @param _ - WooCommerce product object (unused)
 * @param shop - Shop configuration object (contains shopCurrency)
 * @returns Formatted price string or null if invalid
 *
 * @example
 * formatPriceWithCurrency("79.99", product, shop) // "79.99 USD"
 * formatPriceWithCurrency(79.99, product, shop) // "79.99 USD"
 */
export const formatPriceWithCurrency: TransformFunction = (price, _, shop) => {
  if (price === undefined || price === null) return null;
  const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (Number.isNaN(numPrice)) return null;
  const currency = shop?.shopCurrency;
  if (!currency) return numPrice.toFixed(2);
  return `${numPrice.toFixed(2)} ${currency}`;
};

/**
 * Format sale date range
 *
 * Converts WooCommerce sale dates to OpenAI format: "YYYY-MM-DD / YYYY-MM-DD"
 *
 * @param dateFrom - Start date (unused, extracted from wooProduct)
 * @param wooProduct - WooCommerce product object
 * @returns Formatted date range or null if dates missing
 *
 * @example
 * // Input: date_on_sale_from="2025-07-01", date_on_sale_to="2025-07-15"
 * // Output: "2025-07-01 / 2025-07-15"
 */
export const formatSaleDateRange: TransformFunction = (dateFrom, wooProduct) => {
  const from = wooProduct.date_on_sale_from;
  const to = wooProduct.date_on_sale_to;

  if (!from || !to) return null;

  const fromDate = new Date(from).toISOString().split('T')[0];
  const toDate = new Date(to).toISOString().split('T')[0];

  return `${fromDate} / ${toDate}`;
};
