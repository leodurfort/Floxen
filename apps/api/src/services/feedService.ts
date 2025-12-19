import { Product, Shop } from '@prisma/client';
import { validateFeedEntry, type FeedValidationResult } from '@productsynch/shared';
import { logger } from '../lib/logger';

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
        // Get all auto-filled values from WooCommerce
        const autoFilled = (p.openaiAutoFilled as Record<string, any>) || {};

        // Build complete feed item with all 70 attributes
        return {
          // Core identifiers
          id: autoFilled.id || `${shop.id}-${p.wooProductId}`,

          // All fields use auto-filled values from WooCommerce
          title: autoFilled.title,
          description: autoFilled.description,
          product_category: autoFilled.product_category,
          link: autoFilled.link,
          image_link: autoFilled.image_link,
          additional_image_links: autoFilled.additional_image_links,
          price: autoFilled.price,
          sale_price: autoFilled.sale_price,
          sale_price_dates: autoFilled.sale_price_dates,
          availability: autoFilled.availability,
          availability_date: autoFilled.availability_date,
          inventory: autoFilled.inventory,
          brand: autoFilled.brand,
          gtin: autoFilled.gtin,
          // mpn is mutually exclusive with gtin: if gtin is provided, mpn should be null
          mpn: autoFilled.gtin ? null : autoFilled.mpn,
          condition: autoFilled.condition,
          age_group: autoFilled.age_group,
          color: autoFilled.color,
          gender: autoFilled.gender,
          material: autoFilled.material,
          pattern: autoFilled.pattern,
          size: autoFilled.size,
          item_group_id: autoFilled.item_group_id,
          offer_id: autoFilled.offer_id,
          custom_variant_category: autoFilled.custom_variant_category,
          custom_variant_option: autoFilled.custom_variant_option,
          shipping: autoFilled.shipping,
          shipping_weight: autoFilled.shipping_weight,
          shipping_length: autoFilled.shipping_length,
          shipping_width: autoFilled.shipping_width,
          shipping_height: autoFilled.shipping_height,
          seller_name: shop.sellerName,
          seller_url: shop.sellerUrl,
          seller_privacy_policy: shop.sellerPrivacyPolicy,
          seller_terms_of_service: shop.sellerTos,
          return_policy: shop.returnPolicy,
          return_window_days: shop.returnWindow,

          // Product details
          energy_efficiency_class: autoFilled.energy_efficiency_class,
          min_energy_efficiency_class: autoFilled.min_energy_efficiency_class,
          max_energy_efficiency_class: autoFilled.max_energy_efficiency_class,
          unit_pricing_measure: autoFilled.unit_pricing_measure,
          unit_pricing_base_measure: autoFilled.unit_pricing_base_measure,
          installment_months: autoFilled.installment_months,
          installment_amount: autoFilled.installment_amount,
          subscription_period: autoFilled.subscription_period,
          subscription_amount: autoFilled.subscription_amount,

          // Reviews and ratings
          product_rating: autoFilled.product_rating,
          product_review_count: autoFilled.product_review_count,
          product_review_url: autoFilled.product_review_url,
          product_popularity_score: autoFilled.product_popularity_score,

          // Inventory management
          multipack_quantity: autoFilled.multipack_quantity,
          is_bundle: autoFilled.is_bundle,
          certification: autoFilled.certification,
          expiration_date: autoFilled.expiration_date,

          // Keywords and Q&A
          ai_keywords: autoFilled.ai_keywords,
          q_and_a: autoFilled.q_and_a,
          related_product_ids: autoFilled.related_product_ids,

          // Control flags - OpenAI spec requires lowercase strings, not booleans
          enable_search: p.feedEnableSearch ? 'true' : 'false',
          enable_checkout: p.feedEnableCheckout ? 'true' : 'false',
        };
      })
    .map((item, index) => {
      validationStats.total++;

      // Validate entry if enabled
      if (validateEntries) {
        const validation = validateFeedEntry(item, {
          validateOptional: false, // Only validate required fields
        });

        if (!validation.valid) {
          validationStats.invalid++;
          validationStats.invalidProducts.push({
            productId: products[index].wooProductId,
            errors: validation.errors.map(e => ({
              field: e.field,
              error: e.error,
            })),
          });

          logger.error('[FeedService] Invalid product entry', {
            shopId: shop.id,
            productId: products[index].wooProductId.toString(),
            productTitle: products[index].wooTitle,
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
            productId: products[index].wooProductId.toString(),
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
