/**
 * Field Validators
 *
 * Validation functions for OpenAI feed field types.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN',
  'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
  'RUB', 'TRY', 'ZAR', 'NZD', 'SGD', 'HKD', 'KRW', 'THB', 'MYR', 'IDR',
  'PHP', 'VND', 'AED', 'SAR', 'EGP', 'NGN', 'KES', 'GHS', 'MAD', 'TND',
]);

const PRICE_REGEX = /^\d+(\.\d{2})?\s[A-Z]{3}$/;

/**
 * Validate price format: "XX.XX CCC" (e.g., "79.99 USD")
 */
export function validatePrice(value: any): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: true };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Price must be a string' };
  }

  if (!PRICE_REGEX.test(value)) {
    return {
      valid: false,
      error: `Invalid price format: "${value}". Expected format: "XX.XX CCC" (e.g., "79.99 USD")`,
    };
  }

  const currency = value.split(' ')[1];
  if (!VALID_CURRENCIES.has(currency)) {
    return {
      valid: false,
      error: `Invalid currency code: "${currency}". Must be valid ISO 4217 code (e.g., USD, EUR, GBP)`,
    };
  }

  return { valid: true };
}

const GTIN_REGEX = /^\d{8,14}$/;

/**
 * Validate GTIN (barcode): 8-14 digits, no dashes or spaces
 */
export function validateGtin(value: any): ValidationResult {
  if (!value) return { valid: true };

  if (typeof value !== 'string') {
    return { valid: false, error: 'GTIN must be a string' };
  }

  if (!GTIN_REGEX.test(value.trim())) {
    return {
      valid: false,
      error: `Invalid GTIN: "${value}". Must be 8-14 digits with no dashes or spaces`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL format. HTTPS preferred.
 */
export function validateUrl(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true };

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: `${fieldName} must use HTTP or HTTPS protocol` };
    }

    if (url.protocol === 'http:') {
      return { valid: true, error: `Warning: ${fieldName} uses HTTP. HTTPS is preferred for security` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: `Invalid URL format for ${fieldName}: "${value}"` };
  }
}

const INVALID_CATEGORY_SEPARATORS = [' / ', ' | ', ','];

/**
 * Validate category path. Use " > " separator for hierarchical paths.
 */
export function validateCategoryPath(value: any): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Category path is required' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Category path must be a string' };
  }

  if (INVALID_CATEGORY_SEPARATORS.some(sep => value.includes(sep))) {
    return {
      valid: false,
      error: `Invalid separator in category: "${value}". Use " > " not " / ", " | ", or ","`,
    };
  }

  return { valid: true };
}

const VALID_AVAILABILITY = ['in_stock', 'out_of_stock', 'preorder'] as const;
const VALID_CONDITIONS = ['new', 'refurbished', 'used'] as const;

