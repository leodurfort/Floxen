/**
 * ValidationService
 *
 * Validates all 63 OpenAI feed fields against specification rules.
 * Checks: required fields, character limits, enum values, URL formats, etc.
 */

import { OPENAI_FEED_SPEC, OpenAIFieldSpec, REQUIRED_FIELDS } from '../config/openai-feed-spec';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>; // field -> error messages
  warnings: Record<string, string[]>; // field -> warning messages
}

export interface EffectiveValues {
  [attribute: string]: any;
}

export class ValidationService {

  /**
   * Validate all OpenAI fields for a product
   * Computes effective values and validates each field
   */
  validateProduct(
    openaiAutoFilled: Record<string, any>,
    openaiEdited: Record<string, any>,
    aiValues: { aiTitle?: string; aiDescription?: string; aiCategory?: string; aiQAndA?: any },
    selectedSources: Record<string, 'ai' | 'woo'>,
    feedEnableCheckout: boolean = false
  ): ValidationResult {

    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Compute effective values (what will actually be in the feed)
    const effectiveValues = this.computeEffectiveValues(
      openaiAutoFilled,
      openaiEdited,
      aiValues,
      selectedSources
    );

    // Validate each field
    for (const spec of OPENAI_FEED_SPEC) {
      const value = effectiveValues[spec.attribute];
      const fieldErrors: string[] = [];
      const fieldWarnings: string[] = [];

      // Required field check
      if (spec.requirement === 'Required' && !this.hasValue(value)) {
        fieldErrors.push(`${spec.attribute} is required`);
      }

      // Conditional requirement check (e.g., seller_privacy_policy required if enable_checkout is true)
      if (spec.requirement === 'Conditional' && spec.dependencies) {
        const conditionMet = this.checkConditionalRequirement(
          spec,
          effectiveValues,
          feedEnableCheckout
        );
        if (conditionMet && !this.hasValue(value)) {
          fieldErrors.push(`${spec.attribute} is required: ${spec.dependencies}`);
        }
      }

      // Skip remaining validation if field is empty and not required
      if (!this.hasValue(value)) {
        if (spec.requirement === 'Recommended') {
          fieldWarnings.push(`${spec.attribute} is recommended but missing`);
        }

        // Store errors/warnings if any
        if (fieldErrors.length > 0) errors[spec.attribute] = fieldErrors;
        if (fieldWarnings.length > 0) warnings[spec.attribute] = fieldWarnings;
        continue;
      }

      // Special validation for availability_date
      if (spec.attribute === 'availability_date') {
        const availability = effectiveValues['availability'];
        if (availability !== 'preorder' && this.hasValue(value)) {
          fieldErrors.push('availability_date must be null when availability is not "preorder"');
        }
      }

      // Apply validation rules
      for (const rule of spec.validationRules) {
        const error = this.applyValidationRule(rule, value, spec);
        if (error) fieldErrors.push(error);
      }

      // Store errors/warnings if any
      if (fieldErrors.length > 0) errors[spec.attribute] = fieldErrors;
      if (fieldWarnings.length > 0) warnings[spec.attribute] = fieldWarnings;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if value exists (not null, undefined, empty string, or empty array)
   */
  private hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  /**
   * Check conditional requirements
   */
  private checkConditionalRequirement(
    spec: OpenAIFieldSpec,
    effectiveValues: EffectiveValues,
    feedEnableCheckout: boolean
  ): boolean {
    const deps = spec.dependencies || '';

    // Special case: checkout-related requirements
    if (deps.includes('enable_checkout')) {
      return feedEnableCheckout;
    }

    // GTIN/MPN dependency: mpn required if gtin is filled
    if (spec.attribute === 'mpn' && deps.includes('gtin')) {
      return this.hasValue(effectiveValues['gtin']);
    }

    // Availability date required if availability = preorder
    if (spec.attribute === 'availability_date' && deps.includes('availability')) {
      return effectiveValues['availability'] === 'preorder';
    }

    // Item group ID required if variants exist
    if (spec.attribute === 'item_group_id' && deps.includes('variants')) {
      // This would need variant detection logic
      return false; // For now, assume no variants
    }

    return false;
  }

  /**
   * Apply a single validation rule
   */
  private applyValidationRule(
    rule: string,
    value: any,
    spec: OpenAIFieldSpec
  ): string | null {

    // Max character rules
    if (rule.includes('Max') && rule.includes('characters')) {
      const match = rule.match(/Max (\d+) characters/);
      if (match) {
        const max = parseInt(match[1]);
        if (typeof value === 'string' && value.length > max) {
          return `Exceeds maximum ${max} characters (currently ${value.length})`;
        }
      }
    }

    // Enum validation
    if (spec.dataType === 'Enum' && spec.supportedValues) {
      const allowed = spec.supportedValues.split(',').map(v => v.trim());
      if (!allowed.includes(value)) {
        return `Must be one of: ${spec.supportedValues}`;
      }
    }

    // URL validation
    if (spec.dataType === 'URL' || spec.dataType.includes('URL')) {
      try {
        const url = new URL(value);
        // Check HTTPS preference
        if (rule.includes('HTTPS') && url.protocol !== 'https:') {
          // This is a warning, not an error
          return null;
        }
      } catch {
        return 'Invalid URL format';
      }
    }

    // Number validation
    if (spec.dataType.includes('Number') || spec.dataType === 'Integer') {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) {
        return 'Must be a valid number';
      }

      // Non-negative integer check
      if (rule.includes('Non-negative') && num < 0) {
        return 'Must be non-negative';
      }

      // Positive number check
      if (rule.includes('Positive') && num <= 0) {
        return 'Must be positive';
      }
    }

    // GTIN digit validation
    if (rule.includes('8-14 digits')) {
      const digitStr = value.toString().replace(/[^0-9]/g, '');
      if (digitStr.length < 8 || digitStr.length > 14) {
        return 'GTIN must be 8-14 digits';
      }
    }

    // No dashes or spaces
    if (rule.includes('No dashes or spaces')) {
      if (typeof value === 'string' && /[\s-]/.test(value)) {
        return 'Must not contain dashes or spaces';
      }
    }

    // ALL CAPS check
    if (rule.includes('ALL CAPS')) {
      if (typeof value === 'string' && value === value.toUpperCase() && value.length > 3) {
        return 'Avoid using ALL CAPS';
      }
    }

    // Plain text only (no HTML)
    if (rule.includes('Plain text') || rule.includes('no HTML')) {
      if (typeof value === 'string' && /<[^>]+>/.test(value)) {
        return 'Must be plain text (no HTML tags)';
      }
    }

    // ISO 4217 currency code check
    if (rule.includes('ISO 4217')) {
      if (typeof value === 'string') {
        // Check for format: "number currency_code" or "number.decimal currency_code"
        // Examples: "79.99 USD", "100 EUR", "50.00 GBP"
        const priceWithCurrencyRegex = /^\d+(\.\d{1,2})?\s+[A-Z]{3}$/;
        if (!priceWithCurrencyRegex.test(value.trim())) {
          return 'Must be in format: "amount CURRENCY" (e.g., "79.99 USD", "100 EUR")';
        }
      }
    }

    // ISO 8601 date format
    if (rule.includes('ISO 8601')) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}/;
      if (typeof value === 'string' && !dateRegex.test(value)) {
        return 'Must be ISO 8601 date format (YYYY-MM-DD)';
      }
    }

