/**
 * Field Validators
 *
 * Individual validation functions for each OpenAI feed field type.
 * Each validator returns { valid: boolean, error?: string }
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate price format: "XX.XX CCC"
 * Must include 2 decimal places and ISO 4217 currency code
 */
export function validatePrice(value: any): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: true }; // Null is valid for optional fields
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Price must be a string' };
  }

  // Must match format: "79.99 USD"
  const priceRegex = /^\d+(\.\d{2})?\s[A-Z]{3}$/;
  if (!priceRegex.test(value)) {
    return {
      valid: false,
      error: `Invalid price format: "${value}". Expected format: "XX.XX CCC" (e.g., "79.99 USD")`,
    };
  }

  // Extract and validate currency code (ISO 4217)
  const currency = value.split(' ')[1];
  const validCurrencies = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN',
    'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
    'RUB', 'TRY', 'ZAR', 'NZD', 'SGD', 'HKD', 'KRW', 'THB', 'MYR', 'IDR',
    'PHP', 'VND', 'AED', 'SAR', 'EGP', 'NGN', 'KES', 'GHS', 'MAD', 'TND',
  ];

  if (!validCurrencies.includes(currency)) {
    return {
      valid: false,
      error: `Invalid currency code: "${currency}". Must be valid ISO 4217 code (e.g., USD, EUR, GBP)`,
    };
  }

  return { valid: true };
}

/**
 * Validate GTIN (barcode)
 * Must be 8-14 digits, no dashes or spaces
 */
