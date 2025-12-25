/**
 * Feed Validation Layer
 *
 * Validates entire feed entries against OpenAI Product Feed specification.
 * Provides detailed error messages for debugging and quality assurance.
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

/**
 * Validation error for a specific field
 */
export interface FieldValidationError {
  field: string;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Complete validation result for a feed entry
 */
export interface FeedValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
  warnings: FieldValidationError[];
}

/**
 * Product context for conditional validation
 * Provides information about the product type that isn't available in the flat feed entry
 */
export interface ProductValidationContext {
  /** Whether this product is a variation (has a parent product) */
  isVariation?: boolean;
  /** WooCommerce product type (simple, variable, grouped, external) */
  wooProductType?: 'simple' | 'variable' | 'grouped' | 'external' | string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Skip validation for specific fields */
  skipFields?: string[];
  /** Treat warnings as errors */
  strictMode?: boolean;
  /** Validate optional fields */
  validateOptional?: boolean;
  /** Feed-level enable_checkout setting (affects conditional requirements) */
  feedEnableCheckout?: boolean;
  /** Product context for conditional validation (identifies variations, product type) */
  productContext?: ProductValidationContext;
}

/**
 * Check if a value exists (not null, undefined, empty string, or empty array)
 */
function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Check if a conditional requirement is met
 */
function checkConditionalRequirement(
  spec: OpenAIFieldSpec,
  entry: Record<string, any>,
  feedEnableCheckout: boolean,
  productContext?: ProductValidationContext
): boolean {
  const deps = spec.dependencies || '';

  // Checkout-related requirements (seller_privacy_policy, seller_tos)
  if (deps.includes('enable_checkout')) {
    return feedEnableCheckout;
  }

  // GTIN/MPN dependency: mpn required if gtin is not provided
  if (spec.attribute === 'mpn' && deps.includes('gtin')) {
    return !hasValue(entry['gtin']);
  }

  // Availability date required if availability = preorder
  if (spec.attribute === 'availability_date' && deps.includes('availability')) {
    return entry['availability'] === 'preorder';
  }

  // Item group ID required if product is a variation
  // Requires productContext to properly identify variations
  if (spec.attribute === 'item_group_id' && deps.includes('variants')) {
    return productContext?.isVariation === true;
  }

  // Condition: not required - defaultToNew() transform handles missing values
  // validateFieldValue() will check format if a value IS provided
  if (spec.attribute === 'condition' && deps.includes('new')) {
    return false;
  }

  return false;
}

/**
 * Validate cross-field dependencies
 */
