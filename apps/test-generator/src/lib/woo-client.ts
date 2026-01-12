import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import {
  WooCategory,
  WooProduct,
  WooVariation,
  WooStoreSettings,
  WooBatchRequest,
  WooBatchResponse,
  WooMetaData,
} from '@/types/woocommerce';
import { StoreInfo } from '@/types/session';

/**
 * WooCommerce API Client wrapper
 */
export class WooClient {
  private api: WooCommerceRestApi;
  public storeUrl: string;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string) {
    this.storeUrl = storeUrl;
    this.api = new WooCommerceRestApi({
      url: storeUrl,
      consumerKey,
      consumerSecret,
      version: 'wc/v3',
    });
  }

  /**
   * Test connection by fetching store info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get store settings (currency, units)
   */
  async getStoreSettings(): Promise<StoreInfo> {
    const response = await this.api.get('settings/general');
    const settings: WooStoreSettings[] = response.data;

    const findSetting = (id: string): string => {
      const setting = settings.find((s) => s.id === id);
      return setting?.value || '';
    };

    return {
      currency: findSetting('woocommerce_currency'),
      currencySymbol: findSetting('woocommerce_currency_pos'),
      dimensionUnit: findSetting('woocommerce_dimension_unit'),
      weightUnit: findSetting('woocommerce_weight_unit'),
    };
  }

  // ========================
  // Category Operations
  // ========================

  /**
   * Create a category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    parent?: number;
    meta_data?: WooMetaData[];
  }): Promise<WooCategory> {
    const response = await this.api.post('products/categories', data);
    return response.data;
  }

  /**
   * Get all categories
   */
  async getCategories(params?: { per_page?: number }): Promise<WooCategory[]> {
    const response = await this.api.get('products/categories', {
      per_page: params?.per_page || 100,
    });
    return response.data;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number, force = true): Promise<void> {
    await this.api.delete(`products/categories/${id}`, { force });
  }

  // ========================
  // Product Operations
  // ========================

  /**
   * Create a single product
   */
  async createProduct(data: Partial<WooProduct>): Promise<WooProduct> {
    const response = await this.api.post('products', data);
    return response.data;
  }

  /**
   * Create products in batch
   */
  async createProductsBatch(
    products: Partial<WooProduct>[]
  ): Promise<WooProduct[]> {
    const request: WooBatchRequest<Partial<WooProduct>> = { create: products };
    const response = await this.api.post('products/batch', request);
    const batchResponse: WooBatchResponse<WooProduct> = response.data;
    return batchResponse.create || [];
  }

  /**
   * Get products with pagination
   */
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<WooProduct[]> {
    const response = await this.api.get('products', {
      page: params?.page || 1,
      per_page: params?.per_page || 100,
      status: params?.status || 'any',
    });
    return response.data;
  }

  /**
   * Get all products with a specific meta key
   */
  async getProductsByMeta(
    metaKey: string,
    metaValue: string
  ): Promise<WooProduct[]> {
    const allProducts: WooProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.getProducts({ page, per_page: 100 });
      const filtered = products.filter((p) =>
        p.meta_data?.some((m) => m.key === metaKey && m.value === metaValue)
      );
      allProducts.push(...filtered);
      hasMore = products.length === 100;
      page++;
    }

    return allProducts;
  }

  /**
   * Delete products in batch
   */
  async deleteProductsBatch(ids: number[]): Promise<void> {
    const request: WooBatchRequest<WooProduct> = { delete: ids };
    await this.api.post('products/batch', request);
  }

  /**
   * Delete a single product
   */
  async deleteProduct(id: number, force = true): Promise<void> {
    await this.api.delete(`products/${id}`, { force });
  }

  // ========================
  // Variation Operations
  // ========================

  /**
   * Create variations for a product
   */
  async createVariationsBatch(
    productId: number,
    variations: Partial<WooVariation>[]
  ): Promise<WooVariation[]> {
    const request: WooBatchRequest<Partial<WooVariation>> = {
      create: variations,
    };
    const response = await this.api.post(
      `products/${productId}/variations/batch`,
      request
    );
    const batchResponse: WooBatchResponse<WooVariation> = response.data;
    return batchResponse.create || [];
  }

  /**
   * Get variations for a product
   */
  async getVariations(
    productId: number,
    params?: { per_page?: number }
  ): Promise<WooVariation[]> {
    const response = await this.api.get(`products/${productId}/variations`, {
      per_page: params?.per_page || 100,
    });
    return response.data;
  }

  /**
   * Delete variations in batch
   */
  async deleteVariationsBatch(
    productId: number,
    ids: number[]
  ): Promise<void> {
    const request: WooBatchRequest<WooVariation> = { delete: ids };
    await this.api.post(`products/${productId}/variations/batch`, request);
  }
}

/**
 * Create a WooClient from session data
 */
export function createWooClientFromSession(session: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}): WooClient {
  return new WooClient(
    session.storeUrl,
    session.consumerKey,
    session.consumerSecret
  );
}
