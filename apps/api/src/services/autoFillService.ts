/**
 * AutoFillService
 *
 * Automatically fills all 63 OpenAI feed attributes from WooCommerce product data
 * using the mapping specifications and transform functions.
 */

import { Shop } from '@prisma/client';
import { OPENAI_FEED_SPEC, OpenAIFieldSpec } from '../config/openai-feed-spec';
import { TRANSFORMS, extractNestedValue, extractAttributeValue, extractMetaValue } from './woocommerce/transforms';

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
    const mapping = spec.wooCommerceMapping;

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

    // Apply transform function if specified and value exists
    if (value !== null && value !== undefined && mapping.transform) {
      const transformFn = TRANSFORMS[mapping.transform];
      if (transformFn) {
        try {
          value = transformFn(value, wooProduct, this.shop);
        } catch (error) {
          console.error(`Transform error for ${spec.attribute}:`, error);
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
