/**
 * Static Value Validator
 *
 * Validates static values for product-level field overrides based on OPENAI_FEED_SPEC.
 */

import { OPENAI_FEED_SPEC } from '../openai-feed-spec';

export interface StaticValueValidationResult {
  isValid: boolean;
  error?: string;
}

const DATA_TYPE_VALIDATORS: Record<string, (value: string, rules: string[], supported: string | null) => StaticValueValidationResult> = {
  'Enum': (v, _, s) => validateEnum(v, s),
  'URL': (v) => validateUrl(v),
  'Number + currency': (v) => validatePriceWithCurrency(v),
  'Integer': (v) => validateInteger(v),
  'Number': (v) => validateNumber(v),
  'Date': (v) => validateDate(v),
  'Date range': (v) => validateDateRange(v),
  'Number + unit': (v) => validateNumberWithUnit(v),
  'String (alphanumeric)': (v, r) => validateAlphanumericString(v, r),
};

const STRING_TYPES = new Set(['String (numeric)', 'String (UTF-8 text)', 'String', 'Country code', 'URL array']);

/**
 * Validate a static value for a specific OpenAI field attribute
 */
export function validateStaticValue(
  attribute: string,
  value: string
): StaticValueValidationResult {
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  if (!spec) {
    return { isValid: false, error: 'Unknown field attribute' };
  }

  if (!value || value.trim() === '') {
    return spec.requirement === 'Required'
      ? { isValid: false, error: 'This field is required' }
      : { isValid: true };
  }

  const trimmedValue = value.trim();
  const { dataType, validationRules, supportedValues } = spec;

  const validator = DATA_TYPE_VALIDATORS[dataType];
  if (validator) {
    return validator(trimmedValue, validationRules, supportedValues);
  }

  if (STRING_TYPES.has(dataType)) {
    return validateString(trimmedValue, validationRules);
  }

  return validateString(trimmedValue, validationRules);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PRICE_REGEX = /^\d+(\.\d{1,2})?\s+[A-Z]{3}$/;
const NUMBER_WITH_UNIT_REGEX = /^\d+(\.\d+)?\s+\w+$/;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\-_\s]+$/;

function validateEnum(value: string, supportedValues: string | null): StaticValueValidationResult {
  if (!supportedValues) return { isValid: true };

  const allowed = supportedValues.split(',').map(s => s.trim().toLowerCase());
  return allowed.includes(value.toLowerCase())
    ? { isValid: true }
    : { isValid: false, error: `Must be one of: ${supportedValues}` };
}

function validateUrl(value: string): StaticValueValidationResult {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      ? { isValid: true }
      : { isValid: false, error: 'URL must use http or https protocol' };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

function validatePriceWithCurrency(value: string): StaticValueValidationResult {
  if (!PRICE_REGEX.test(value)) {
    return { isValid: false, error: 'Must be in format "79.99 USD" (number + ISO 4217 currency code)' };
  }

  const numPart = parseFloat(value.split(' ')[0]);
  return numPart < 0
    ? { isValid: false, error: 'Price must be a positive number' }
    : { isValid: true };
}

function validateInteger(value: string): StaticValueValidationResult {
  const num = parseInt(value, 10);
  return isNaN(num) || !Number.isInteger(num) || value !== num.toString()
    ? { isValid: false, error: 'Must be a whole number' }
    : { isValid: true };
}

function validateNumber(value: string): StaticValueValidationResult {
  return isNaN(parseFloat(value))
    ? { isValid: false, error: 'Must be a valid number' }
    : { isValid: true };
}

function validateDate(value: string): StaticValueValidationResult {
  if (!DATE_REGEX.test(value)) {
    return { isValid: false, error: 'Must be in ISO 8601 format (YYYY-MM-DD)' };
  }
  return isNaN(new Date(value).getTime())
    ? { isValid: false, error: 'Invalid date' }
    : { isValid: true };
}

function validateDateRange(value: string): StaticValueValidationResult {
  const parts = value.split('/').map(s => s.trim());
  if (parts.length !== 2) {
    return { isValid: false, error: 'Must be in format "YYYY-MM-DD / YYYY-MM-DD"' };
  }

  const [startResult, endResult] = parts.map(validateDate);
  if (!startResult.isValid) return { isValid: false, error: `Start date: ${startResult.error}` };
  if (!endResult.isValid) return { isValid: false, error: `End date: ${endResult.error}` };

  return new Date(parts[0]) > new Date(parts[1])
    ? { isValid: false, error: 'Start date must be before end date' }
    : { isValid: true };
}

function validateNumberWithUnit(value: string): StaticValueValidationResult {
  if (!NUMBER_WITH_UNIT_REGEX.test(value)) {
    return { isValid: false, error: 'Must be in format "10 mm" (number + unit)' };
  }

  const numPart = parseFloat(value.split(' ')[0]);
  return isNaN(numPart) || numPart < 0
    ? { isValid: false, error: 'Must be a positive number with unit' }
    : { isValid: true };
}

function validateAlphanumericString(value: string, validationRules: string[]): StaticValueValidationResult {
  const stringResult = validateString(value, validationRules);
  if (!stringResult.isValid) return stringResult;

  return ALPHANUMERIC_REGEX.test(value)
    ? { isValid: true }
    : { isValid: false, error: 'Must be alphanumeric (letters, numbers, dashes, underscores only)' };
}

function validateString(value: string, validationRules: string[]): StaticValueValidationResult {
  for (const rule of validationRules) {
    const maxLengthMatch = rule.match(/Max (\d+) characters/i);
    if (maxLengthMatch) {
      const maxLength = parseInt(maxLengthMatch[1], 10);
      if (value.length > maxLength) {
        return { isValid: false, error: `Maximum ${maxLength} characters allowed` };
      }
    }

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
 * Get validation info for UI display
 */
export function getValidationInfo(attribute: string) {
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  return spec ? {
    dataType: spec.dataType,
    supportedValues: spec.supportedValues,
    validationRules: spec.validationRules,
    example: spec.example,
  } : null;
}
