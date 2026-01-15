/**
 * Transform Registry
 *
 * Maps transform function names to implementations for WooCommerce -> OpenAI transformations.
 */

import type { TransformRegistry } from './types';
import { stripHtml, cleanVariationTitle } from './functions/basic';
import { buildCategoryPath } from './functions/category';
import { generateStableId, generateGroupId, generateOfferId, formatRelatedIds } from './functions/id-generation';
import { formatPriceWithCurrency, formatSaleDateRange } from './functions/pricing';
import { formatDimensions, addUnit, addWeightUnit } from './functions/dimensions';
import { extractAdditionalImages } from './functions/media';
import { extractGtin, extractBrand, extractCustomVariant, extractCustomVariantOption, buildShippingString, calculatePopularityScore, formatQAndA } from './functions/product-data';
import { mapStockStatus } from './functions/availability';
import { defaultToNew, defaultToZero } from './functions/defaults';

export const TRANSFORMS: TransformRegistry = {
  stripHtml,
  cleanVariationTitle,
  buildCategoryPath,
  generateStableId,
  generateGroupId,
  generateOfferId,
  formatRelatedIds,
  formatPriceWithCurrency,
  formatSaleDateRange,
  formatDimensions,
  addUnit,
  addWeightUnit,
  extractAdditionalImages,
  extractGtin,
  extractBrand,
  extractCustomVariant,
  extractCustomVariantOption,
  buildShippingString,
  calculatePopularityScore,
  formatQAndA,
  mapStockStatus,
  defaultToNew,
  defaultToZero,
};
