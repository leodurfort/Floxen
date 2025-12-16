/**
 * AutoFillService
 *
 * Automatically fills all 63 OpenAI feed attributes from WooCommerce product data
 * using the mapping specifications and transform functions.
 */

import { Shop } from '@prisma/client';
import { OPENAI_FEED_SPEC, OpenAIFieldSpec } from '../config/openai-feed-spec';
import { TRANSFORMS, extractNestedValue, extractAttributeValue, extractMetaValue } from './woocommerce/transforms';
import { logger } from '../lib/logger';

export class AutoFillService {
  constructor(private shop: Shop) {}

  /**
   * Auto-fill all OpenAI attributes from WooCommerce product data
   * Returns a record of attribute -> value for all 63 fields
   */
  autoFillProduct(wooProduct: any): Record<string, any> {
    const autoFilled: Record<string, any> = {};

    for (const spec of OPENAI_FEED_SPEC) {
      const value = this.fillField(spec, wooProduct);

      // Only include non-null/non-undefined values
      if (value !== null && value !== undefined) {
        autoFilled[spec.attribute] = value;
      }
    }

    return autoFilled;
  }

  /**
   * Fill a single field based on its mapping spec
   */
  private fillField(spec: OpenAIFieldSpec, wooProduct: any): any {
    // Check for custom mapping first
    const customMappings = this.shop.fieldMappings as Record<string, string> | null;
    let mapping = spec.wooCommerceMapping;

    // Override with custom mapping if exists
    if (customMappings && customMappings[spec.attribute]) {
      const customPath = customMappings[spec.attribute];

      // Handle shop-level fields (prefixed with "shop.")
      if (customPath.startsWith('shop.')) {
        const shopField = customPath.replace('shop.', '');
        return this.shop[shopField as keyof Shop] || null;
      }

      // Handle product-level fields - create a temporary mapping object
      mapping = { field: customPath };
    }

    // No mapping = null (user must provide manually or skip)
    if (!mapping) return null;

    // Shop-level field (e.g., seller_name, return_policy)
    if (mapping.shopField) {
      return this.shop[mapping.shopField as keyof Shop] || null;
    }

    // Extract value from WooCommerce product
    let value = null;

    if (mapping.field) {
      value = this.extractValue(wooProduct, mapping.field);
    }

    // Try fallback if primary is empty
    if (!value && mapping.fallback) {
      value = this.extractValue(wooProduct, mapping.fallback);
    }

    // Apply transform function if specified
    // For default transforms (like defaultToNew), run even when value is null
    if (mapping.transform) {
      const transformFn = TRANSFORMS[mapping.transform];
      if (transformFn) {
        try {
          // Run transform even if value is null (for default value transforms)
          value = transformFn(value, wooProduct, this.shop);
        } catch (error) {
          logger.error('Transform function failed during auto-fill', {
            error: error as Error,
            attribute: spec.attribute,
            transform: mapping.transform,
            shopId: this.shop.id,
            productId: wooProduct?.id,
            inputValue: value,
          });
          value = null;
        }
      }
    }

    return value;
  }

  /**
   * Extract value from WooCommerce product using dot notation
   * Supports:
   * - Simple fields: "name", "sku", "price"
   * - Nested fields: "dimensions.length"
   * - Array indexing: "images[0].src"
   * - Special cases: "meta_data", "attributes"
   */
  private extractValue(wooProduct: any, path: string): any {
    // Special case: meta_data (search by key)
    if (path.startsWith('meta_data.')) {
      const metaKey = path.replace('meta_data.', '');
      return extractMetaValue(wooProduct, metaKey);
    }

    // Special case: attributes (search by name)
    if (path.startsWith('attributes.')) {
      const attrName = path.replace('attributes.', '');
      return extractAttributeValue(wooProduct, attrName);
    }

    // Special case: array access like images[0].src
    if (path.includes('[')) {
      return extractNestedValue(wooProduct, path);
    }

    // Standard nested field access
    return extractNestedValue(wooProduct, path);
  }
}

/**
 * Standalone function to auto-fill a product
 * Useful for one-off operations or testing
 */
export function autoFillProductFromWoo(wooProduct: any, shop: Shop): Record<string, any> {
  const service = new AutoFillService(shop);
  return service.autoFillProduct(wooProduct);
}
