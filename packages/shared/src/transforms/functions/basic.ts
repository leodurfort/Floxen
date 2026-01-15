/**
 * Basic Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Strip HTML tags from description, returning plain text
 */
export const stripHtml: TransformFunction = (value) => {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').trim();
};

/**
 * Clean variation title by removing redundant parent name repetition
 * Example: "Product - Product - Red, M" -> "Product - Red, M"
 */
export const cleanVariationTitle: TransformFunction = (title, wooProduct) => {
  if (!title || typeof title !== 'string') return title;

  const isVariation = wooProduct?.parent_id && wooProduct.parent_id > 0;
  if (!isVariation) return title;

  const parts = title.split(' - ');
  if (parts.length < 3) return title;

  if (parts[0].trim() === parts[1].trim()) {
    return parts.slice(1).join(' - ');
  }

  return title;
};
