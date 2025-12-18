/**
 * Transform Function Types
 *
 * Type definitions for WooCommerce to OpenAI feed transform functions.
 * These transforms are isomorphic and work in both Node.js (server) and browser (client).
 */

import type { Shop } from '../index';

/**
 * Transform function signature
 *
 * @param value - The primary value being transformed (extracted from WooCommerce product)
 * @param wooProduct - The full WooCommerce product object
 * @param shop - Shop configuration object (contains currency, units, seller info, etc.)
 * @returns The transformed value ready for OpenAI feed format
 */
export type TransformFunction = (
  value: any,
  wooProduct: any,
  shop: Shop | Record<string, any>
) => any;

/**
 * Transform registry type
 * Maps transform function names to their implementations
 */
export type TransformRegistry = Record<string, TransformFunction>;
