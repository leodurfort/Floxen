import { Product, Shop } from '@prisma/client';
import { FeedValueResolver } from './feedValueResolver';
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
 * Generate complete OpenAI feed payload with all 63 attributes
 * Uses V2 model: openaiAutoFilled + openaiEdited + AI enrichment + source selection
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
        // Use FeedValueResolver for enrichable fields (title, description, category, keywords, q_and_a)
        const resolver = new FeedValueResolver(p);
        const resolved = resolver.resolveAll();

        // Get all auto-filled values
        const autoFilled = (p.openaiAutoFilled as Record<string, any>) || {};

        // Get user's manual edits (these override auto-filled for non-enrichable fields)
        const edited = (p.openaiEdited as Record<string, any>) || {};

        // Merge: edited values take priority over auto-filled for non-enrichable fields
        const effectiveValues = { ...autoFilled, ...edited };

        // Build complete feed item with all 63 attributes
        return {
          // Core identifiers (always use effective values)
          id: effectiveValues.id || `${shop.id}-${p.wooProductId}`,

          // Enrichable fields (use resolver which respects user's source selection)
          title: resolved.title,
          description: resolved.description,
          product_category: resolved.category,

          // Non-enrichable fields (use effective values: edited > auto-filled)
          link: effectiveValues.link,
          image_link: effectiveValues.image_link,
          additional_image_links: effectiveValues.additional_image_links,
          price: effectiveValues.price,
          sale_price: effectiveValues.sale_price,
          sale_price_dates: effectiveValues.sale_price_dates,
          availability: effectiveValues.availability,
          availability_date: effectiveValues.availability_date,
          inventory: effectiveValues.inventory,
          brand: effectiveValues.brand,
          gtin: effectiveValues.gtin,
          // mpn is mutually exclusive with gtin: if gtin is provided, mpn should be null
          mpn: effectiveValues.gtin ? null : effectiveValues.mpn,
          condition: effectiveValues.condition,
          age_group: effectiveValues.age_group,
          color: effectiveValues.color,
          gender: effectiveValues.gender,
          material: effectiveValues.material,
          pattern: effectiveValues.pattern,
          size: effectiveValues.size,
          item_group_id: effectiveValues.item_group_id,
          offer_id: effectiveValues.offer_id,
          custom_variant_category: effectiveValues.custom_variant_category,
          custom_variant_option: effectiveValues.custom_variant_option,
          shipping: effectiveValues.shipping,
          shipping_weight: effectiveValues.shipping_weight,
          shipping_length: effectiveValues.shipping_length,
          shipping_width: effectiveValues.shipping_width,
          shipping_height: effectiveValues.shipping_height,
          seller_name: shop.sellerName,
          seller_url: shop.sellerUrl,
          seller_privacy_policy: shop.sellerPrivacyPolicy,
          seller_terms_of_service: shop.sellerTos,
          return_policy: shop.returnPolicy,
          return_window_days: shop.returnWindow,

          // Product details
          energy_efficiency_class: effectiveValues.energy_efficiency_class,
          min_energy_efficiency_class: effectiveValues.min_energy_efficiency_class,
          max_energy_efficiency_class: effectiveValues.max_energy_efficiency_class,
          unit_pricing_measure: effectiveValues.unit_pricing_measure,
          unit_pricing_base_measure: effectiveValues.unit_pricing_base_measure,
          installment_months: effectiveValues.installment_months,
          installment_amount: effectiveValues.installment_amount,
          subscription_period: effectiveValues.subscription_period,
          subscription_amount: effectiveValues.subscription_amount,

          // Reviews and ratings
          product_rating: effectiveValues.product_rating,
          product_review_count: effectiveValues.product_review_count,
          product_review_url: effectiveValues.product_review_url,
          product_popularity_score: effectiveValues.product_popularity_score,

          // Inventory management
          multipack_quantity: effectiveValues.multipack_quantity,
          is_bundle: effectiveValues.is_bundle,
          certification: effectiveValues.certification,
          expiration_date: effectiveValues.expiration_date,

          // AI-enriched fields (use resolver)
          ai_keywords: resolved.keywords,
          q_and_a: resolved.qAndA,
          related_product_ids: effectiveValues.related_product_ids,

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
