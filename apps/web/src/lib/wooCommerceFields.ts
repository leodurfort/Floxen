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

    const result = current !== undefined ? current : null;

    // Debug logging for problematic fields
    if (fieldPath === 'id' || fieldPath === 'parent_id') {
      console.log(`[extractFieldValue] ${fieldPath}:`, {
        fieldPath,
        result,
        wooRawJsonKeys: Object.keys(wooRawJson).slice(0, 20),
        hasId: 'id' in wooRawJson,
        hasParentId: 'parent_id' in wooRawJson,
        actualId: wooRawJson.id,
        actualParentId: wooRawJson.parent_id,
      });
    }

    return result;
  } catch (err) {
    console.error('[extractFieldValue] Error extracting field', { fieldPath, err });
    return null;
  }
}

/**
 * Lightweight transform registry for client-side preview.
 * Mirrors server transforms where possible; fallbacks to raw values when required data is missing.
 */
const PREVIEW_TRANSFORMS: Record<string, (value: any, wooProduct: any, shopData?: Record<string, any> | null) => any> = {
  generateStableId: (_, wooProduct, shopData) => {
    if (!shopData?.id || !wooProduct?.id) return null;
    const sku = wooProduct.sku || '';
    return `${shopData.id}-${wooProduct.id}${sku ? `-${sku}` : ''}`;
  },
  stripHtml: (value) => {
    if (!value) return '';
    return String(value).replace(/<[^>]*>/g, '').trim();
  },
  buildCategoryPath: (categories) => {
    if (!Array.isArray(categories) || categories.length === 0) return '';
    return categories.map((cat: any) => cat?.name).filter(Boolean).join(' > ');
  },
  extractGtin: (metaData) => {
    if (!Array.isArray(metaData)) return null;
    const gtinKeys = ['_gtin', 'gtin', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'];
    const match = metaData.find((m: any) => m && gtinKeys.includes(m.key));
    return match?.value || null;
  },
  formatPriceWithCurrency: (price, _wooProduct, shopData) => {
    if (price === undefined || price === null) return null;
    const num = typeof price === 'string' ? parseFloat(price) : Number(price);
    if (Number.isNaN(num)) return null;
    const currency = shopData?.shopCurrency || '';
    return currency ? `${num.toFixed(2)} ${currency}` : num.toFixed(2);
  },
  mapStockStatus: (stockStatus) => {
    const map: Record<string, string> = { instock: 'in_stock', outofstock: 'out_of_stock', onbackorder: 'preorder' };
    return map[stockStatus] || 'in_stock';
  },
  formatDimensions: (dimensions) => {
    if (!dimensions) return null;
    const { length, width, height } = dimensions;
    if (!length || !width || !height) return null;
    const unit = dimensions.unit || 'in';
    return `${length}x${width}x${height} ${unit}`;
  },
  addUnit: (value, wooProduct) => {
    if (!value) return null;
    const dimensions = wooProduct?.dimensions || {};
    const { length, width, height, unit = 'in' } = dimensions;
    const filled = [length, width, height].filter((d) => d && d !== '0' && d !== 0).length;
    if (filled > 0 && filled < 3) return null;
    if (filled === 3) return `${value} ${unit}`;
    return null;
  },
  addWeightUnit: (weight) => {
    if (!weight) return null;
    return `${weight} lb`;
  },
  extractAdditionalImages: (images) => {
    if (!Array.isArray(images) || images.length <= 1) return [];
    return images.slice(1).map((img: any) => img?.src).filter(Boolean);
  },
  extractBrand: (brands, wooProduct) => {
    if (Array.isArray(brands) && brands.length > 0) {
      return brands[0]?.name || null;
    }
    const brandAttr = wooProduct?.attributes?.find((a: any) => a?.name?.toLowerCase() === 'brand');
    return brandAttr?.options?.[0] || null;
  },
  defaultToNew: (value) => value || 'new',
  defaultToZero: (value) => (value ?? 0),
  formatSaleDateRange: (_value, wooProduct) => {
    const from = wooProduct?.date_on_sale_from;
    const to = wooProduct?.date_on_sale_to;
    if (!from || !to) return null;
    const fromDate = new Date(from).toISOString().split('T')[0];
    const toDate = new Date(to).toISOString().split('T')[0];
    return `${fromDate} / ${toDate}`;
  },
  generateGroupId: (_value, wooProduct, shopData) => {
    console.log('[generateGroupId] Called with:', {
      hasShopData: !!shopData,
      shopDataId: shopData?.id,
      hasWooProduct: !!wooProduct,
      wooProductId: wooProduct?.id,
      parentId: wooProduct?.parent_id,
    });

    if (!shopData?.id || !wooProduct) {
      console.log('[generateGroupId] Returning null - missing shopData.id or wooProduct');
      return null;
    }
    const parentId = wooProduct.parent_id;
    const result = parentId && parentId > 0 ? `${shopData.id}-${parentId}` : `${shopData.id}-${wooProduct.id}`;
    console.log('[generateGroupId] Result:', result);
    return result;
  },
  generateOfferId: (value, wooProduct) => {
    const baseSku = value || `prod-${wooProduct?.id}`;
    const color = wooProduct?.attributes?.find((a: any) => a?.name?.toLowerCase() === 'color')?.options?.[0];
    const size = wooProduct?.attributes?.find((a: any) => a?.name?.toLowerCase() === 'size')?.options?.[0];
    let offerId = baseSku;
    if (color) offerId += `-${color}`;
    if (size) offerId += `-${size}`;
    return offerId;
  },
  extractCustomVariant: (attributes) => {
    if (!Array.isArray(attributes) || attributes.length === 0) return null;
    return attributes[0]?.name || null;
  },
  extractCustomVariantOption: (attributes) => {
    if (!Array.isArray(attributes) || attributes.length === 0) return null;
    return attributes[0]?.options?.[0] || null;
  },
  buildShippingString: () => null,
};

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
  if ((value === null || value === undefined) && matchesDefault && effectiveMapping.fallback) {
    value = extractFieldValue(wooRawJson, effectiveMapping.fallback, shopData);
  }

  const transformName = effectiveMapping.transform;
  if (transformName && PREVIEW_TRANSFORMS[transformName]) {
    try {
      value = PREVIEW_TRANSFORMS[transformName](value, wooRawJson, shopData);
    } catch (err) {
      console.error('[extractTransformedPreviewValue] transform failed', { transformName, err });
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
