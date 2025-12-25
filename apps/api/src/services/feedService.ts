import { Product, Shop } from '@prisma/client';
import { validateFeedEntry, type FeedValidationResult, OPENAI_FEED_SPEC } from '@productsynch/shared';
import { logger } from '../lib/logger';

// Create a set of valid OpenAI field names for filtering
const VALID_OPENAI_FIELDS = new Set(OPENAI_FEED_SPEC.map(spec => spec.attribute));

// Ordered list of all 70 OpenAI field attributes (for consistent output)
const ALL_OPENAI_FIELDS = OPENAI_FEED_SPEC.map(spec => spec.attribute);

/**
 * Validation statistics for feed generation
 */
export interface FeedValidationStats {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  invalidProducts: Array<{
    productId: number;
    errors: Array<{ field: string; error: string }>;
  }>;
}

/**
 * Generate complete OpenAI feed payload with all 70 attributes
 * Uses auto-filled values from WooCommerce data
 *
 * @param shop - Shop configuration
 * @param products - Products to include in feed
 * @param options - Generation options
 * @returns Feed payload with items and validation stats
 */
export function generateFeedPayload(
  shop: Shop,
  products: Product[],
  options: {
    validateEntries?: boolean; // Enable validation (default: true in production)
    skipInvalidEntries?: boolean; // Skip invalid entries instead of including them (default: true)
  } = {}
) {
  const {
    validateEntries = process.env.NODE_ENV === 'production',
    skipInvalidEntries = true
  } = options;

  const validationStats: FeedValidationStats = {
    total: 0,
    valid: 0,
    invalid: 0,
    warnings: 0,
    invalidProducts: [],
  };

  const items = products
    .filter(p => p.isValid && p.feedEnableSearch) // Only include valid products with search enabled
    .map((p) => {
        // Get all auto-filled values from WooCommerce (includes all OpenAI fields)
        const autoFilled = (p.openaiAutoFilled as Record<string, any>) || {};

        // Build complete feed item with ALL 70 fields
        // Fields without values will be null (consistent structure for OpenAI)
        const completeItem: Record<string, any> = {};

        for (const field of ALL_OPENAI_FIELDS) {
          // Special handling for certain fields
          if (field === 'id') {
            completeItem[field] = autoFilled.id || `${shop.id}-${p.wooProductId}`;
          } else if (field === 'enable_search') {
            completeItem[field] = p.feedEnableSearch ? 'true' : 'false';
          } else if (field === 'enable_checkout') {
            completeItem[field] = p.feedEnableCheckout ? 'true' : 'false';
          } else {
            // Use auto-filled value or null
            completeItem[field] = autoFilled[field] ?? null;
          }
        }

        // Log any non-spec fields that were in autoFilled (for debugging)
        for (const key of Object.keys(autoFilled)) {
          if (!VALID_OPENAI_FIELDS.has(key)) {
            logger.warn('[FeedService] Skipping non-spec field', {
              shopId: shop.id,
              productId: p.wooProductId.toString(),
              field: key,
            });
          }
        }

        // Return both item and product reference for accurate validation reporting
        return { item: completeItem, product: p };
      })
    .map(({ item, product }) => {
      validationStats.total++;

      // Validate entry if enabled
      if (validateEntries) {
        const validation = validateFeedEntry(item, {
          validateOptional: false, // Only validate required fields
        });

        if (!validation.valid) {
          validationStats.invalid++;
          validationStats.invalidProducts.push({
            productId: product.wooProductId,
            errors: validation.errors.map(e => ({
              field: e.field,
              error: e.error,
            })),
          });

          logger.error('[FeedService] Invalid product entry', {
            shopId: shop.id,
            productId: product.wooProductId.toString(),
            productTitle: product.wooTitle,
            errorCount: validation.errors.length,
            errors: validation.errors,
          });

          // Skip invalid entries if configured
          if (skipInvalidEntries) {
            return null;
          }
        } else {
          validationStats.valid++;
        }

        // Log warnings but don't skip
        if (validation.warnings.length > 0) {
          validationStats.warnings++;
          logger.warn('[FeedService] Product entry has warnings', {
            shopId: shop.id,
            productId: product.wooProductId.toString(),
            warningCount: validation.warnings.length,
            warnings: validation.warnings,
          });
        }
      } else {
        validationStats.valid++;
      }

      return item;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Log validation summary
  if (validateEntries) {
    logger.info('[FeedService] Feed generation validation summary', {
      shopId: shop.id,
      total: validationStats.total,
      valid: validationStats.valid,
      invalid: validationStats.invalid,
      warnings: validationStats.warnings,
      itemsIncluded: items.length,
    });

    // Log most common errors if any
    if (validationStats.invalidProducts.length > 0) {
      const errorCounts = new Map<string, number>();
      validationStats.invalidProducts.forEach(({ errors }) => {
        errors.forEach(({ error }) => {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
      });

      const topErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topErrors.length > 0) {
        logger.warn('[FeedService] Most common validation errors', {
          shopId: shop.id,
          topErrors: topErrors.map(([error, count]) => ({ error, count })),
        });
      }
    }
  }

  return {
    seller: {
      id: shop.openaiMerchantId || shop.id,
      name: shop.sellerName,
      url: shop.sellerUrl || shop.wooStoreUrl,
      privacy_policy: shop.sellerPrivacyPolicy,
      terms_of_service: shop.sellerTos,
    },
    generatedAt: new Date().toISOString(),
    items,
    validationStats: validateEntries ? validationStats : undefined,
  };
}
