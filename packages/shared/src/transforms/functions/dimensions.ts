/**
 * Dimensions Transform Functions
 *
 * Functions for formatting product dimensions and weights with units.
 */

import type { TransformFunction } from '../types';

/**
 * Format dimensions as "LxWxH unit"
 *
 * Combines length, width, and height into single string with unit.
 * Uses shop's dimensionUnit from WooCommerce settings.
 *
 * @param dimensions - Dimensions object from WooCommerce
 * @param _ - WooCommerce product object (unused)
 * @param shop - Shop configuration object (contains dimensionUnit)
 * @returns Formatted dimensions string or null if incomplete
 *
 * @example
 * // Input: { length: "12", width: "8", height: "5" }, shop.dimensionUnit = "in"
 * // Output: "12x8x5 in"
 */
export const formatDimensions: TransformFunction = (dimensions, _, shop) => {
  if (!dimensions) return null;
  const { length, width, height } = dimensions;
  if (!length || !width || !height) return null;

  const unit = shop?.dimensionUnit || dimensions.unit;
  if (!unit) return null;
  return `${length}x${width}x${height} ${unit}`;
};

/**
 * Add unit to dimension value
 *
 * Uses shop's dimensionUnit from WooCommerce settings.
 * Validates that all three dimensions (length, width, height) are present.
 * Returns null if only some dimensions are filled (enforces all-or-nothing).
 *
 * @param value - Individual dimension value
 * @param wooProduct - WooCommerce product object (contains dimensions)
 * @param shop - Shop configuration object (contains dimensionUnit)
 * @returns Value with unit or null if validation fails
 *
 * @example
 * // All dimensions filled: "10 mm"
 * // Some dimensions missing: null (enforces consistency)
 */
export const addUnit: TransformFunction = (value, wooProduct, shop) => {
  if (!value) return null;

  // Check if all three dimensions exist
  const dimensions = wooProduct.dimensions || {};
  const length = dimensions.length;
  const width = dimensions.width;
  const height = dimensions.height;

  // Count how many dimensions are filled
  const filledCount = [length, width, height].filter(d => d && d !== '0' && d !== 0).length;

  // If only some are filled (1 or 2), return null (enforce all-or-nothing)
  if (filledCount > 0 && filledCount < 3) {
    return null;
  }

  // If all three are filled, return with unit
  if (filledCount === 3) {
    const unit = shop?.dimensionUnit || dimensions.unit;
    if (!unit) return null;
    return `${value} ${unit}`;
  }

  // If none are filled, return null
  return null;
};

/**
 * Add weight unit
 *
 * Uses shop's weightUnit from WooCommerce settings.
 *
 * @param weight - Weight value
 * @param _ - WooCommerce product object (unused)
 * @param shop - Shop configuration object (contains weightUnit)
 * @returns Weight with unit or null if weight/unit missing
 *
 * @example
 * addWeightUnit("1.5", product, shop) // "1.5 lb"
 */
export const addWeightUnit: TransformFunction = (weight, _, shop) => {
  if (!weight) return null;
  const unit = shop?.weightUnit;
  if (!unit) return null;
  return `${weight} ${unit}`;
};
