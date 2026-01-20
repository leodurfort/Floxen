/**
 * WooCommerce Fields - Type Definitions and Helper Functions
 *
 * NOTE: This file no longer contains hardcoded fields.
 * Fields are now fetched dynamically from the API which returns:
 * - Standard WooCommerce REST API fields (from database seed)
 * - Shop-specific discovered meta_data fields
 * - Shop-level fields (seller info, return policy, etc.)
 */

import { TRANSFORMS, extractFieldValue } from '@floxen/shared';

// Re-export extractFieldValue from shared package for convenience
export { extractFieldValue };

export interface WooCommerceField {
  value: string;           // Field path (e.g., "name", "meta_data._gtin", "shop.sellerName")
  label: string;           // Display name
  category: string;        // Grouping category
  description?: string;    // Field description
}

/**
 * Search and filter WooCommerce fields
 */
export function searchWooFields(fields: WooCommerceField[], query: string): WooCommerceField[] {
  const lowerQuery = query?.trim().toLowerCase();
  if (!lowerQuery) return fields;

  return fields.filter((field) => {
    const haystacks = [field.label, field.value, field.description].filter(
      (val): val is string => typeof val === 'string'
    );

    return haystacks.some((value) => value.toLowerCase().includes(lowerQuery));
  });
}

/**
 * Get field by value from a list of fields
 */
export function getWooField(fields: WooCommerceField[], value: string): WooCommerceField | undefined {
  return fields.find((f) => f.value === value);
}

/**
 * Transform registry for client-side preview.
 * Now imported from shared package - single source of truth for all transforms.
 */
const PREVIEW_TRANSFORMS = TRANSFORMS;

/**
 * Extract and transform a value for preview using the OpenAI spec mapping.
 */
export function extractTransformedPreviewValue(
  spec: { attribute: string; wooCommerceMapping: { field?: string; fallback?: string; transform?: string; shopField?: string } | null },
  mappingPath: string | null,
  wooRawJson: Record<string, any> | null | undefined,
  shopData?: Record<string, any> | null,
): any {
  if (!mappingPath) return null;

  const specMapping = spec.wooCommerceMapping;
  const matchesDefault = !!specMapping && specMapping.field === mappingPath;
  const effectiveMapping = matchesDefault && specMapping
    ? specMapping
    : { field: mappingPath };

  // Shop-level field shortcut
  const primaryValue = effectiveMapping.shopField
    ? shopData?.[effectiveMapping.shopField] ?? null
    : extractFieldValue(wooRawJson, effectiveMapping.field || '', shopData);

  let value = primaryValue;

  // Apply fallback only for default mappings
  // Empty string is also considered "no value" for fallback purposes
  if ((value === null || value === undefined || value === '') && matchesDefault && effectiveMapping.fallback) {
    value = extractFieldValue(wooRawJson, effectiveMapping.fallback, shopData);
  }

  const transformName = effectiveMapping.transform;
  if (transformName && PREVIEW_TRANSFORMS[transformName]) {
    try {
      value = PREVIEW_TRANSFORMS[transformName](value, wooRawJson, shopData || {});
    } catch {
      value = null;
    }
  }

  return value;
}

/**
 * Format a field value for display
 * Handles complex types (arrays, objects) and primitives
 */
export function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    // If array is empty
    if (value.length === 0) return '[]';

    // If array of simple values
    if (typeof value[0] !== 'object') {
      return value.join(', ');
    }

    // If array of objects, show JSON
    return JSON.stringify(value, null, 2);
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Handle primitives
  return String(value);
}
