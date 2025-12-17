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
 * Extract field value from WooCommerce product raw JSON or shop data
 * Handles nested paths like "images[0].src", "meta_data._gtin", "dimensions.length"
 * Also handles shop-level fields like "shop.sellerName"
 */
export function extractFieldValue(wooRawJson: any, fieldPath: string, shopData?: any): any {
  // Debug logging for 'id' and attribute fields
  const shouldLog = fieldPath === 'id' || fieldPath.startsWith('attributes.');

  if (shouldLog) {
    console.log('[extractFieldValue] Starting extraction:', {
      fieldPath,
      hasData: !!wooRawJson,
      dataKeys: wooRawJson ? Object.keys(wooRawJson).slice(0, 15) : [],
      hasWooAttributes: !!wooRawJson?.wooAttributes,
      wooAttributesCount: wooRawJson?.wooAttributes?.length || 0,
    });
  }

  if (!wooRawJson || !fieldPath) {
    if (shouldLog) console.log('[extractFieldValue] No data or path');
    return null;
  }

  // Handle shop-level fields (extract from shopData)
  if (fieldPath.startsWith('shop.')) {
    const shopFieldName = fieldPath.replace('shop.', '');
    const value = shopData?.[shopFieldName] || null;
    if (shouldLog) {
      console.log('[extractFieldValue] Shop field extraction:', {
        fieldPath,
        shopFieldName,
        hasShopData: !!shopData,
        value,
      });
    }
    return value;
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

    // Handle attributes special case: "attributes.Color"
    // IMPORTANT: Parent products have "options" array, variations have "option" string
    if (fieldPath.startsWith('attributes.')) {
      const attrName = fieldPath.replace('attributes.', '');
      // API returns normalized wooAttributes field
      const attributes = wooRawJson.wooAttributes || [];

      if (shouldLog) {
        console.log('[extractFieldValue] Attributes extraction:', {
          attrName,
          hasAttributes: !!attributes.length,
          availableAttributes: attributes.map((a: any) => a.name),
        });
      }

      // Find attribute by name (case-insensitive)
      const attr = attributes.find((a: any) =>
        a.name && a.name.toLowerCase() === attrName.toLowerCase()
      );

      if (!attr) {
        if (shouldLog) {
          console.log('[extractFieldValue] Attribute not found:', attrName);
        }
        return null;
      }

      // For variations: check "option" (singular string)
      if (attr.option !== undefined && attr.option !== null) {
        if (shouldLog) {
          console.log('[extractFieldValue] Variation attribute found:', {
            attrName,
            option: attr.option,
          });
        }
        return attr.option;
      }

      // For parent products: check "options" (array)
      if (Array.isArray(attr.options) && attr.options.length > 0) {
        const result = attr.options.length === 1
          ? attr.options[0]
          : attr.options.join(', ');

        if (shouldLog) {
          console.log('[extractFieldValue] Parent attribute found:', {
            attrName,
            options: attr.options,
            result,
          });
        }

        return result;
      }

      if (shouldLog) {
        console.log('[extractFieldValue] Attribute has no value:', { attr });
      }

      return null;
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
