/**
 * Transform Functions Registry
 *
 * Contains all transformation logic to convert WooCommerce data to OpenAI feed format.
 * Each function takes WooCommerce data and returns the OpenAI-formatted value.
 * Updated: 2025-12-18
 */

import { Shop } from '@prisma/client';

/**
 * Transform function signature
 */
type TransformFunction = (value: any, wooProduct: any, shop: Shop) => any;

/**
 * Transform function registry
 * Maps transform function names to their implementations
 */
export const TRANSFORMS: Record<string, TransformFunction> = {

  /**
   * Generate stable product ID
   * Combines shop ID, WooCommerce product ID, and SKU for uniqueness
   */
  generateStableId: (_, wooProduct, shop) => {
    const sku = wooProduct.sku || '';
    return `${shop.id}-${wooProduct.id}${sku ? `-${sku}` : ''}`;
  },

  /**
   * Strip HTML tags from description
   */
  stripHtml: (value) => {
    if (!value) return '';
    return value.replace(/<[^>]*>/g, '').trim();
  },

  /**
   * Build category path with > separator, respecting parent-child hierarchy
   *
   * WooCommerce categories have a `parent` field (ID of parent category).
   * We need to build the full path from root to leaf: "Parent > Child > Grandchild"
   *
   * Algorithm:
   * 1. Create a map of all categories by ID
   * 2. For each category, recursively build path from root
   * 3. Return the deepest (most specific) category path
   */
  buildCategoryPath: (categories) => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return '';
    }

    // Create a map of category ID -> category object for quick lookup
    const categoryMap = new Map<number, any>();
    categories.forEach((cat: any) => {
      if (cat.id) categoryMap.set(cat.id, cat);
    });

    // Build full path for a category by traversing up to root
    const buildPath = (category: any): string[] => {
      const path: string[] = [];
      let current = category;

      // Traverse up the hierarchy (max 10 levels to prevent infinite loops)
      let depth = 0;
      while (current && depth < 10) {
        path.unshift(current.name); // Add to beginning of array

        // If has parent and parent exists in our map, continue up
        if (current.parent && current.parent > 0 && categoryMap.has(current.parent)) {
          current = categoryMap.get(current.parent);
        } else {
          break; // Reached root or parent not in product's categories
        }
        depth++;
      }

      return path;
    };

    // Build paths for all categories and find the deepest one
    const paths = categories
      .map((cat: any) => buildPath(cat))
      .filter((path: string[]) => path.length > 0);

    if (paths.length === 0) {
      return '';
    }

    // Return the longest path (most specific category)
    const deepestPath = paths.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );

    return deepestPath.join(' > ');
  },

  /**
   * Extract GTIN from meta_data
   * Looks for various barcode fields: gtin, upc, ean, isbn
   */
  extractGtin: (value) => {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    const metaData = Array.isArray(value) ? value : null;
    if (!metaData) return null;

    const gtinKeys = ['_gtin', 'gtin', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'];
    const gtinField = metaData.find((m: any) => gtinKeys.includes(m.key));

    return gtinField?.value || null;
  },

  /**
   * Format price with currency
   */
  formatPriceWithCurrency: (price, _, shop) => {
    if (!price) return null;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return null;
    return `${numPrice.toFixed(2)} ${shop.shopCurrency}`;
  },

  /**
   * Map WooCommerce stock status to OpenAI availability
   */
  mapStockStatus: (stockStatus) => {
    const map: Record<string, string> = {
      'instock': 'in_stock',
      'outofstock': 'out_of_stock',
      'onbackorder': 'preorder',
    };
    return map[stockStatus] || 'in_stock';
  },

  /**
   * Format dimensions as "LxWxH unit"
   * Uses shop's dimensionUnit from WooCommerce settings
   */
  formatDimensions: (dimensions, _, shop) => {
    if (!dimensions) return null;
    const { length, width, height } = dimensions;
    if (!length || !width || !height) return null;

    const unit = shop?.dimensionUnit || dimensions.unit || 'in';
    return `${length}x${width}x${height} ${unit}`;
  },

  /**
   * Add unit to dimension value
   * Uses shop's dimensionUnit from WooCommerce settings
   * Validates that all three dimensions (length, width, height) are present
   * Returns null if only some dimensions are filled (enforces all-or-nothing)
   */
  addUnit: (value, wooProduct, shop) => {
    if (!value) return null;

    // Check if all three dimensions exist
    const dimensions = wooProduct.dimensions || {};
    const length = dimensions.length;
    const width = dimensions.width;
    const height = dimensions.height;

    // Count how many dimensions are filled
    const filledCount = [length, width, height].filter(d => d && d !== '0' && d !== 0).length;

    // If only some are filled (1 or 2), return null (enforce all-or-nothing)
    if (filledCount > 0 && filledCount < 3) {
      return null;
    }

    // If all three are filled, return with unit
    if (filledCount === 3) {
      const unit = shop?.dimensionUnit || dimensions.unit || 'in';
      return `${value} ${unit}`;
    }

    // If none are filled, return null
    return null;
  },

  /**
   * Add weight unit
   * Uses shop's weightUnit from WooCommerce settings
   */
  addWeightUnit: (weight, _, shop) => {
    if (!weight) return null;
    const unit = shop?.weightUnit || 'lb';
    return `${weight} ${unit}`;
  },

  /**
   * Extract additional images (skip first one)
   */
  extractAdditionalImages: (images) => {
    if (!Array.isArray(images) || images.length <= 1) return [];
    return images.slice(1).map((img: any) => img.src).filter(Boolean);
  },

  /**
   * Extract brand from WooCommerce Brands plugin or attributes
   */
  extractBrand: (brands, wooProduct) => {
    // Try WooCommerce Brands plugin first
    if (brands && Array.isArray(brands) && brands.length > 0) {
      return brands[0].name;
    }

    // Fallback to attributes
    const brandAttr = wooProduct.attributes?.find((a: any) =>
      a.name.toLowerCase() === 'brand'
    );
    return brandAttr?.options?.[0] || null;
  },

  /**
   * Default to "new" condition
   */
  defaultToNew: (value) => {
    return value || 'new';
  },

  /**
   * Default to zero for inventory
   */
  defaultToZero: (value) => {
    return value ?? 0;
  },

  /**
   * Format sale date range
   */
  formatSaleDateRange: (dateFrom, wooProduct) => {
    const from = wooProduct.date_on_sale_from;
    const to = wooProduct.date_on_sale_to;

    if (!from || !to) return null;

    const fromDate = new Date(from).toISOString().split('T')[0];
    const toDate = new Date(to).toISOString().split('T')[0];

    return `${fromDate} / ${toDate}`;
  },

  /**
   * Generate item group ID for variants
   */
  generateGroupId: (parentId, wooProduct, shop) => {
    if (parentId && parentId > 0) {
      // This is a variant, use parent ID
      return `${shop.id}-${parentId}`;
    }
    // Simple product, use its own ID
    return `${shop.id}-${wooProduct.id}`;
  },

  /**
   * Generate offer ID (unique per variant)
   */
  generateOfferId: (sku, wooProduct, shop) => {
    const baseSku = sku || `prod-${wooProduct.id}`;
    const color = wooProduct.attributes?.find((a: any) => a.name.toLowerCase() === 'color')?.options?.[0];
    const size = wooProduct.attributes?.find((a: any) => a.name.toLowerCase() === 'size')?.options?.[0];

    let offerId = `${baseSku}`;
    if (color) offerId += `-${color}`;
    if (size) offerId += `-${size}`;

    return offerId;
  },

  /**
   * Extract custom variant category
   */
  extractCustomVariant: (attributes) => {
    if (!Array.isArray(attributes) || attributes.length === 0) return null;
    return attributes[0]?.name || null;
  },

  /**
   * Extract custom variant option
   */
  extractCustomVariantOption: (attributes) => {
    if (!Array.isArray(attributes) || attributes.length === 0) return null;
    return attributes[0]?.options?.[0] || null;
  },

  /**
   * Build shipping string
   */
  buildShippingString: (shippingClass, wooProduct, shop) => {
    // This would need shop-level shipping configuration
    // For now, return null and let shop settings handle it
    return null;
  },

  /**
   * Calculate popularity score from total sales
   */
  calculatePopularityScore: (totalSales) => {
    if (!totalSales || totalSales === 0) return null;

    // Simple logarithmic scale: log10(sales) scaled to 0-5
    const score = Math.min(5, Math.log10(totalSales + 1));
    return parseFloat(score.toFixed(1));
  },

  /**
   * Format Q&A from structured data
   */
  formatQAndA: (faqData) => {
    if (!faqData) return null;

    // If it's already an array of {q, a} objects
    if (Array.isArray(faqData)) {
      return faqData.map((item: any) => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');
    }

    // If it's a string, return as-is
    if (typeof faqData === 'string') {
      return faqData;
    }

    return null;
  },

  /**
   * Format related product IDs
   */
  formatRelatedIds: (relatedIds, wooProduct, shop) => {
    if (!Array.isArray(relatedIds) || relatedIds.length === 0) return null;

    // Convert WooCommerce product IDs to our stable IDs
    return relatedIds.map((id: number) => `${shop.id}-${id}`).join(',');
  },

  /**
   * Clean variation title to show only parent product name
   * Removes redundant parent name repetition from WooCommerce variation titles
   *
   * Examples:
   * "Product - Product - Red, M" → "Product - Red, M"
   * "Product - Red, M" → "Product - Red, M" (already clean)
   * "Product" → "Product" (no variation)
   */
  cleanVariationTitle: (title, wooProduct) => {
    if (!title || typeof title !== 'string') return title;

    // For variation products: check if parent_id exists
    const isVariation = wooProduct?.parent_id && wooProduct.parent_id > 0;
    if (!isVariation) return title;

    // Split by " - " to find repetition pattern
    const parts = title.split(' - ');
    if (parts.length < 3) return title; // No duplication possible

    // Check if first part equals second part (duplication pattern)
    if (parts[0].trim() === parts[1].trim()) {
      // Remove the duplicate first part, rejoin the rest
      return parts.slice(1).join(' - ');
    }

    return title;
  },
};

/**
 * Helper: Extract nested value from object using dot notation
 * Examples: "meta_data", "dimensions.length", "images[0].src"
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
 * Helper: Extract attribute value by name (case-insensitive)
 *
 * IMPORTANT: Handles both parent products and variations
 * - Parent products: attributes have "options" array (e.g., ["Red", "Blue"])
 * - Variations: attributes have "option" string (e.g., "Red")
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
 * Helper: Extract meta_data value by key
 */
export function extractMetaValue(wooProduct: any, metaKey: string): any {
  if (!wooProduct.meta_data || !Array.isArray(wooProduct.meta_data)) {
    return null;
  }

  const meta = wooProduct.meta_data.find((m: any) => m.key === metaKey);
  return meta?.value || null;
}
