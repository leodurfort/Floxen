/**
 * Basic Transform Functions
 *
 * Simple text manipulation transforms for product data.
 */

import type { TransformFunction } from '../types';

/**
 * Strip HTML tags from description
 *
 * Removes all HTML markup and returns plain text.
 * Used for OpenAI feed description field which requires plain text only.
 *
 * @param value - HTML string to strip
 * @returns Plain text without HTML tags
 *
 * @example
 * stripHtml("<p>Hello <strong>World</strong></p>") // "Hello World"
 */
export const stripHtml: TransformFunction = (value) => {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').trim();
};

/**
 * Clean variation title to show only parent product name
 *
 * Removes redundant parent name repetition from WooCommerce variation titles.
 * WooCommerce often duplicates the parent name in variations.
 *
 * @param title - Product title
 * @param wooProduct - WooCommerce product object
 * @returns Cleaned title without duplication
 *
 * @example
 * // Input: "Product - Product - Red, M"
 * // Output: "Product - Red, M"
 *
 * @example
 * // Input: "Product - Red, M" (already clean)
 * // Output: "Product - Red, M"
 */
export const cleanVariationTitle: TransformFunction = (title, wooProduct) => {
  if (!title || typeof title !== 'string') return title;

  // For variation products: check if parent_id exists
  const isVariation = wooProduct?.parent_id && wooProduct.parent_id > 0;
  if (!isVariation) return title;

  // Split by " - " to find repetition pattern
  const parts = title.split(' - ');
  if (parts.length < 3) return title; // No duplication possible

  // Check if first part equals second part (duplication pattern)
  if (parts[0].trim() === parts[1].trim()) {
    // Remove the duplicate first part, rejoin the rest
    return parts.slice(1).join(' - ');
  }

  return title;
};
