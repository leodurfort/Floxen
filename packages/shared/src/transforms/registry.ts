/**
 * Transform Registry
 *
 * Central registry mapping transform function names to their implementations.
 * This is the single source of truth for all WooCommerce -> OpenAI transformations.
 */

import type { TransformRegistry } from './types';
import { stripHtml, cleanVariationTitle } from './functions/basic';
import { buildCategoryPath } from './functions/category';
import {
  generateStableId,
  generateGroupId,
  generateOfferId,
  formatRelatedIds,
} from './functions/id-generation';
import {
  formatPriceWithCurrency,
  formatSaleDateRange,
} from './functions/pricing';
import {
  formatDimensions,
  addUnit,
  addWeightUnit,
} from './functions/dimensions';
import { extractAdditionalImages } from './functions/media';
import {
  extractGtin,
  extractBrand,
  extractCustomVariant,
  extractCustomVariantOption,
  buildShippingString,
  calculatePopularityScore,
  formatQAndA,
} from './functions/product-data';
import { mapStockStatus } from './functions/availability';
import { defaultToNew, defaultToZero } from './functions/defaults';

/**
 * Transform function registry
 * Maps transform function names to their implementations
 *
 * Usage:
 * ```typescript
 * const transformedValue = TRANSFORMS['stripHtml'](value, wooProduct, shop);
 * ```
 */
export const TRANSFORMS: TransformRegistry = {
  // Basic text transforms
  stripHtml,
  cleanVariationTitle,

  // Category transforms
  buildCategoryPath,

  // ID generation
  generateStableId,
  generateGroupId,
  generateOfferId,
  formatRelatedIds,

  // Pricing
  formatPriceWithCurrency,
  formatSaleDateRange,

  // Dimensions
  formatDimensions,
  addUnit,
  addWeightUnit,

  // Media
  extractAdditionalImages,

  // Product data
  extractGtin,
  extractBrand,
  extractCustomVariant,
  extractCustomVariantOption,
  buildShippingString,
  calculatePopularityScore,
  formatQAndA,

  // Availability
  mapStockStatus,

  // Defaults
  defaultToNew,
  defaultToZero,
};
