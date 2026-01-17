import { Product, Shop } from '@prisma/client';
import { validateFeedEntry, type FeedValidationResult, OPENAI_FEED_SPEC } from '@productsynch/shared';
import { logger } from '../lib/logger';

const VALID_OPENAI_FIELDS = new Set(OPENAI_FEED_SPEC.map(spec => spec.attribute));
const ALL_OPENAI_FIELDS = OPENAI_FEED_SPEC.map(spec => spec.attribute);

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

export function generateFeedPayload(
  shop: Shop,
  products: Product[],
  options: { validateEntries?: boolean; skipInvalidEntries?: boolean } = {}
) {
  const validateEntries = options.validateEntries ?? process.env.NODE_ENV === 'production';
  const skipInvalidEntries = options.skipInvalidEntries ?? true;

  const validationStats: FeedValidationStats = {
    total: 0,
    valid: 0,
    invalid: 0,
    warnings: 0,
    invalidProducts: [],
  };

  const items = products
    .filter(p => p.isValid && p.feedEnableSearch && p.isSelected && p.syncState === 'synced')
    .map((p) => {
        const autoFilled = (p.openaiAutoFilled as Record<string, any>) || {};
        const completeItem = buildFeedItem(shop, p, autoFilled);

        for (const key of Object.keys(autoFilled)) {
          if (!VALID_OPENAI_FIELDS.has(key)) {
            logger.warn('[FeedService] Skipping non-spec field', {
              shopId: shop.id, productId: p.wooProductId.toString(), field: key,
            });
          }
        }

        return { item: completeItem, product: p };
      })
    .map(({ item, product }) => {
      validationStats.total++;

      if (validateEntries) {
        const validation = validateFeedEntry(item, {
          validateOptional: false,
          productContext: {
            isVariation: !!(product as any).wooParentId,
            wooProductType: (product as any).wooRawJson?.type,
          },
        });

        if (!validation.valid) {
          handleInvalidEntry(shop, product, validation, validationStats);
          if (skipInvalidEntries) return null;
        } else {
          validationStats.valid++;
        }

        if (validation.warnings.length > 0) {
          validationStats.warnings++;
          logger.warn('[FeedService] Product entry has warnings', {
            shopId: shop.id, productId: product.wooProductId.toString(),
            warningCount: validation.warnings.length, warnings: validation.warnings,
          });
        }
      } else {
        validationStats.valid++;
      }

      return item;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (validateEntries) {
    logValidationSummary(shop.id, validationStats, items.length);
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

function buildFeedItem(shop: Shop, product: Product, autoFilled: Record<string, any>): Record<string, any> {
  const item: Record<string, any> = {};
  for (const field of ALL_OPENAI_FIELDS) {
    if (field === 'id') {
      item[field] = autoFilled.id || `${shop.id}-${product.wooProductId}`;
    } else if (field === 'enable_search') {
      item[field] = autoFilled.enable_search ?? (product.feedEnableSearch ? 'true' : 'false');
    } else if (field === 'enable_checkout') {
      item[field] = 'false';
    } else {
      item[field] = autoFilled[field] ?? null;
    }
  }
  return item;
}

function handleInvalidEntry(
  shop: Shop,
  product: Product,
  validation: FeedValidationResult,
  stats: FeedValidationStats
): void {
  stats.invalid++;
  stats.invalidProducts.push({
    productId: product.wooProductId,
    errors: validation.errors.map(e => ({ field: e.field, error: e.error })),
  });
  logger.error('[FeedService] Invalid product entry', {
    shopId: shop.id, productId: product.wooProductId.toString(),
    productTitle: product.wooTitle, errorCount: validation.errors.length, errors: validation.errors,
  });
}

function logValidationSummary(shopId: string, stats: FeedValidationStats, itemsIncluded: number): void {
  logger.info('[FeedService] Feed generation validation summary', {
    shopId, total: stats.total, valid: stats.valid,
    invalid: stats.invalid, warnings: stats.warnings, itemsIncluded,
  });

  if (stats.invalidProducts.length > 0) {
    const errorCounts = new Map<string, number>();
    stats.invalidProducts.forEach(({ errors }) => {
      errors.forEach(({ error }) => errorCounts.set(error, (errorCounts.get(error) || 0) + 1));
    });

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topErrors.length > 0) {
      logger.warn('[FeedService] Most common validation errors', {
        shopId, topErrors: topErrors.map(([error, count]) => ({ error, count })),
      });
    }
  }
}

/**
 * Convert array of items to JSONL format (one JSON object per line)
 */
export function toJsonl(items: Record<string, unknown>[]): string {
  return items.map(item => JSON.stringify(item)).join('\n');
}
