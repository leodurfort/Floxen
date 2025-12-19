/**
 * Static Value Validator
 *
 * Validates static values entered by users for product-level field overrides.
 * Validates based on field's dataType and supportedValues from OPENAI_FEED_SPEC.
 */

import { OPENAI_FEED_SPEC } from '../openai-feed-spec';

export interface StaticValueValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a static value for a specific OpenAI field attribute
 */
export function validateStaticValue(
  attribute: string,
  value: string
): StaticValueValidationResult {
  // Find the spec for this field
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  if (!spec) {
    return { isValid: false, error: 'Unknown field attribute' };
  }

  // Empty values - check if required
  if (!value || value.trim() === '') {
    if (spec.requirement === 'Required') {
      return { isValid: false, error: 'This field is required' };
    }
    // Empty is OK for non-required fields
    return { isValid: true };
  }

  const trimmedValue = value.trim();

  // Validate based on dataType
  switch (spec.dataType) {
    case 'Enum':
      return validateEnum(trimmedValue, spec.supportedValues);

    case 'URL':
      return validateUrl(trimmedValue);

    case 'Number + currency':
      return validatePriceWithCurrency(trimmedValue);

    case 'Integer':
      return validateInteger(trimmedValue);

    case 'Number':
      return validateNumber(trimmedValue);

    case 'Date':
      return validateDate(trimmedValue);

    case 'Date range':
      return validateDateRange(trimmedValue);

    case 'Number + unit':
      return validateNumberWithUnit(trimmedValue);

    case 'String (alphanumeric)':
    case 'String (numeric)':
    case 'String (UTF-8 text)':
    case 'String':
    case 'Country code':
    case 'URL array':
      return validateString(trimmedValue, spec.validationRules);

    default:
      // For unknown types, just validate as string
      return validateString(trimmedValue, spec.validationRules);
  }
}

/**
 * Validate enum values against supported values
 */
function validateEnum(value: string, supportedValues: string | null): StaticValueValidationResult {
  if (!supportedValues) {
    return { isValid: true };
  }

  const allowed = supportedValues.split(',').map(s => s.trim().toLowerCase());
  const normalizedValue = value.toLowerCase();

  if (!allowed.includes(normalizedValue)) {
    return {
      isValid: false,
      error: `Must be one of: ${supportedValues}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
function validateUrl(value: string): StaticValueValidationResult {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, error: 'URL must use http or https protocol' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate price with currency (e.g., "79.99 USD")
 */
function validatePriceWithCurrency(value: string): StaticValueValidationResult {
  // Must match pattern: number + space + 3-letter currency code
  const priceRegex = /^\d+(\.\d{1,2})?\s+[A-Z]{3}$/;

  if (!priceRegex.test(value)) {
    return {
      isValid: false,
      error: 'Must be in format "79.99 USD" (number + ISO 4217 currency code)',
    };
  }

  // Validate the number is positive
  const numPart = parseFloat(value.split(' ')[0]);
  if (numPart < 0) {
    return { isValid: false, error: 'Price must be a positive number' };
  }

  return { isValid: true };
}

/**
 * Validate integer values
 */
function validateInteger(value: string): StaticValueValidationResult {
  const num = parseInt(value, 10);

  if (isNaN(num) || !Number.isInteger(num) || value !== num.toString()) {
    return { isValid: false, error: 'Must be a whole number' };
  }

  return { isValid: true };
}

/**
 * Validate number values
 */
function validateNumber(value: string): StaticValueValidationResult {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return { isValid: false, error: 'Must be a valid number' };
  }

  return { isValid: true };
}

/**
 * Validate ISO 8601 date format (YYYY-MM-DD)
 */
function validateDate(value: string): StaticValueValidationResult {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(value)) {
    return { isValid: false, error: 'Must be in ISO 8601 format (YYYY-MM-DD)' };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date' };
  }

  return { isValid: true };
}

/**
 * Validate date range format (YYYY-MM-DD / YYYY-MM-DD)
 */
function validateDateRange(value: string): StaticValueValidationResult {
  const parts = value.split('/').map(s => s.trim());

  if (parts.length !== 2) {
    return { isValid: false, error: 'Must be in format "YYYY-MM-DD / YYYY-MM-DD"' };
  }

  const [startResult, endResult] = parts.map(validateDate);

  if (!startResult.isValid) {
    return { isValid: false, error: `Start date: ${startResult.error}` };
  }

  if (!endResult.isValid) {
    return { isValid: false, error: `End date: ${endResult.error}` };
  }

  // Verify start is before end
  const startDate = new Date(parts[0]);
  const endDate = new Date(parts[1]);

  if (startDate > endDate) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  return { isValid: true };
}

/**
 * Validate number with unit (e.g., "10 mm", "1.5 lb")
 */
function validateNumberWithUnit(value: string): StaticValueValidationResult {
  const regex = /^\d+(\.\d+)?\s+\w+$/;

  if (!regex.test(value)) {
    return { isValid: false, error: 'Must be in format "10 mm" (number + unit)' };
  }

  const numPart = parseFloat(value.split(' ')[0]);
  if (isNaN(numPart) || numPart < 0) {
    return { isValid: false, error: 'Must be a positive number with unit' };
  }

  return { isValid: true };
}

/**
 * Validate string values based on validation rules
 */
function validateString(value: string, validationRules: string[]): StaticValueValidationResult {
  for (const rule of validationRules) {
    // Check for max length rules
    const maxLengthMatch = rule.match(/Max (\d+) characters/i);
    if (maxLengthMatch) {
      const maxLength = parseInt(maxLengthMatch[1], 10);
      if (value.length > maxLength) {
        return { isValid: false, error: `Maximum ${maxLength} characters allowed` };
      }
    }

    // Check for GTIN format (8-14 digits)
    if (rule.includes('8-14 digits')) {
      const digitOnly = value.replace(/\D/g, '');
      if (digitOnly.length < 8 || digitOnly.length > 14) {
        return { isValid: false, error: 'GTIN must be 8-14 digits' };
      }
    }
  }

  return { isValid: true };
}

/**
 * Get validation info for display in UI
 */
export function getValidationInfo(attribute: string): {
  dataType: string;
  supportedValues: string | null;
  validationRules: string[];
  example: string;
} | null {
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  if (!spec) return null;

  return {
    dataType: spec.dataType,
    supportedValues: spec.supportedValues,
    validationRules: spec.validationRules,
    example: spec.example,
  };
}
