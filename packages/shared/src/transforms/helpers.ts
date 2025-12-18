/**
 * Transform Helper Functions
 *
 * Utility functions for extracting and manipulating WooCommerce product data.
 * Used by transform functions to access nested data structures.
 */

/**
 * Extract field value from WooCommerce product raw JSON or shop data
 *
 * This is the main extraction function that handles all path types:
 * - Shop-level fields: "shop.sellerName"
 * - Meta data fields: "meta_data._gtin"
 * - Attribute fields: "attributes.Color"
 * - Nested paths: "dimensions.length"
 * - Array indexing: "images[0].src"
 *
 * @param wooRawJson - WooCommerce product object
 * @param fieldPath - Field path to extract (e.g., "name", "meta_data._gtin", "attributes.Color")
 * @param shopData - Optional shop-level data for shop.* fields
 * @returns The extracted value or null if not found
 *
 * @example
 * extractFieldValue(product, "name") // "Product Name"
 * extractFieldValue(product, "meta_data._gtin") // "1234567890123"
 * extractFieldValue(product, "attributes.Color") // "Red"
 * extractFieldValue(product, "images[0].src") // "https://example.com/image.jpg"
 * extractFieldValue(product, "shop.sellerName", shopData) // "My Store"
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
      const attributes = Array.isArray(wooRawJson.wooAttributes) ? wooRawJson.wooAttributes :
                        Array.isArray(wooRawJson.attributes) ? wooRawJson.attributes : [];

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
 * Extract nested value from object using dot notation
 *
 * Handles complex paths including arrays and nested objects.
 * This is now a thin wrapper around extractFieldValue for backward compatibility.
 *
 * @param obj - The object to extract from (typically WooCommerce product)
 * @param path - Dot-notation path (e.g., "meta_data", "dimensions.length", "images[0].src")
 * @returns The extracted value or null if path not found
 *
 * @example
 * extractNestedValue(product, "dimensions.length") // "10"
 * extractNestedValue(product, "images[0].src") // "https://example.com/image.jpg"
 */
export function extractNestedValue(obj: any, path: string): any {
  return extractFieldValue(obj, path);
}

/**
 * Extract attribute value by name (case-insensitive)
 *
 * IMPORTANT: Handles both parent products and variations
 * - Parent products: attributes have "options" array (e.g., ["Red", "Blue"])
 * - Variations: attributes have "option" string (e.g., "Red")
 *
 * This is now a thin wrapper around extractFieldValue for backward compatibility.
 *
 * @param wooProduct - WooCommerce product object
 * @param attributeName - Attribute name to find (e.g., "color", "size")
 * @returns The attribute value or null if not found
 *
 * @example
 * extractAttributeValue(product, "color") // "Red"
 * extractAttributeValue(product, "size") // "Large"
 */
export function extractAttributeValue(wooProduct: any, attributeName: string): any {
  return extractFieldValue(wooProduct, `attributes.${attributeName}`);
}

/**
 * Extract meta_data value by key
 *
 * WooCommerce stores custom fields in a meta_data array.
 * This helper finds the value for a specific meta key.
 *
 * This is now a thin wrapper around extractFieldValue for backward compatibility.
 *
 * @param wooProduct - WooCommerce product object
 * @param metaKey - Meta key to find (e.g., "_gtin", "_custom_field")
 * @returns The meta value or null if not found
 *
 * @example
 * extractMetaValue(product, "_gtin") // "1234567890123"
 * extractMetaValue(product, "_custom_field") // "custom value"
 */
export function extractMetaValue(wooProduct: any, metaKey: string): any {
  return extractFieldValue(wooProduct, `meta_data.${metaKey}`);
}