function validateEnumField(
  value: any,
  fieldName: string,
  validValues: readonly string[],
  required: boolean
): ValidationResult {
  if (!value) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid ${fieldName.toLowerCase()}: "${value}". Must be one of: ${validValues.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate availability enum: in_stock, out_of_stock, preorder
 */
export function validateAvailability(value: any): ValidationResult {
  return validateEnumField(value, 'Availability', VALID_AVAILABILITY, true);
}

/**
 * Validate condition enum: new, refurbished, used (optional, defaults to "new")
 */
export function validateCondition(value: any): ValidationResult {
  return validateEnumField(value, 'Condition', VALID_CONDITIONS, false);
}

/**
 * Validate boolean enum (OpenAI uses string "true"/"false", not boolean)
 */
export function validateBooleanEnum(value: any, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'boolean') {
    return { valid: false, error: `${fieldName} must be string "true" or "false", not boolean` };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (value !== 'true' && value !== 'false') {
    return { valid: false, error: `${fieldName} must be lowercase string "true" or "false"` };
  }

  return { valid: true };
}

const DIMENSIONS_REGEX = /^\d+\.?\d*x\d+\.?\d*x\d+\.?\d*\s\w+$/;
const WEIGHT_REGEX = /^\d+\.?\d*\s\w+$/;

/**
 * Validate dimensions format: "LxWxH unit" (e.g., "12x8x5 in")
 */
export function validateDimensions(value: any): ValidationResult {
  if (!value) return { valid: true };

  if (typeof value !== 'string') {
    return { valid: false, error: 'Dimensions must be a string' };
  }

  if (!DIMENSIONS_REGEX.test(value)) {
    return {
      valid: false,
      error: `Invalid dimensions format: "${value}". Expected format: "LxWxH unit" (e.g., "12x8x5 in")`,
    };
  }

  return { valid: true };
}

/**
 * Validate weight format: "XX unit" (e.g., "1.5 lb")
 */
export function validateWeight(value: any): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Weight is required' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Weight must be a string' };
  }

  if (!WEIGHT_REGEX.test(value)) {
    return {
      valid: false,
      error: `Invalid weight format: "${value}". Expected format: "XX unit" (e.g., "1.5 lb")`,
    };
  }

  return { valid: true };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate ISO 8601 date format: YYYY-MM-DD
 */
export function validateDate(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true };

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (!DATE_REGEX.test(value)) {
    return {
      valid: false,
      error: `Invalid date format for ${fieldName}: "${value}". Expected format: YYYY-MM-DD`,
    };
  }

  if (isNaN(new Date(value).getTime())) {
    return { valid: false, error: `Invalid date for ${fieldName}: "${value}". Not a valid date` };
  }

  return { valid: true };
}

/**
 * Validate date range format: "YYYY-MM-DD / YYYY-MM-DD"
 */
export function validateDateRange(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true };

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const parts = value.split(' / ');
  if (parts.length !== 2) {
    return {
      valid: false,
      error: `Invalid date range format for ${fieldName}: "${value}". Expected format: "YYYY-MM-DD / YYYY-MM-DD"`,
    };
  }

  const startValidation = validateDate(parts[0], `${fieldName} start date`);
  if (!startValidation.valid) return startValidation;

  const endValidation = validateDate(parts[1], `${fieldName} end date`);
  if (!endValidation.valid) return endValidation;

  if (new Date(parts[0]) >= new Date(parts[1])) {
    return { valid: false, error: `${fieldName} start date must be before end date` };
  }

  return { valid: true };
}

const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\-_\s]+$/;

function coerceToString(value: any): string | null {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return null;
}

/**
 * Validate string length. Accepts strings and numbers (coerced to strings).
 */
export function validateStringLength(
  value: any,
  fieldName: string,
  maxLength: number
): ValidationResult {
  if (!value && value !== 0) return { valid: true };

  const stringValue = coerceToString(value);
  if (stringValue === null) {
    return { valid: false, error: `${fieldName} must be a string or number` };
  }

  if (stringValue.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (current: ${stringValue.length})`,
    };
  }

  return { valid: true };
}

/**
 * Validate alphanumeric string (letters, numbers, dashes, underscores, spaces)
 */
export function validateAlphanumericString(
  value: any,
  fieldName: string,
  maxLength: number
): ValidationResult {
  if (!value && value !== 0) return { valid: true };

  const stringValue = coerceToString(value);
  if (stringValue === null) {
    return { valid: false, error: `${fieldName} must be a string or number` };
  }

  if (stringValue.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (current: ${stringValue.length})`,
    };
  }

  if (!ALPHANUMERIC_REGEX.test(stringValue)) {
    return {
      valid: false,
      error: `${fieldName} must be alphanumeric (letters, numbers, dashes, underscores only)`,
    };
  }

  return { valid: true };
}

/**
 * Validate positive number (non-negative)
 */
export function validatePositiveNumber(value: any, fieldName: string): ValidationResult {
  if (value === null || value === undefined) return { valid: true };

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (num < 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }

  return { valid: true };
}
