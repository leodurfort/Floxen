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
 * Validation options
 */
export interface ValidationOptions {
  /** Skip validation for specific fields */
  skipFields?: string[];
  /** Treat warnings as errors */
  strictMode?: boolean;
  /** Validate optional fields */
  validateOptional?: boolean;
}

/**
 * Validate a single field value based on OpenAI spec
 */
function validateFieldValue(
  spec: OpenAIFieldSpec,
  value: any
): ValidationResult {
  const { attribute, dataType, requirement, validationRules } = spec;

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
      return validateStringLength(value, attribute, 70);
    case 'item_group_id':
      return validateStringLength(value, attribute, 70);
    case 'color':
      return validateStringLength(value, attribute, 40);
    case 'size':
      return validateStringLength(value, attribute, 20);
    case 'material':
      return validateStringLength(value, attribute, 100);
    case 'id':
      return validateStringLength(value, attribute, 100);

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
  const { skipFields = [], strictMode = false, validateOptional = true } = options;

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