function validateCrossFieldDependencies(
  entry: Record<string, any>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  // availability_date must be null when availability is not "preorder"
  if (hasValue(entry['availability_date']) && entry['availability'] !== 'preorder') {
    errors.push({
      field: 'availability_date',
      error: 'availability_date must be null when availability is not "preorder"',
      severity: 'error',
    });
  }

  // sale_price must be <= price
  if (hasValue(entry['sale_price']) && hasValue(entry['price'])) {
    const salePriceMatch = String(entry['sale_price']).match(/^(\d+(?:\.\d+)?)/);
    const priceMatch = String(entry['price']).match(/^(\d+(?:\.\d+)?)/);
    if (salePriceMatch && priceMatch) {
      const salePrice = parseFloat(salePriceMatch[1]);
      const price = parseFloat(priceMatch[1]);
      if (salePrice > price) {
        errors.push({
          field: 'sale_price',
          error: `sale_price (${salePrice}) must be less than or equal to price (${price})`,
          severity: 'error',
        });
      }
    }
  }

  // enable_checkout requires enable_search to be true
  if (entry['enable_checkout'] === 'true' && entry['enable_search'] !== 'true') {
    errors.push({
      field: 'enable_checkout',
      error: 'enable_checkout requires enable_search to be "true"',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate a single field value based on OpenAI spec
 */
function validateFieldValue(
  spec: OpenAIFieldSpec,
  value: any
): ValidationResult {
  const { attribute, requirement } = spec;

  // Check required fields
  if (requirement === 'Required' && (value === null || value === undefined || value === '')) {
    return {
      valid: false,
      error: `Required field "${attribute}" is missing`,
    };
  }

  // Skip validation if value is null/undefined for optional fields
  if (!value && requirement !== 'Required') {
    return { valid: true };
  }

  // Field-specific validation based on attribute name
  switch (attribute) {
    // Boolean flags
    case 'enable_search':
    case 'enable_checkout':
      return validateBooleanEnum(value, attribute);

    // Prices
    case 'price':
    case 'sale_price':
    case 'geo_price':
      return validatePrice(value);

    // GTIN
    case 'gtin':
      return validateGtin(value);

    // URLs
    case 'link':
    case 'seller_url':
    case 'seller_privacy_policy':
    case 'seller_tos':
    case 'return_policy':
    case 'image_link':
    case 'video_link':
    case 'model_3d_link':
    case 'warning_url':
      return validateUrl(value, attribute);

    // Category
    case 'product_category':
      return validateCategoryPath(value);

    // Availability
    case 'availability':
      return validateAvailability(value);

    // Condition
    case 'condition':
      return validateCondition(value);

    // Dimensions
    case 'dimensions':
      return validateDimensions(value);

    // Individual dimensions with unit
    case 'length':
    case 'width':
    case 'height':
      if (value && typeof value === 'string' && !/\s/.test(value)) {
        return {
          valid: false,
          error: `${attribute} must include unit (e.g., "10 mm")`,
        };
      }
      return { valid: true };

    // Weight
    case 'weight':
      return validateWeight(value);

    // Dates
    case 'availability_date':
    case 'expiration_date':
    case 'delivery_estimate':
      return validateDate(value, attribute);

    // Date ranges
    case 'sale_price_effective_date':
      return validateDateRange(value, attribute);

    // String length validation
    case 'title':
      return validateStringLength(value, attribute, 150);
    case 'description':
      return validateStringLength(value, attribute, 5000);
    case 'brand':
    case 'seller_name':
      return validateStringLength(value, attribute, 70);
    case 'mpn':
      return validateAlphanumericString(value, attribute, 70);
    case 'item_group_id':
      return validateStringLength(value, attribute, 70);
    case 'color':
      return validateStringLength(value, attribute, 40);
    case 'size':
      return validateStringLength(value, attribute, 20);
    case 'material':
      return validateStringLength(value, attribute, 100);
    case 'id':
      return validateAlphanumericString(value, attribute, 100);

    // Positive numbers
    case 'inventory_quantity':
    case 'return_window':
    case 'product_review_count':
    case 'store_review_count':
    case 'age_restriction':
      return validatePositiveNumber(value, attribute);

    // Numeric ranges (0-5)
    case 'popularity_score':
    case 'product_review_rating':
    case 'store_review_rating':
      const numValidation = validatePositiveNumber(value, attribute);
      if (!numValidation.valid) return numValidation;

      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      if (num > 5) {
        return {
          valid: false,
          error: `${attribute} must be between 0 and 5 (current: ${num})`,
        };
      }
      return { valid: true };

    // Arrays
    case 'additional_image_link':
      if (value && !Array.isArray(value)) {
        return {
          valid: false,
          error: `${attribute} must be an array`,
        };
      }
      return { valid: true };

    default:
      // No specific validation, just check it exists if required
      return { valid: true };
  }
}

/**
 * Validate an entire feed entry against OpenAI specification
 *
 * @param entry - The feed entry to validate (product data)
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const entry = {
 *   id: "123",
 *   title: "Product Name",
 *   price: "79.99 USD",
 *   // ... other fields
 * };
 *
 * const result = validateFeedEntry(entry);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
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

    // Skip fields explicitly excluded
    if (skipFields.includes(attribute)) {
      continue;
    }

    // Skip optional fields if not validating them
    if (!validateOptional && requirement === 'Optional') {
      continue;
    }

    const value = entry[attribute];

    // Handle conditional requirements
    if (requirement === 'Conditional') {
      const conditionMet = checkConditionalRequirement(spec, entry, feedEnableCheckout, productContext);
      if (conditionMet && !hasValue(value)) {
        errors.push({
          field: attribute,
          error: `${attribute} is required: ${spec.dependencies}`,
          severity: 'error',
        });
      }
      // Skip further validation if value is empty and condition not met
      if (!hasValue(value)) {
        continue;
      }
    }

    // Handle recommended fields - add warning if missing
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
      // Valid but has warning (e.g., HTTP instead of HTTPS)
      warnings.push({
        field: attribute,
        error: validation.error,
        severity: 'warning',
      });
    }
  }

  // Add cross-field validation errors
  const crossFieldErrors = validateCrossFieldDependencies(entry);
  errors.push(...crossFieldErrors);

  // In strict mode, treat warnings as errors
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
 * Validate multiple feed entries
 *
 * @param entries - Array of feed entries to validate
 * @param options - Validation options
 * @returns Map of entry index to validation result
 *
 * @example
 * ```typescript
 * const entries = [entry1, entry2, entry3];
 * const results = validateFeedEntries(entries);
 *
 * results.forEach((result, index) => {
 *   if (!result.valid) {
 *     console.error(`Entry ${index} has errors:`, result.errors);
 *   }
 * });
 * ```
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
 * Get a summary of validation results
 *
 * @param results - Validation results from validateFeedEntries
 * @returns Summary statistics
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

    // Count error types
    result.errors.forEach((error) => {
      const count = errorCounts.get(error.error) || 0;
      errorCounts.set(error.error, count + 1);
    });
  });

  // Get most common errors
  const commonErrors = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 most common errors

  return {
    total: results.size,
    invalid,
    withWarnings,
    totalErrors,
    totalWarnings,
    commonErrors,
  };
}

/**
 * API-compatible validation result format
 * Matches the format previously used by ValidationService
 */
export interface ApiValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

/**
 * Convert FeedValidationResult to API-compatible format
 *
 * This converts the array-based error format to a Record grouped by field,
 * matching the format expected by the API and database storage.
 *
 * @param result - FeedValidationResult from validateFeedEntry
 * @returns API-compatible validation result
 *
 * @example
 * ```typescript
 * const feedResult = validateFeedEntry(entry, { feedEnableCheckout: true });
 * const apiResult = toApiValidationResult(feedResult);
 * // apiResult.errors = { title: ['Title is required'], price: ['Invalid price format'] }
 * ```
 */
export function toApiValidationResult(result: FeedValidationResult): ApiValidationResult {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};

  for (const error of result.errors) {
    if (!errors[error.field]) {
      errors[error.field] = [];
    }
    errors[error.field].push(error.error);
  }

  for (const warning of result.warnings) {
    if (!warnings[warning.field]) {
      warnings[warning.field] = [];
    }
    warnings[warning.field].push(warning.error);
  }

  return {
    isValid: result.valid,
    errors,
    warnings,
  };
}

/**
 * Validate a product and return API-compatible result
 *
 * This is a convenience function that combines validateFeedEntry with
 * toApiValidationResult for direct use in API code.
 *
 * @param openaiAutoFilled - Auto-filled OpenAI field values
 * @param feedEnableCheckout - Whether checkout is enabled for this feed
 * @param productContext - Optional context about product type (variation, etc.)
 * @returns API-compatible validation result
 */
export function validateProduct(
  openaiAutoFilled: Record<string, any>,
  feedEnableCheckout: boolean = false,
  productContext?: ProductValidationContext
): ApiValidationResult {
  const result = validateFeedEntry(openaiAutoFilled, { feedEnableCheckout, productContext });
  return toApiValidationResult(result);
}
