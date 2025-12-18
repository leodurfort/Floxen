/**
 * Default Value Transform Functions
 *
 * Functions for providing default values when data is missing.
 */

import type { TransformFunction } from '../types';

/**
 * Default to "new" condition
 *
 * OpenAI feed requires condition field.
 * If not provided, default to "new".
 *
 * @param value - Condition value
 * @returns Condition value or "new" if missing
 *
 * @example
 * defaultToNew("refurbished") // "refurbished"
 * defaultToNew(null) // "new"
 */
export const defaultToNew: TransformFunction = (value) => {
  return value || 'new';
};

/**
 * Default to zero for inventory
 *
 * OpenAI feed requires inventory_quantity field.
 * If not provided, default to 0.
 *
 * @param value - Inventory quantity value
 * @returns Inventory quantity or 0 if missing
 *
 * @example
 * defaultToZero(25) // 25
 * defaultToZero(null) // 0
 * defaultToZero(undefined) // 0
 */
export const defaultToZero: TransformFunction = (value) => {
  return value ?? 0;
};