    // Future date check
    if (rule.includes('future date')) {
      const date = new Date(value);
      if (date <= new Date()) {
        return 'Must be a future date';
      }
    }

    // Availability date must be null if availability is not preorder
    if (rule.includes('Must be null if availability is not preorder')) {
      // This needs context from effectiveValues - will be handled in validateProduct
      return null;
    }

    // Sale price must be ≤ regular price
    if (rule.includes('≤ price')) {
      // This needs context of the regular price - skip for now
      return null;
    }

    // Rating scale (0-5)
    if (rule.includes('0-5 scale')) {
      const num = parseFloat(value);
      if (num < 0 || num > 5) {
        return 'Must be between 0 and 5';
      }
    }

    return null;
  }

  /**
   * Compute effective values (resolved from auto-fill, edited, and AI)
   */
  private computeEffectiveValues(
    openaiAutoFilled: Record<string, any>,
    openaiEdited: Record<string, any>,
    aiValues: { aiTitle?: string; aiDescription?: string; aiCategory?: string; aiQAndA?: any },
    selectedSources: Record<string, 'ai' | 'woo'>
  ): EffectiveValues {

    const effective: EffectiveValues = {};

    // Map AI values to OpenAI attribute names
    const aiValuesMap: Record<string, any> = {
      'title': aiValues.aiTitle,
      'description': aiValues.aiDescription,
      'product_category': aiValues.aiCategory,
      'q_and_a': aiValues.aiQAndA,
    };

    for (const spec of OPENAI_FEED_SPEC) {
      const attr = spec.attribute;

      // For AI-enrichable fields, check selectedSource
      if (spec.isAiEnrichable) {
        const source = selectedSources[attr] || 'woo';
        if (source === 'ai' && this.hasValue(aiValuesMap[attr])) {
          effective[attr] = aiValuesMap[attr];
        } else {
          // Use edited value if exists, otherwise auto-filled
          effective[attr] = openaiEdited[attr] ?? openaiAutoFilled[attr];
        }
      } else {
        // For non-enrichable fields, edited takes priority
        effective[attr] = openaiEdited[attr] ?? openaiAutoFilled[attr];
      }
    }

    return effective;
  }

  /**
   * Validate a single field (useful for real-time validation)
   */
  validateField(spec: OpenAIFieldSpec, value: any): string[] {
    const errors: string[] = [];

    // Required check
    if (spec.requirement === 'Required' && !this.hasValue(value)) {
      errors.push(`${spec.attribute} is required`);
      return errors;
    }

    // Skip validation if empty and optional
    if (!this.hasValue(value)) return errors;

    // Apply validation rules
    for (const rule of spec.validationRules) {
      const error = this.applyValidationRule(rule, value, spec);
      if (error) errors.push(error);
    }

    return errors;
  }
}
