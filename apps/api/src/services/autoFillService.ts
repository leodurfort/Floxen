/**
 * AutoFillService
 *
 * Automatically fills all 63 OpenAI feed attributes from WooCommerce product data
 * using the mapping specifications and transform functions.
 */

import { Shop } from '@prisma/client';
import {
  LOCKED_FIELD_SET,
  OPENAI_FEED_SPEC,
  OpenAIFieldSpec,
  TRANSFORMS,
  extractNestedValue,
  extractAttributeValue,
  extractMetaValue,
} from '@productsynch/shared';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export class AutoFillService {
  private customMappings: Record<string, string> = {};

  constructor(private shop: Shop, customMappings?: Record<string, string>) {
    // Accept custom mappings as parameter (for backward compatibility)
    // or use the legacy fieldMappings JSON field
    const mergedMappings = customMappings || (shop.fieldMappings as Record<string, string>) || {};
    this.customMappings = Object.fromEntries(
      Object.entries(mergedMappings).filter(([attribute]) => !LOCKED_FIELD_SET.has(attribute))
    );
  }

  /**
   * Factory method to create AutoFillService with field mappings loaded from database
   */
  static async create(shop: Shop): Promise<AutoFillService> {
    // Load field mappings from database
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId: shop.id },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    // Convert to Record<string, string> format
    const customMappings: Record<string, string> = {};
    for (const mapping of fieldMappings) {
      const attribute = mapping.openaiField.attribute;
      if (LOCKED_FIELD_SET.has(attribute)) {
        continue;
      }

      if (mapping.wooField) {
        customMappings[attribute] = mapping.wooField.value;
      }
    }

    return new AutoFillService(shop, customMappings);
  }

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
    // Skip toggle fields - these are shop-level settings, not auto-filled from WooCommerce
    if (spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout') {
      return null;
    }

    const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
    // Check for custom mapping first
    const customMappings = this.customMappings;
    let mapping = spec.wooCommerceMapping;

    // Override with custom mapping if exists
    if (!isLockedField && customMappings && customMappings[spec.attribute]) {
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
