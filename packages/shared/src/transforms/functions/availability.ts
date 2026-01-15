/**
 * Availability Transform Functions
 */

import type { TransformFunction } from '../types';

const STOCK_STATUS_MAP: Record<string, string> = {
  instock: 'in_stock',
  outofstock: 'out_of_stock',
  onbackorder: 'preorder',
};

/**
 * Map WooCommerce stock status to OpenAI availability
 */
export const mapStockStatus: TransformFunction = (stockStatus) => {
  return STOCK_STATUS_MAP[stockStatus] || 'in_stock';
};
