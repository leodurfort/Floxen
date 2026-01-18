import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { decrypt } from '../lib/encryption';
import { logger } from '../lib/logger';
import {
  getConcurrency,
  recordSuccess,
  recordRateLimit,
  isRateLimitError,
} from '../lib/adaptiveConcurrency';

// 30 second timeout per WooCommerce API request
const WOO_REQUEST_TIMEOUT_MS = 30000;

export interface WooConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export function createWooClient(config: WooConfig) {
  return new WooCommerceRestApi({
    url: config.storeUrl,
    consumerKey: decrypt(config.consumerKey),
    consumerSecret: decrypt(config.consumerSecret),
    version: 'wc/v3',
    timeout: WOO_REQUEST_TIMEOUT_MS,
  });
}

async function fetchAllPaginated(
  api: WooCommerceRestApi,
  endpoint: string,
  params: Record<string, any>,
  logLabel: string
): Promise<any[]> {
  logger.info(`woo:fetch ${logLabel} start`);
  const all: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await api.get(endpoint, { ...params, page, per_page: perPage });

    // Use concat instead of spread to avoid stack overflow with large arrays
    // The spread operator (...) can cause "Maximum call stack size exceeded"
    // when the array is very large or has unexpected data structures
    const data = Array.isArray(response.data) ? response.data : [];
    for (const item of data) {
      all.push(item);
    }

    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  logger.info(`woo:fetch ${logLabel} complete`, { count: all.length });
  return all;
}

export async function fetchAllProducts(api: WooCommerceRestApi) {
  return fetchAllPaginated(api, 'products', { status: 'publish' }, 'products');
}

/**
 * Fetch only specific products by ID using the 'include' parameter
 * Much faster than fetching all products when only a few are selected
 *
 * @param api - WooCommerce REST API client
 * @param productIds - Array of WooCommerce product IDs to fetch
 * @returns Array of product objects
 */
export async function fetchSelectedProducts(api: WooCommerceRestApi, productIds: number[]): Promise<any[]> {
  if (productIds.length === 0) {
    logger.info('woo:fetch selected products - empty list');
    return [];
  }

  logger.info('woo:fetch selected products start', { count: productIds.length });
  const all: any[] = [];

  // WooCommerce 'include' parameter can handle multiple IDs, but we batch
  // to avoid URL length limits and potential API issues with large lists
  const BATCH_SIZE = 50;

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    const includeParam = batch.join(',');

    // Use include parameter to fetch specific products
    // Still need to paginate in case batch returns more than per_page
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await api.get('products', {
        include: includeParam,
        status: 'publish',
        page,
        per_page: perPage,
      });

      const data = Array.isArray(response.data) ? response.data : [];
      for (const item of data) {
        all.push(item);
      }

      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      if (page >= totalPages) break;
      page++;
    }
  }

  logger.info('woo:fetch selected products complete', {
    requested: productIds.length,
    fetched: all.length
  });
  return all;
}

export async function fetchStoreCurrency(api: WooCommerceRestApi) {
  try {
    const response = await api.get('settings/general/woocommerce_currency');
    const value = response.data?.[0]?.value || response.data?.value;
    logger.info('woo:fetch currency', { value });
    return typeof value === 'string' ? value : null;
  } catch (err) {
    logger.warn('woo:fetch currency failed', { error: err instanceof Error ? err : new Error(String(err)) });
    return null;
  }
}

export interface StoreSettings {
  shopCurrency: string | null;
  language?: string;
  dimensionUnit?: string;
  weightUnit?: string;
  // sellerName is user-input only
  // sellerUrl can be populated from wooStoreUrl
  // sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only
}

/**
 * Fetch comprehensive store settings from WooCommerce API
 * @param api - WooCommerce REST API client
 * @param fallbackStoreUrl - Optional store URL to use if WooCommerce API doesn't return one
 */
export async function fetchStoreSettings(api: WooCommerceRestApi, fallbackStoreUrl?: string): Promise<StoreSettings | null> {
  try {
    logger.info('woo:fetch store settings start');

    // Fetch general settings (currency)
    const generalResponse = await api.get('settings/general');
    const settings = Array.isArray(generalResponse.data) ? generalResponse.data : [];
    const currencySetting = settings.find((s: any) => s.id === 'woocommerce_currency');

    // Fetch products settings (dimension and weight units)
    const productsResponse = await api.get('settings/products');
    const productSettings = Array.isArray(productsResponse.data) ? productsResponse.data : [];
    const dimensionUnitSetting = productSettings.find((s: any) => s.id === 'woocommerce_dimension_unit');
    const weightUnitSetting = productSettings.find((s: any) => s.id === 'woocommerce_weight_unit');

    const storeSettings: StoreSettings = {
      shopCurrency: currencySetting?.value || null,
      dimensionUnit: dimensionUnitSetting?.value || undefined,
      weightUnit: weightUnitSetting?.value || undefined,
      language: undefined,
      // sellerName is user-input only
      // sellerUrl can be populated from wooStoreUrl
      // sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only
    };

    logger.info('woo:fetch store settings complete', {
      shopCurrency: storeSettings.shopCurrency,
      dimensionUnit: storeSettings.dimensionUnit,
      weightUnit: storeSettings.weightUnit,
    });
    return storeSettings;
  } catch (err) {
    logger.error('woo:fetch store settings failed', {
      error: err instanceof Error ? err : new Error(String(err))
    });
    return null;
  }
}

