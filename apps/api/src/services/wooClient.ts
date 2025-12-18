import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { decrypt } from '../lib/encryption';
import { logger } from '../lib/logger';

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
  });
}

export async function fetchAllProducts(api: WooCommerceRestApi) {
  logger.info('woo:fetch all products start');
  const all: any[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const response = await api.get('products', { page, per_page: perPage, status: 'publish' });
    all.push(...response.data);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page += 1;
  }
  logger.info('woo:fetch all products complete', { count: all.length });
  return all;
}

export async function fetchModifiedProducts(api: WooCommerceRestApi, after: Date) {
  logger.info('woo:fetch modified products start', { after: after.toISOString() });
  const all: any[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const response = await api.get('products', {
      page,
      per_page: perPage,
      status: 'publish',
      modified_after: after.toISOString(),
    });
    all.push(...response.data);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page += 1;
  }
  logger.info('woo:fetch modified products complete', { count: all.length });
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
  // Shop-level fields for OpenAI feed
  sellerName: string | null;
  sellerUrl: string | null;
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

    // Fetch seller name and URL from WordPress REST API settings endpoint
    // The WooCommerce index endpoint (GET /wp-json/wc/v3/) only returns "namespace" and "routes"
    // It does NOT return store name or URL despite what the WooCommerce docs claim
    let sellerUrl: string | null = null;
    let sellerName: string | null = null;

    try {
      // WordPress REST API /wp/v2/settings contains "title" and "url" fields
      // Use relative path to navigate from /wc/v3 to /wp/v2/settings
      const wpSettingsResponse = await api.get('../wp/v2/settings');
      const wpSettings = wpSettingsResponse.data || {};

      sellerName = wpSettings.title || null;
      sellerUrl = wpSettings.url || null;

      logger.info('woo:fetch WordPress settings success', {
        title: wpSettings.title,
        url: wpSettings.url,
      });
    } catch (wpError: any) {
      logger.error('woo:failed to fetch WordPress settings', {
        error: wpError.message,
        usingFallback: !!fallbackStoreUrl,
      });

      // If WordPress API fails, use fallback URL if provided
      if (fallbackStoreUrl) {
        sellerUrl = fallbackStoreUrl;
      }
    }

    logger.info('woo:extracted seller name and url', {
      sellerName,
      sellerUrl,
      fallbackUsed: !!fallbackStoreUrl && !sellerUrl,
    });

    const storeSettings: StoreSettings = {
      shopCurrency: currencySetting?.value || null,
      dimensionUnit: dimensionUnitSetting?.value || undefined,
      weightUnit: weightUnitSetting?.value || undefined,
      language: undefined,
      sellerName: sellerName,
      sellerUrl: sellerUrl,
      // sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only
    };

    logger.info('woo:fetch store settings complete', {
      shopCurrency: storeSettings.shopCurrency,
      dimensionUnit: storeSettings.dimensionUnit,
      weightUnit: storeSettings.weightUnit,
      sellerName: storeSettings.sellerName,
      sellerUrl: storeSettings.sellerUrl,
    });
    return storeSettings;
  } catch (err) {
    logger.error('woo:fetch store settings failed', {
      error: err instanceof Error ? err : new Error(String(err))
    });
    return null;
  }
}

export async function fetchSingleProduct(api: WooCommerceRestApi, productId: number) {
  logger.info('woo:fetch single product start', { productId: String(productId) });
  try {
    const response = await api.get(`products/${productId}`);
    logger.info('woo:fetch single product complete', { productId: String(productId) });
    return response.data;
  } catch (err) {
    logger.error('woo:fetch single product failed', {
      productId: String(productId),
      error: err instanceof Error ? err : new Error(String(err))
    });
    throw err;
  }
}

export async function fetchProductVariations(api: WooCommerceRestApi, parentId: number) {
  logger.info('woo:fetch variations start', { parentId });
  const all: any[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const response = await api.get(`products/${parentId}/variations`, {
        page,
        per_page: perPage
      });
      all.push(...response.data);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      if (page >= totalPages) break;
      page += 1;
    }
    logger.info('woo:fetch variations complete', { parentId, count: all.length });
    return all;
  } catch (err) {
    logger.error('woo:fetch variations failed', {
      parentId,
      error: err instanceof Error ? err : new Error(String(err))
    });
    return [];
  }
}

/**
 * Fetch all product categories with parent relationships
 * Returns a map of category ID -> full category data including parent field
 */
export async function fetchAllCategories(api: WooCommerceRestApi): Promise<Map<number, any>> {
  logger.info('woo:fetch all categories start');
  const all: any[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const response = await api.get('products/categories', {
        page,
        per_page: perPage,
        hide_empty: false,
      });
      all.push(...response.data);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      if (page >= totalPages) break;
      page += 1;
    }
    logger.info('woo:fetch all categories complete', { count: all.length });

    // Create a map for quick lookups
    const categoryMap = new Map();
    all.forEach(cat => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

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
 */
export function enrichProductCategories(product: any, categoryMap: Map<number, any>): any {
  if (!product.categories || !Array.isArray(product.categories)) {
    return product;
  }

  const enrichedCategories = product.categories.map((cat: any) => {
    const fullCategory = categoryMap.get(cat.id);
    if (fullCategory) {
      // Return the full category data with parent field
      return {
        id: fullCategory.id,
        name: fullCategory.name,
        slug: fullCategory.slug,
        parent: fullCategory.parent || 0,
      };
    }
    // Fallback to original category if not found in map
    return cat;
  });

  return {
    ...product,
    categories: enrichedCategories,
  };
}
