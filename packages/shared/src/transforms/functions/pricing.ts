/**
 * Pricing Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Format price with currency code (e.g., "79.99 USD")
 */
export const formatPriceWithCurrency: TransformFunction = (price, _, shop) => {
  if (price === undefined || price === null) return null;
  const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (Number.isNaN(numPrice)) return null;
  const currency = shop?.shopCurrency;
  return currency ? `${numPrice.toFixed(2)} ${currency}` : numPrice.toFixed(2);
};

/**
 * Format sale date range: "YYYY-MM-DD / YYYY-MM-DD"
 * Only returns if product has an active sale_price.
 */
export const formatSaleDateRange: TransformFunction = (_, wooProduct) => {
  const { sale_price, date_on_sale_from, date_on_sale_to } = wooProduct;
  if (!sale_price || sale_price === '' || !date_on_sale_from || !date_on_sale_to) {
    return null;
  }

  const fromDate = new Date(date_on_sale_from).toISOString().split('T')[0];
  const toDate = new Date(date_on_sale_to).toISOString().split('T')[0];
  return `${fromDate} / ${toDate}`;
};
