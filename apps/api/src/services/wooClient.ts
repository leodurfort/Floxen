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
 * Retrieves: currency, site name, URLs, language
 */
export async function fetchStoreSettings(api: WooCommerceRestApi): Promise<StoreSettings | null> {
  try {
    logger.info('woo:fetch store settings start');

    // Fetch store information from index endpoint (GET /wp-json/wc/v3)
    let storeInfo: any = {};
    try {
      const indexResponse = await api.get('');
      storeInfo = indexResponse.data || {};
      logger.info('woo:fetch store index info', {
        name: storeInfo.name,
        description: storeInfo.description,
        url: storeInfo.url,
      });
    } catch (err) {
      logger.warn('woo:fetch store index failed', {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }

    // Fetch general settings group
    const generalResponse = await api.get('settings/general');
    const settings = Array.isArray(generalResponse.data) ? generalResponse.data : [];

    // Extract currency setting
    const currencySetting = settings.find((s: any) => s.id === 'woocommerce_currency');

    // Fetch system status for additional info (URLs, pages)
    let systemInfo: any = {};
    let systemSettings: any = {};
    try {
      const systemResponse = await api.get('system_status');

      // Environment data contains URLs and site info
      const environment = systemResponse.data?.environment || {};
      // Settings contains WooCommerce configuration
      systemSettings = systemResponse.data?.settings || {};

      // Extract from environment (where site URLs are located)
      systemInfo = {
        site_title: environment.site_title || storeInfo.name || environment.home_url?.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
        home_url: environment.home_url || storeInfo.url,
        site_url: environment.site_url || storeInfo.url,
      };

      logger.info('woo:system status fetched', {
        hasSiteTitle: !!systemInfo.site_title,
        siteTitle: systemInfo.site_title,
        homeUrl: systemInfo.home_url,
        siteUrl: systemInfo.site_url,
        environmentKeys: Object.keys(environment),
      });
    } catch (err) {
      logger.warn('woo:fetch system status failed, using store index data', {
        error: err instanceof Error ? err : new Error(String(err)),
      });
      // Fallback to store index data if system_status fails
      systemInfo = {
        site_title: storeInfo.name,
        home_url: storeInfo.url,
        site_url: storeInfo.url,
      };
    }

    // Try to fetch additional pages/settings for seller info
    let privacyPolicyUrl: string | undefined;
    let tosUrl: string | undefined;

    try {
      // Use systemSettings that we already fetched above
      const pages = systemSettings?.pages || {};

      // WooCommerce provides page IDs for these, we'd need to fetch the actual pages
      // For now, we'll construct URLs if we have the page IDs and site URL
      if (systemInfo.site_url) {
        if (pages.privacy_policy_page_id) {
          privacyPolicyUrl = `${systemInfo.site_url}/?page_id=${pages.privacy_policy_page_id}`;
        }
        if (pages.terms_and_conditions_page_id) {
          tosUrl = `${systemInfo.site_url}/?page_id=${pages.terms_and_conditions_page_id}`;
        }
      }
    } catch {
      logger.warn('woo:fetch pages for policies failed');
    }

    // Get site name - prioritize index endpoint name over system status
    const siteName = storeInfo.name || systemInfo.site_title || systemInfo.home_url?.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || 'Store';
    const siteUrl = storeInfo.url || systemInfo.home_url || systemInfo.site_url;

    const storeSettings: StoreSettings = {
      shopName: siteName,
      shopCurrency: currencySetting?.value || 'USD',
      siteUrl: systemInfo.site_url || storeInfo.url,
      homeUrl: systemInfo.home_url || storeInfo.url,
      language: systemInfo.language,
      // Populate seller fields - use index endpoint data first
      sellerName: storeInfo.name || siteName,
      sellerUrl: siteUrl,
      sellerPrivacyPolicy: privacyPolicyUrl,
      sellerTos: tosUrl,
      // Return policy - WooCommerce doesn't provide this by default
      // Users will need to set this manually
      returnPolicy: undefined,
      returnWindow: undefined,
    };

    logger.info('woo:fetch store settings complete', {
      shopName: storeSettings.shopName,
      shopCurrency: storeSettings.shopCurrency,
      hasSiteUrl: !!storeSettings.siteUrl,
      hasSellerName: !!storeSettings.sellerName,
      hasSellerUrl: !!storeSettings.sellerUrl,
      hasPrivacyPolicy: !!storeSettings.sellerPrivacyPolicy,
      hasTos: !!storeSettings.sellerTos,
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
