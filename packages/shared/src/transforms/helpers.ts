/**
 * Transform Helper Functions
 *
 * Utilities for extracting values from WooCommerce product data structures.
 */

/**
 * Extract field value from WooCommerce product or shop data.
 *
 * Supported path types:
 * - Shop-level: "shop.sellerName"
 * - Meta data: "meta_data._gtin"
 * - Attributes: "attributes.Color"
 * - Nested: "dimensions.length"
 * - Array index: "images[0].src"
 */
export function extractFieldValue(
  wooRawJson: Record<string, any> | null | undefined,
  fieldPath: string,
  shopData?: Record<string, any> | null
): any {
  if (!fieldPath || typeof fieldPath !== 'string') return null;

  if (fieldPath.startsWith('shop.')) {
    return shopData?.[fieldPath.slice(5)] ?? null;
  }

  if (!wooRawJson) return null;

  try {
    if (fieldPath.startsWith('meta_data.')) {
      const metaKey = fieldPath.slice(10);
      const metaData = Array.isArray(wooRawJson.meta_data) ? wooRawJson.meta_data : [];
      return metaData.find((m: any) => m?.key === metaKey)?.value || null;
    }

    if (fieldPath.startsWith('attributes.')) {
      return extractAttributeByName(wooRawJson, fieldPath.slice(11));
    }

    return extractByPath(wooRawJson, fieldPath);
  } catch (err) {
    console.error('[extractFieldValue] Error extracting field', { fieldPath, err });
    return null;
  }
}

function extractAttributeByName(wooRawJson: Record<string, any>, attrName: string): any {
  const attributes = wooRawJson.wooAttributes ?? wooRawJson.attributes ?? [];
  if (!Array.isArray(attributes)) return null;

  const attr = attributes.find((a: any) =>
    a?.name?.toLowerCase() === attrName.toLowerCase()
  );
  if (!attr) return null;

  // Variations have "option" string, parent products have "options" array
  if (attr.option !== undefined && attr.option !== null) return attr.option;
  if (Array.isArray(attr.options) && attr.options.length > 0) {
    return attr.options.length === 1 ? attr.options[0] : attr.options.join(', ');
  }
  return null;
}

function extractByPath(obj: any, path: string): any {
  let current = obj;

  for (const part of path.split('.')) {
    if (current === null || current === undefined) return null;

    const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      if (!Array.isArray(current[arrayName])) return null;
      current = current[arrayName]?.[parseInt(index, 10)];
      continue;
    }

    if (typeof current !== 'object') return null;
    current = current[part];
  }

  return current ?? null;
}
