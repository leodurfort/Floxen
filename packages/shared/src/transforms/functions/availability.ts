/**
 * Availability Transform Functions
 *
 * Functions for mapping WooCommerce stock status to OpenAI availability format.
 */

import type { TransformFunction } from '../types';

/**
 * Map WooCommerce stock status to OpenAI availability
 *
 * WooCommerce uses: instock, outofstock, onbackorder
 * OpenAI expects: in_stock, out_of_stock, preorder
 *
 * @param stockStatus - WooCommerce stock_status value
 * @returns OpenAI availability value
 *
 * @example
 * mapStockStatus("instock") // "in_stock"
 * mapStockStatus("outofstock") // "out_of_stock"
 * mapStockStatus("onbackorder") // "preorder"
 */
export const mapStockStatus: TransformFunction = (stockStatus) => {
  const map: Record<string, string> = {
    'instock': 'in_stock',
    'outofstock': 'out_of_stock',
    'onbackorder': 'preorder',
  };
  return map[stockStatus] || 'in_stock';
};
