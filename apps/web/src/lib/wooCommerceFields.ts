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
  const lowerQuery = query.toLowerCase();
  return fields.filter(
    (field) =>
      field.label.toLowerCase().includes(lowerQuery) ||
      field.value.toLowerCase().includes(lowerQuery) ||
      field.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get field by value from a list of fields
 */
export function getWooField(fields: WooCommerceField[], value: string): WooCommerceField | undefined {
  return fields.find((f) => f.value === value);
}

/**
 * Extract field value from WooCommerce product raw JSON
 * Handles nested paths like "images[0].src", "meta_data._gtin", "dimensions.length"
 */
export function extractFieldValue(wooRawJson: any, fieldPath: string): any {
  // Debug logging for 'id' field only
  const shouldLog = fieldPath === 'id';

  if (shouldLog) {
    console.log('[extractFieldValue] Starting extraction:', {
      fieldPath,
      hasData: !!wooRawJson,
      dataKeys: wooRawJson ? Object.keys(wooRawJson).slice(0, 15) : [],
    });
  }

  if (!wooRawJson || !fieldPath) {
    if (shouldLog) console.log('[extractFieldValue] No data or path');
    return null;
  }

  // Handle shop-level fields (these won't be in wooRawJson)
  if (fieldPath.startsWith('shop.')) {
    if (shouldLog) console.log('[extractFieldValue] Shop field, returning null');
    return null; // Shop fields are not in product data
  }

  try {
    // Handle meta_data special case
    if (fieldPath.startsWith('meta_data.')) {
      const metaKey = fieldPath.replace('meta_data.', '');
      const metaData = wooRawJson.meta_data || [];
      const metaItem = metaData.find((m: any) => m.key === metaKey);
      if (shouldLog) {
        console.log('[extractFieldValue] Meta data extraction:', {
          metaKey,
          hasMetaData: !!metaData.length,
          found: !!metaItem,
        });
      }
      return metaItem?.value || null;
    }

    // Handle array indexing like "images[0].src"
    const parts = fieldPath.split('.');
    let current = wooRawJson;

    if (shouldLog) {
      console.log('[extractFieldValue] Path traversal:', { parts, initialValue: current });
    }

    for (const part of parts) {
      if (!current) {
        if (shouldLog) console.log('[extractFieldValue] Current is null at part:', part);
        return null;
      }

      // Handle array index notation: "images[0]"
      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName]?.[parseInt(index)];
        if (shouldLog) {
          console.log('[extractFieldValue] Array access:', { arrayName, index, found: !!current });
        }
      } else {
        current = current[part];
        if (shouldLog) {
          console.log('[extractFieldValue] Property access:', { part, found: current !== undefined, value: current });
        }
      }
    }

    if (shouldLog) {
      console.log('[extractFieldValue] Final result:', { value: current });
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
