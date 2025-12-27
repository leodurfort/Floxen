import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { decrypt } from '../lib/encryption';
import { logger } from '../lib/logger';

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
