/**
 * Feed Validation Layer
 *
 * Validates feed entries against OpenAI Product Feed specification.
 */

import { OPENAI_FEED_SPEC, OpenAIFieldSpec } from '../openai-feed-spec';
import {
  validatePrice,
  validateGtin,
  validateUrl,
  validateCategoryPath,
  validateAvailability,
  validateCondition,
  validateBooleanEnum,
  validateDimensions,
  validateWeight,
  validateDate,
  validateDateRange,
  validateStringLength,
  validateAlphanumericString,
  validatePositiveNumber,
  type ValidationResult,
} from './validators';

export interface FieldValidationError {
  field: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface FeedValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
  warnings: FieldValidationError[];
}

export interface ProductValidationContext {
  isVariation?: boolean;
  wooProductType?: 'simple' | 'variable' | 'grouped' | 'external' | string;
}

export interface ValidationOptions {
  skipFields?: string[];
  strictMode?: boolean;
  validateOptional?: boolean;
  feedEnableCheckout?: boolean;
  productContext?: ProductValidationContext;
}

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function checkConditionalRequirement(
  spec: OpenAIFieldSpec,
  entry: Record<string, any>,
  feedEnableCheckout: boolean,
  productContext?: ProductValidationContext
): boolean {
  const deps = spec.dependencies || '';
  const { attribute } = spec;

  if (deps.includes('enable_checkout')) return feedEnableCheckout;
  if (attribute === 'mpn' && deps.includes('gtin')) return !hasValue(entry['gtin']);
  if (attribute === 'availability_date' && deps.includes('availability')) return entry['availability'] === 'preorder';
  if (attribute === 'item_group_id' && deps.includes('variants')) return productContext?.isVariation === true;
  if (attribute === 'condition' && deps.includes('new')) return false;

  return false;
}

function validateCrossFieldDependencies(entry: Record<string, any>): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  if (hasValue(entry['availability_date']) && entry['availability'] !== 'preorder') {
    errors.push({
      field: 'availability_date',
      error: 'availability_date must be null when availability is not "preorder"',
      severity: 'error',
    });
  }

  if (hasValue(entry['sale_price']) && hasValue(entry['price'])) {
    const extractPrice = (val: string) => parseFloat(String(val).match(/^(\d+(?:\.\d+)?)/)?.[1] ?? '');
    const salePrice = extractPrice(entry['sale_price']);
    const price = extractPrice(entry['price']);

    if (!isNaN(salePrice) && !isNaN(price) && salePrice > price) {
      errors.push({
        field: 'sale_price',
        error: `sale_price (${salePrice}) must be less than or equal to price (${price})`,
        severity: 'error',
      });
    }
  }

  if (entry['enable_checkout'] === 'true' && entry['enable_search'] !== 'true') {
    errors.push({
      field: 'enable_checkout',
      error: 'enable_checkout requires enable_search to be "true"',
      severity: 'error',
    });
  }

  return errors;
}

// Field validation lookup tables for cleaner code
const BOOLEAN_FIELDS = new Set(['enable_search', 'enable_checkout']);
const PRICE_FIELDS = new Set(['price', 'sale_price', 'geo_price']);
const URL_FIELDS = new Set([
  'link', 'seller_url', 'seller_privacy_policy', 'seller_tos',
  'return_policy', 'image_link', 'video_link', 'model_3d_link', 'warning_url'
]);
const DATE_FIELDS = new Set(['availability_date', 'expiration_date', 'delivery_estimate']);
const DIMENSION_FIELDS = new Set(['length', 'width', 'height']);
const POSITIVE_NUMBER_FIELDS = new Set([
  'inventory_quantity', 'return_window', 'product_review_count',
  'store_review_count', 'age_restriction'
]);
const RATING_FIELDS = new Set(['popularity_score', 'product_review_rating', 'store_review_rating']);

// Max length for string fields
const STRING_LENGTH_LIMITS: Record<string, number> = {
  title: 150,
  description: 5000,
  brand: 70,
  seller_name: 70,
  item_group_id: 70,
  color: 40,
  size: 20,
  material: 100,
};

const ALPHANUMERIC_LENGTH_LIMITS: Record<string, number> = {
  mpn: 70,
  id: 100,
};

function validateDimensionWithUnit(value: any, attribute: string): ValidationResult {
  if (value && typeof value === 'string' && !/\s/.test(value)) {
    return { valid: false, error: `${attribute} must include unit (e.g., "10 mm")` };
  }
  return { valid: true };
}

function validateRating(value: any, attribute: string): ValidationResult {
  const numValidation = validatePositiveNumber(value, attribute);
  if (!numValidation.valid) return numValidation;

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (num > 5) {
    return { valid: false, error: `${attribute} must be between 0 and 5 (current: ${num})` };
  }
  return { valid: true };
}

/**
 * Validate a single field value based on OpenAI spec
 */
