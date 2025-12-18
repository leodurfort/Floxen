/**
 * WooCommerce Fields - Type Definitions and Helper Functions
 *
 * NOTE: This file no longer contains hardcoded fields.
 * Fields are now fetched dynamically from the API which returns:
 * - Standard WooCommerce REST API fields (from database seed)
 * - Shop-specific discovered meta_data fields
 * - Shop-level fields (seller info, return policy, etc.)
 */

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
 * Extract field value from WooCommerce product raw JSON or shop data
 * Handles nested paths like "images[0].src", "meta_data._gtin", "dimensions.length"
 * Also handles shop-level fields like "shop.sellerName"
 */
export function extractFieldValue(
  wooRawJson: Record<string, any> | null | undefined,
  fieldPath: string,
  shopData?: Record<string, any> | null
): any {
  if (!fieldPath || typeof fieldPath !== 'string') return null;

  // Shop-level fields are read from shopData, not WooCommerce product JSON
  if (fieldPath.startsWith('shop.')) {
    const shopFieldName = fieldPath.replace('shop.', '');
    return shopData?.[shopFieldName] ?? null;
  }

  if (!wooRawJson) return null;

  try {
    // Handle meta_data special case
    if (fieldPath.startsWith('meta_data.')) {
      const metaKey = fieldPath.replace('meta_data.', '');
      const metaData = Array.isArray(wooRawJson.meta_data) ? wooRawJson.meta_data : [];
      const metaItem = metaData.find((m: any) => m && m.key === metaKey);
      return metaItem?.value || null;
    }

    // Handle attributes special case: "attributes.Color"
    // IMPORTANT: Parent products have "options" array, variations have "option" string
    if (fieldPath.startsWith('attributes.')) {
      const attrName = fieldPath.replace('attributes.', '');
      // API returns normalized wooAttributes field
      const attributes = Array.isArray(wooRawJson.wooAttributes) ? wooRawJson.wooAttributes : [];

      // Find attribute by name (case-insensitive)
      const attr = attributes.find((a: any) =>
        a.name && a.name.toLowerCase() === attrName.toLowerCase()
      );

      if (!attr) return null;

      // For variations: check "option" (singular string)
      if (attr.option !== undefined && attr.option !== null) {
        return attr.option;
      }

      // For parent products: check "options" (array)
      if (Array.isArray(attr.options) && attr.options.length > 0) {
        return attr.options.length === 1 ? attr.options[0] : attr.options.join(', ');
      }

      return null;
    }

    // Handle array indexing like "images[0].src"
    const parts = fieldPath.split('.');
    let current = wooRawJson;

    for (const part of parts) {
      if (current === null || current === undefined) return null;

      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        if (!Array.isArray((current as any)[arrayName])) return null;
        current = (current as any)[arrayName]?.[parseInt(index, 10)];
        continue;
      }

      if (typeof current !== 'object') return null;
      current = (current as Record<string, any>)[part];
    }

    return current !== undefined ? current : null;
  } catch (err) {
    console.error('[extractFieldValue] Error extracting field', { fieldPath, err });
    return null;
  }
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
