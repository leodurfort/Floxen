/**
 * Transform Helper Functions
 *
 * Utility functions for extracting and manipulating WooCommerce product data.
 * Used by transform functions to access nested data structures.
 */

/**
 * Extract nested value from object using dot notation
 *
 * Handles complex paths including arrays and nested objects.
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
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return null;

    // Handle array indexing (e.g., images[0])
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      current = current[arrayKey]?.[parseInt(index)];
    } else {
      current = current[key];
    }
  }

  return current;
}

/**
 * Extract attribute value by name (case-insensitive)
 *
 * IMPORTANT: Handles both parent products and variations
 * - Parent products: attributes have "options" array (e.g., ["Red", "Blue"])
 * - Variations: attributes have "option" string (e.g., "Red")
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
  if (!wooProduct.attributes || !Array.isArray(wooProduct.attributes)) {
    return null;
  }

  const attr = wooProduct.attributes.find((a: any) =>
    a.name.toLowerCase() === attributeName.toLowerCase() ||
    a.name.toLowerCase() === `pa_${attributeName.toLowerCase()}`
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

/**
 * Extract meta_data value by key
 *
 * WooCommerce stores custom fields in a meta_data array.
 * This helper finds the value for a specific meta key.
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
  if (!wooProduct.meta_data || !Array.isArray(wooProduct.meta_data)) {
    return null;
  }

  const meta = wooProduct.meta_data.find((m: any) => m.key === metaKey);
  return meta?.value || null;
}