export async function fetchProductVariations(api: WooCommerceRestApi, parentId: number) {
  try {
    return await fetchAllPaginated(api, `products/${parentId}/variations`, {}, `variations(${parentId})`);
  } catch (err) {
    logger.error('woo:fetch variations failed', {
      parentId,
      error: err instanceof Error ? err : new Error(String(err))
    });
    return [];
  }
}

/**
 * Result of fetching variations for a single parent product
 */
export interface VariationFetchResult {
  parentId: number;
  variations: any[];
  success: boolean;
  error?: Error;
}

/**
 * Fetch variations for a single parent with retry on rate limit
 */
async function fetchVariationsWithRetry(
  api: WooCommerceRestApi,
  parentId: number,
  shopId: string,
  maxRetries: number = 2
): Promise<VariationFetchResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const variations = await fetchProductVariations(api, parentId);
      return { parentId, variations, success: true };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (isRateLimitError(err)) {
        recordRateLimit(shopId);

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.warn('woo:fetch variations rate limited, retrying', {
          parentId,
          shopId,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          backoffMs,
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  return {
    parentId,
    variations: [],
    success: false,
    error: lastError,
  };
}

/**
 * Fetch variations for multiple products in parallel with adaptive concurrency
 *
 * @param api - WooCommerce REST API client
 * @param parentProducts - Array of variable products (must have .id property)
 * @param shopId - Shop ID for concurrency tracking
 * @returns Map of parentId -> variations array
 */
export async function fetchVariationsParallel(
  api: WooCommerceRestApi,
  parentProducts: { id: number; name?: string }[],
  shopId: string
): Promise<Map<number, any[]>> {
  const results = new Map<number, any[]>();

  if (parentProducts.length === 0) {
    return results;
  }

  logger.info('woo:fetch variations parallel start', {
    shopId,
    totalParents: parentProducts.length,
    initialConcurrency: getConcurrency(shopId),
  });

  const queue = [...parentProducts];
  let successCount = 0;
  let failCount = 0;

  while (queue.length > 0) {
    // Get current concurrency (may change during processing)
    const concurrency = getConcurrency(shopId);

    // Take a batch from the queue
    const batch = queue.splice(0, concurrency);

    logger.info('woo:fetch variations batch', {
      shopId,
      batchSize: batch.length,
      remaining: queue.length,
      concurrency,
    });

    // Fetch all in parallel
    const batchResults = await Promise.all(
      batch.map(parent => fetchVariationsWithRetry(api, parent.id, shopId))
    );

    // Process results
    let batchHadRateLimit = false;
    for (const result of batchResults) {
      results.set(result.parentId, result.variations);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        if (result.error && isRateLimitError(result.error)) {
          batchHadRateLimit = true;
        }
      }
    }

    // Record success if no rate limits in this batch (for scale-up logic)
    if (!batchHadRateLimit && batchResults.some(r => r.success)) {
      recordSuccess(shopId);
    }

    // Small delay between batches to be nice to the server
    if (queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info('woo:fetch variations parallel complete', {
    shopId,
    totalParents: parentProducts.length,
    successCount,
    failCount,
    finalConcurrency: getConcurrency(shopId),
  });

  return results;
}

export async function fetchAllCategories(api: WooCommerceRestApi): Promise<Map<number, any>> {
  try {
    const all = await fetchAllPaginated(api, 'products/categories', { hide_empty: false }, 'categories');
    const categoryMap = new Map<number, any>();
    for (const cat of all) {
      if (cat.id) categoryMap.set(cat.id, cat);
    }
    return categoryMap;
  } catch (err) {
    logger.error('woo:fetch all categories failed', {
      error: err instanceof Error ? err : new Error(String(err))
    });
    return new Map();
  }
}

/**
 * Enrich product categories with parent field from category map
 * The WooCommerce products API only returns {id, name, slug} for categories,
 * but we need the parent field to build category hierarchies
 *
 * This function also recursively adds all parent categories to the array,
 * so the buildCategoryPath transform can traverse the full hierarchy
 */
export function enrichProductCategories(product: any, categoryMap: Map<number, any>): any {
  if (!product.categories || !Array.isArray(product.categories)) {
    return product;
  }

  // Set to track all category IDs we've added (prevent duplicates)
  const addedCategoryIds = new Set<number>();
  const allCategories: any[] = [];

  // Helper function to recursively add category and all its parents
  const addCategoryWithParents = (categoryId: number) => {
    // Skip if already added or doesn't exist
    if (addedCategoryIds.has(categoryId) || !categoryMap.has(categoryId)) {
      return;
    }

    const fullCategory = categoryMap.get(categoryId);

    // Add this category
    addedCategoryIds.add(categoryId);
    allCategories.push({
      id: fullCategory.id,
      name: fullCategory.name,
      slug: fullCategory.slug,
      parent: fullCategory.parent || 0,
    });

    // Recursively add parent if it exists
    if (fullCategory.parent && fullCategory.parent > 0) {
      addCategoryWithParents(fullCategory.parent);
    }
  };

  // Process each directly assigned category and add its full hierarchy
  product.categories.forEach((cat: any) => {
    if (cat.id) {
      addCategoryWithParents(cat.id);
    }
  });

  return {
    ...product,
    categories: allCategories,
  };
}
