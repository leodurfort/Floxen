/**
 * ID Generation Transform Functions
 */

import type { TransformFunction } from '../types';
import { extractFieldValue } from '../helpers';

/**
 * Generate stable product ID: shop-wooId[-sku]
 */
export const generateStableId: TransformFunction = (_, wooProduct, shop) => {
  const sku = wooProduct.sku || '';
  return `${shop.id}-${wooProduct.id}${sku ? `-${sku}` : ''}`;
};

/**
 * Generate item group ID for variants (uses parent ID) or simple products (uses own ID)
 */
export const generateGroupId: TransformFunction = (parentId, wooProduct, shop) => {
  return parentId && parentId > 0
    ? `${shop.id}-${parentId}`
    : `${shop.id}-${wooProduct.id}`;
};

/**
 * Generate offer ID: sku[-color][-size]
 */
export const generateOfferId: TransformFunction = (sku, wooProduct) => {
  const baseSku = sku || `prod-${wooProduct.id}`;
  const color = extractFieldValue(wooProduct, 'attributes.color');
  const size = extractFieldValue(wooProduct, 'attributes.size');

  let offerId = baseSku;
  if (color) offerId += `-${color}`;
  if (size) offerId += `-${size}`;
  return offerId;
};

/**
 * Format related product IDs as comma-separated string
 */
export const formatRelatedIds: TransformFunction = (relatedIds) => {
  return Array.isArray(relatedIds) && relatedIds.length > 0
    ? relatedIds.join(',')
    : null;
};
