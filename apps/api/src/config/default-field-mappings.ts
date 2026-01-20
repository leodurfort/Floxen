/**
 * Default Field Mappings
 *
 * SINGLE SOURCE OF TRUTH: Derived from OPENAI_FEED_SPEC.wooCommerceMapping
 *
 * This mapping is automatically generated from the canonical OpenAI Feed Specification.
 * These are suggested default mappings used when a shop has no custom mappings yet.
 *
 * Format:
 * - Product fields: extracted from spec.wooCommerceMapping.field
 * - Shop fields: extracted from spec.wooCommerceMapping.shopField (prefixed with 'shop.')
 * - Unmapped fields: null (no wooCommerceMapping defined)
 *
 * ✅ Automatically includes all fields from OPENAI_FEED_SPEC
 * ✅ No manual maintenance required
 * ✅ Always stays in sync with the specification
 */

import { OPENAI_FEED_SPEC } from '@floxen/shared';

/**
 * Generate default field mappings from the canonical OpenAI Feed Specification.
 *
 * Extraction logic:
 * 1. If spec.wooCommerceMapping.shopField exists → use "shop.{shopField}"
 * 2. Else if spec.wooCommerceMapping.field exists → use field value
 * 3. Else → null (unmapped, must be configured by user)
 *
 * Transform and fallback logic is NOT included here - those are handled
 * by AutoFillService at runtime using the full spec.
 */
export const DEFAULT_FIELD_MAPPINGS: Record<string, string | null> = OPENAI_FEED_SPEC.reduce(
  (acc, spec) => {
    const mapping = spec.wooCommerceMapping;

    if (!mapping) {
      // No mapping defined - field must be manually configured or is a toggle
      acc[spec.attribute] = null;
    } else if (mapping.shopField) {
      // Shop-level field (e.g., seller_name, return_policy)
      acc[spec.attribute] = `shop.${mapping.shopField}`;
    } else if (mapping.field) {
      // Product-level field (e.g., name, price, sku)
      acc[spec.attribute] = mapping.field;
    } else {
      // Mapping exists but has no field or shopField (edge case)
      acc[spec.attribute] = null;
    }

    return acc;
  },
  {} as Record<string, string | null>
);
