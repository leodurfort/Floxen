/**
 * Transform Function Types
 */

import type { Shop } from '../index';

export type TransformFunction = (
  value: any,
  wooProduct: any,
  shop: Shop | Record<string, any>
) => any;

export type TransformRegistry = Record<string, TransformFunction>;
