/**
 * ID Generation Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Generate item group ID for variants (uses parent ID) or simple products (uses own ID)
 */
export const generateGroupId: TransformFunction = (parentId, wooProduct, shop) => {
  return parentId && parentId > 0
    ? `${shop.id}-${parentId}`
    : `${shop.id}-${wooProduct.id}`;
};

/**
 * Format related product IDs as comma-separated string
 */
export const formatRelatedIds: TransformFunction = (relatedIds) => {
  return Array.isArray(relatedIds) && relatedIds.length > 0
    ? relatedIds.join(',')
    : null;
};
