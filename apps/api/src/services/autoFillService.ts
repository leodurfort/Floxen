/**
 * AutoFillService
 *
 * Automatically fills all 70 OpenAI feed attributes from WooCommerce product data
 * using the mapping specifications and transform functions.
 */

import { Shop } from '@prisma/client';
import {
  LOCKED_FIELD_SET,
  OPENAI_FEED_SPEC,
  OpenAIFieldSpec,
  TRANSFORMS,
  extractFieldValue,
  ProductFieldOverrides,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
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
   * Refresh the shop object with fresh data from database.
   * Used during long-running syncs to pick up user changes to shop settings.
   */
  refreshShop(shop: Shop): void {
    this.shop = shop;
  }

  /**
   * Get the current shop ID (for external refresh checks)
   */
  getShopId(): string {
    return this.shop.id;
  }

  /**
   * Auto-fill all OpenAI attributes from WooCommerce product data
   * Returns a record of attribute -> value for all 70 fields
   *
   * Priority order for field resolution:
   * 1. Product-level static value (if set) -> Use directly, no transform
   * 2. Product-level custom mapping (if set) -> Extract from WooCommerce using this mapping
   * 3. Shop-level mapping (from Field Mapping Setup) -> Use shop default
   * 4. Spec default mapping (from OPENAI_FEED_SPEC.wooCommerceMapping) -> Fallback
   *
   * @param wooProduct - WooCommerce product data
   * @param productFlags - Product-level settings (enable_search, enable_checkout)
   * @param productOverrides - Product-level field mapping overrides
   */
  autoFillProduct(
    wooProduct: any,
    productFlags?: {
      enableSearch?: boolean;
      enableCheckout?: boolean;
    },
    productOverrides?: ProductFieldOverrides
  ): Record<string, any> {
    const autoFilled: Record<string, any> = {};

    for (const spec of OPENAI_FEED_SPEC) {
      const value = this.fillField(spec, wooProduct, productFlags, productOverrides);

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
  private fillField(
    spec: OpenAIFieldSpec,
    wooProduct: any,
    productFlags?: {
      enableSearch?: boolean;
      enableCheckout?: boolean;
    },
    productOverrides?: ProductFieldOverrides
  ): any {
    // Check for product-level override FIRST for flag fields
    // This allows product-level overrides to take priority over productFlags
    const override = productOverrides?.[spec.attribute];

    // Handle flag fields (enable_search, enable_checkout)
    if (spec.attribute === 'enable_checkout') {
      // enable_checkout is always false (feature not yet available)
      return 'false';
    }

    if (spec.attribute === 'enable_search') {
      // enable_search uses ONLY the feedEnableSearch column - no override support
      // This ensures a single source of truth for this field
      return productFlags?.enableSearch !== undefined
        ? (productFlags.enableSearch ? 'true' : 'false')
        : null;
    }

    const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
    const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);

    // Check for product-level override (already extracted above)
    if (override) {
      // Static value - use directly, no transform
      if (override.type === 'static') {
        // Only allow static overrides for non-locked fields OR specific allowed locked fields
        if (!isLockedField || allowsStaticOverride) {
          return override.value;
        }
        // Ignore static override for fully locked fields
        logger.warn('Static override ignored for locked field', {
          attribute: spec.attribute,
          shopId: this.shop.id,
        });
      }

      // Custom mapping - only for non-locked fields
      if (override.type === 'mapping' && !isLockedField) {
        // Null value means "no mapping" - exclude this field for this product
        if (override.value === null) {
          return null;
        }

        const customPath = override.value;

        // Handle shop-level fields (prefixed with "shop.")
        if (customPath.startsWith('shop.')) {
          const shopField = customPath.replace('shop.', '');
          return this.shop[shopField as keyof Shop] || null;
        }

        // Use custom path with spec transforms if they exist
        const mapping: NonNullable<OpenAIFieldSpec['wooCommerceMapping']> = {
          field: customPath,
          ...(spec.wooCommerceMapping && {
            transform: spec.wooCommerceMapping.transform,
            fallback: spec.wooCommerceMapping.fallback,
          }),
        };

        return this.extractWithMapping(wooProduct, mapping, spec);
      }
    }

    // Check for shop-level custom mapping (second priority)
    const customMappings = this.customMappings;
    let mapping = spec.wooCommerceMapping;

    if (!isLockedField && customMappings && customMappings[spec.attribute]) {
      const customPath = customMappings[spec.attribute];

      // Handle shop-level fields (prefixed with "shop.")
      if (customPath.startsWith('shop.')) {
        const shopField = customPath.replace('shop.', '');
        return this.shop[shopField as keyof Shop] || null;
      }

      // Use custom path with spec transforms if they exist
      mapping = {
        field: customPath,
        ...(spec.wooCommerceMapping && {
          transform: spec.wooCommerceMapping.transform,
          fallback: spec.wooCommerceMapping.fallback,
        }),
      };
    }

    // No mapping = null (user must provide manually or skip)
    if (!mapping) return null;

    return this.extractWithMapping(wooProduct, mapping, spec);
  }

  /**
   * Extract value using a mapping configuration
   */
  private extractWithMapping(
    wooProduct: any,
    mapping: NonNullable<OpenAIFieldSpec['wooCommerceMapping']>,
    spec: OpenAIFieldSpec
  ): any {
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
    return extractFieldValue(wooProduct, path, this.shop);
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
