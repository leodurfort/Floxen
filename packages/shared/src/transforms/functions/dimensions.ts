/**
 * Dimensions Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Format dimensions as "LxWxH unit" (e.g., "12x8x5 in")
 */
export const formatDimensions: TransformFunction = (dimensions, _, shop) => {
  if (!dimensions) return null;
  const { length, width, height } = dimensions;
  if (!length || !width || !height) return null;

  const unit = shop?.dimensionUnit || dimensions.unit;
  return unit ? `${length}x${width}x${height} ${unit}` : null;
};

/**
 * Add unit to dimension value. Enforces all-or-nothing for dimensions.
 */
export const addUnit: TransformFunction = (value, wooProduct, shop) => {
  if (!value) return null;

  const { length, width, height } = wooProduct.dimensions || {};
  const filledCount = [length, width, height].filter(d => d && d !== '0' && d !== 0).length;

  if (filledCount !== 3) return null;

  const unit = shop?.dimensionUnit || wooProduct.dimensions?.unit;
  return unit ? `${value} ${unit}` : null;
};

/**
 * Add weight unit (e.g., "1.5 lb")
 */
export const addWeightUnit: TransformFunction = (weight, _, shop) => {
  if (!weight) return null;
  const unit = shop?.weightUnit;
  return unit ? `${weight} ${unit}` : null;
};
