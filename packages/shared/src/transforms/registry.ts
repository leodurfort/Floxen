/**
 * Transform Registry
 *
 * Maps transform function names to implementations for WooCommerce -> OpenAI transformations.
 */

import type { TransformRegistry } from './types';
import { stripHtml, cleanVariationTitle } from './functions/basic';
import { buildCategoryPath } from './functions/category';
import { generateGroupId, formatRelatedIds } from './functions/id-generation';
import { formatPriceWithCurrency, formatSaleDateRange } from './functions/pricing';
import { formatDimensions, addUnit, addWeightUnit } from './functions/dimensions';
import { extractAdditionalImages } from './functions/media';
import { extractGtin } from './functions/product-data';
import { mapStockStatus } from './functions/availability';
import { defaultToZero } from './functions/defaults';

export const TRANSFORMS: TransformRegistry = {
  stripHtml,
  cleanVariationTitle,
  buildCategoryPath,
  generateGroupId,
  formatRelatedIds,
  formatPriceWithCurrency,
  formatSaleDateRange,
  formatDimensions,
  addUnit,
  addWeightUnit,
  extractAdditionalImages,
  extractGtin,
  mapStockStatus,
  defaultToZero,
};