function validateFieldValue(
  spec: OpenAIFieldSpec,
  value: any
): ValidationResult {
  const { attribute, requirement } = spec;

  if (requirement === 'Required' && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `Required field "${attribute}" is missing` };
  }

  if (!value && requirement !== 'Required') {
    return { valid: true };
  }

  // Lookup-based validation for cleaner code
  if (BOOLEAN_FIELDS.has(attribute)) return validateBooleanEnum(value, attribute);
  if (PRICE_FIELDS.has(attribute)) return validatePrice(value);
  if (URL_FIELDS.has(attribute)) return validateUrl(value, attribute);
  if (DATE_FIELDS.has(attribute)) return validateDate(value, attribute);
  if (DIMENSION_FIELDS.has(attribute)) return validateDimensionWithUnit(value, attribute);
  if (POSITIVE_NUMBER_FIELDS.has(attribute)) return validatePositiveNumber(value, attribute);
  if (RATING_FIELDS.has(attribute)) return validateRating(value, attribute);

  // String length validation
  if (STRING_LENGTH_LIMITS[attribute] !== undefined) {
    return validateStringLength(value, attribute, STRING_LENGTH_LIMITS[attribute]);
  }
  if (ALPHANUMERIC_LENGTH_LIMITS[attribute] !== undefined) {
    return validateAlphanumericString(value, attribute, ALPHANUMERIC_LENGTH_LIMITS[attribute]);
  }

  // Special cases
  if (attribute === 'gtin') return validateGtin(value);
  if (attribute === 'product_category') return validateCategoryPath(value);
  if (attribute === 'availability') return validateAvailability(value);
  if (attribute === 'condition') return validateCondition(value);
  if (attribute === 'dimensions') return validateDimensions(value);
  if (attribute === 'weight') return validateWeight(value);
  if (attribute === 'sale_price_effective_date') return validateDateRange(value, attribute);
  if (attribute === 'additional_image_link') {
    return value && !Array.isArray(value)
      ? { valid: false, error: `${attribute} must be an array` }
      : { valid: true };
  }

  return { valid: true };
}

/**
 * Validate an entire feed entry against OpenAI specification
 */
export function validateFeedEntry(
  entry: Record<string, any>,
  options: ValidationOptions = {}
): FeedValidationResult {
  const errors: FieldValidationError[] = [];
  const warnings: FieldValidationError[] = [];
  const {
    skipFields = [],
    strictMode = false,
    validateOptional = true,
    feedEnableCheckout = false,
    productContext,
  } = options;

  for (const spec of OPENAI_FEED_SPEC) {
    const { attribute, requirement } = spec;

    if (skipFields.includes(attribute)) continue;
    if (!validateOptional && requirement === 'Optional') continue;

    const value = entry[attribute];

    if (requirement === 'Conditional') {
      const conditionMet = checkConditionalRequirement(spec, entry, feedEnableCheckout, productContext);
      if (conditionMet && !hasValue(value)) {
        errors.push({
          field: attribute,
          error: `${attribute} is required: ${spec.dependencies}`,
          severity: 'error',
        });
      }
      if (!hasValue(value)) continue;
    }

    if (requirement === 'Recommended' && !hasValue(value)) {
      warnings.push({
        field: attribute,
        error: `${attribute} is recommended but missing`,
        severity: 'warning',
      });
      continue;
    }

    const validation = validateFieldValue(spec, value);

    if (!validation.valid) {
      const error: FieldValidationError = {
        field: attribute,
        error: validation.error!,
        severity: requirement === 'Required' ? 'error' : 'warning',
      };

      if (error.severity === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    } else if (validation.error) {
      warnings.push({
        field: attribute,
        error: validation.error,
        severity: 'warning',
      });
    }
  }

  errors.push(...validateCrossFieldDependencies(entry));

  if (strictMode && warnings.length > 0) {
    errors.push(...warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple feed entries. Returns a map of index to result for entries with issues.
 */
export function validateFeedEntries(
  entries: Array<Record<string, any>>,
  options: ValidationOptions = {}
): Map<number, FeedValidationResult> {
  const results = new Map<number, FeedValidationResult>();

  entries.forEach((entry, index) => {
    const result = validateFeedEntry(entry, options);
    if (!result.valid || result.warnings.length > 0) {
      results.set(index, result);
    }
  });

  return results;
}

/**
 * Get summary statistics from validation results
 */
export function getValidationSummary(results: Map<number, FeedValidationResult>): {
  total: number;
  invalid: number;
  withWarnings: number;
  totalErrors: number;
  totalWarnings: number;
  commonErrors: Array<{ error: string; count: number }>;
} {
  let invalid = 0;
  let withWarnings = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const errorCounts = new Map<string, number>();

  results.forEach((result) => {
    if (!result.valid) invalid++;
    if (result.warnings.length > 0) withWarnings++;
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    result.errors.forEach((error) => {
      errorCounts.set(error.error, (errorCounts.get(error.error) || 0) + 1);
    });
  });

  const commonErrors = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: results.size,
    invalid,
    withWarnings,
    totalErrors,
    totalWarnings,
    commonErrors,
  };
}

export interface ApiValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

/**
 * Convert FeedValidationResult to API-compatible format (errors grouped by field)
 */
export function toApiValidationResult(result: FeedValidationResult): ApiValidationResult {
  const groupByField = (items: FieldValidationError[]): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    for (const item of items) {
      (grouped[item.field] ??= []).push(item.error);
    }
    return grouped;
  };

  return {
    isValid: result.valid,
    errors: groupByField(result.errors),
    warnings: groupByField(result.warnings),
  };
}

/**
 * Validate a product and return API-compatible result (convenience wrapper)
 */
export function validateProduct(
  openaiAutoFilled: Record<string, any>,
  feedEnableCheckout: boolean = false,
  productContext?: ProductValidationContext
): ApiValidationResult {
  const result = validateFeedEntry(openaiAutoFilled, { feedEnableCheckout, productContext });
  return toApiValidationResult(result);
}
