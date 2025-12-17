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
  shopName: string;
  shopCurrency: string;
  siteUrl?: string;
  homeUrl?: string;
  language?: string;
  // Shop-level fields for OpenAI feed
  sellerName?: string;
  sellerUrl?: string;
  sellerPrivacyPolicy?: string;
  sellerTos?: string;
  returnPolicy?: string;
  returnWindow?: number;
}

/**
 * Fetch comprehensive store settings from WooCommerce API
 * Uses only index endpoint - no fallbacks
 */
export async function fetchStoreSettings(api: WooCommerceRestApi): Promise<StoreSettings | null> {
  try {
    logger.info('woo:fetch store settings start');

    // Fetch store information from index endpoint (GET /wp-json/wc/v3)
    const indexResponse = await api.get('');
    const storeInfo = indexResponse.data || {};

    logger.info('woo:fetch store index info', {
      name: storeInfo.name,
      description: storeInfo.description,
      url: storeInfo.url,
    });

    // Fetch currency from general settings
    const generalResponse = await api.get('settings/general');
    const settings = Array.isArray(generalResponse.data) ? generalResponse.data : [];
    const currencySetting = settings.find((s: any) => s.id === 'woocommerce_currency');

    const storeSettings: StoreSettings = {
      shopName: storeInfo.name,
      shopCurrency: currencySetting?.value || 'USD',
      siteUrl: storeInfo.url,
      homeUrl: storeInfo.url,
      language: undefined,
      // Populate seller fields from index endpoint only
      sellerName: storeInfo.name,
      sellerUrl: storeInfo.url,
      sellerPrivacyPolicy: undefined,
      sellerTos: undefined,
      returnPolicy: undefined,
      returnWindow: undefined,
    };

    logger.info('woo:fetch store settings complete', {
      shopName: storeSettings.shopName,
      shopCurrency: storeSettings.shopCurrency,
      hasSellerName: !!storeSettings.sellerName,
      hasSellerUrl: !!storeSettings.sellerUrl,
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
