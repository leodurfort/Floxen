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