export function validateGtin(value: any): ValidationResult {
  if (!value) return { valid: true }; // GTIN is optional

  if (typeof value !== 'string') {
    return { valid: false, error: 'GTIN must be a string' };
  }

  const cleaned = value.trim();

  // Must be 8-14 digits only
  if (!/^\d{8,14}$/.test(cleaned)) {
    return {
      valid: false,
      error: `Invalid GTIN: "${value}". Must be 8-14 digits with no dashes or spaces`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 * Must be valid URL, HTTPS preferred
 */
export function validateUrl(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true }; // URL might be optional

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  try {
    const url = new URL(value);

    // Check protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        valid: false,
        error: `${fieldName} must use HTTP or HTTPS protocol`,
      };
    }

    // Warn if not HTTPS (but still valid)
    if (url.protocol === 'http:') {
      return {
        valid: true,
        error: `Warning: ${fieldName} uses HTTP. HTTPS is preferred for security`,
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Invalid URL format for ${fieldName}: "${value}"`,
    };
  }
}

/**
 * Validate category path
 * Must use " > " separator
 */
export function validateCategoryPath(value: any): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Category path is required' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Category path must be a string' };
  }

  // Must use " > " separator
  if (!value.includes(' > ')) {
    return {
      valid: false,
      error: `Invalid category format: "${value}". Must use " > " separator (e.g., "Apparel > Shoes > Sneakers")`,
    };
  }

  // Check for common mistakes
  if (value.includes(' / ') || value.includes(' | ') || value.includes(',')) {
    return {
      valid: false,
      error: `Invalid separator in category: "${value}". Use " > " not " / ", " | ", or ","`,
    };
  }

  return { valid: true };
}

/**
 * Validate availability enum
 * Must be: in_stock, out_of_stock, or preorder
 */
export function validateAvailability(value: any): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Availability is required' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Availability must be a string' };
  }

  const validValues = ['in_stock', 'out_of_stock', 'preorder'];
  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid availability: "${value}". Must be one of: ${validValues.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate condition enum
 * Must be: new, refurbished, or used
 */
export function validateCondition(value: any): ValidationResult {
  if (!value) return { valid: true }; // Condition is optional, defaults to "new"

  if (typeof value !== 'string') {
    return { valid: false, error: 'Condition must be a string' };
  }

  const validValues = ['new', 'refurbished', 'used'];
  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid condition: "${value}". Must be one of: ${validValues.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate boolean enum (OpenAI uses string "true"/"false")
 * Must be lowercase string "true" or "false"
 */
export function validateBooleanEnum(value: any, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // OpenAI requires string, not boolean
  if (typeof value === 'boolean') {
    return {
      valid: false,
      error: `${fieldName} must be string "true" or "false", not boolean`,
    };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (value !== 'true' && value !== 'false') {
    return {
      valid: false,
      error: `${fieldName} must be lowercase string "true" or "false"`,
    };
  }

  return { valid: true };
}

/**
 * Validate dimensions format
 * Must be "LxWxH unit"
 */
export function validateDimensions(value: any): ValidationResult {
  if (!value) return { valid: true }; // Dimensions are optional

  if (typeof value !== 'string') {
    return { valid: false, error: 'Dimensions must be a string' };
  }

  // Must match format: "12x8x5 in"
  const dimensionsRegex = /^\d+\.?\d*x\d+\.?\d*x\d+\.?\d*\s\w+$/;
  if (!dimensionsRegex.test(value)) {
    return {
      valid: false,
      error: `Invalid dimensions format: "${value}". Expected format: "LxWxH unit" (e.g., "12x8x5 in")`,
    };
  }

  return { valid: true };
}

/**
 * Validate weight format
 * Must be "XX unit"
 */
export function validateWeight(value: any): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Weight is required' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Weight must be a string' };
  }

  // Must match format: "1.5 lb"
  const weightRegex = /^\d+\.?\d*\s\w+$/;
  if (!weightRegex.test(value)) {
    return {
      valid: false,
      error: `Invalid weight format: "${value}". Expected format: "XX unit" (e.g., "1.5 lb")`,
    };
  }

  return { valid: true };
}

/**
 * Validate date format
 * Must be ISO 8601: YYYY-MM-DD
 */
export function validateDate(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true }; // Date might be optional

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Must match format: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return {
      valid: false,
      error: `Invalid date format for ${fieldName}: "${value}". Expected format: YYYY-MM-DD`,
    };
  }

  // Validate it's a real date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: `Invalid date for ${fieldName}: "${value}". Not a valid date`,
    };
  }

  return { valid: true };
}

/**
 * Validate date range format
 * Must be "YYYY-MM-DD / YYYY-MM-DD"
 */
export function validateDateRange(value: any, fieldName: string): ValidationResult {
  if (!value) return { valid: true }; // Date range might be optional

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Must match format: "2025-07-01 / 2025-07-15"
  const parts = value.split(' / ');
  if (parts.length !== 2) {
    return {
      valid: false,
      error: `Invalid date range format for ${fieldName}: "${value}". Expected format: "YYYY-MM-DD / YYYY-MM-DD"`,
    };
  }

  // Validate both dates
  const startValidation = validateDate(parts[0], `${fieldName} start date`);
  if (!startValidation.valid) return startValidation;

  const endValidation = validateDate(parts[1], `${fieldName} end date`);
  if (!endValidation.valid) return endValidation;

  // Ensure start is before end
  const startDate = new Date(parts[0]);
  const endDate = new Date(parts[1]);
  if (startDate >= endDate) {
    return {
      valid: false,
      error: `${fieldName} start date must be before end date`,
    };
  }

  return { valid: true };
}

/**
 * Validate string length
 * Accepts both strings and numbers (numbers are coerced to strings for alphanumeric fields)
 */
export function validateStringLength(
  value: any,
  fieldName: string,
  maxLength: number
): ValidationResult {
  if (!value && value !== 0) return { valid: true }; // Empty is valid for optional fields

  // Coerce numbers to strings (e.g., WooCommerce product IDs are often numeric)
  const stringValue = typeof value === 'number' ? String(value) : value;

  if (typeof stringValue !== 'string') {
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
 * Validate number is positive
 */
export function validatePositiveNumber(value: any, fieldName: string): ValidationResult {
  if (value === null || value === undefined) return { valid: true };

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (num < 0) {
    return {
      valid: false,
      error: `${fieldName} must be a positive number`,
    };
  }

  return { valid: true };
}
