import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import {
  WooCategory,
  WooProduct,
  WooVariation,
  WooStoreSettings,
  WooBatchRequest,
  WooBatchResponse,
  WooMetaData,
  WooProductAttributeTaxonomy,
  WooAttributeTerm,
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
   * Create a category (or return existing if already exists)
   */
  async createCategory(data: {
    name: string;
    slug: string;
    parent?: number;
    meta_data?: WooMetaData[];
  }): Promise<WooCategory> {
    console.log('[WooClient] Creating category:', data.name);
    try {
      const response = await this.api.post('products/categories', data);
      console.log('[WooClient] Category created:', response.data.id, response.data.name);
      return response.data;
    } catch (error) {
      // Check if category already exists
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { code?: string; data?: { resource_id?: number } } } };
        const errorData = axiosError.response?.data;

        if (errorData?.code === 'term_exists' && errorData?.data?.resource_id) {
          console.log('[WooClient] Category already exists, using existing ID:', errorData.data.resource_id);
          // Return a minimal category object with the existing ID
          return {
            id: errorData.data.resource_id,
            name: data.name,
            slug: data.slug,
            parent: data.parent || 0,
            description: '',
            display: 'default',
            image: null,
            menu_order: 0,
            count: 0,
          };
        }

        console.error('[WooClient] Category creation failed:', data.name);
        console.error('[WooClient] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw error;
    }
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

    console.log('[WooClient] Creating products batch:', {
      count: products.length,
      skus: products.map((p) => p.sku).slice(0, 5),
    });

    try {
      const response = await this.api.post('products/batch', request);
      const batchResponse = response.data;

      console.log('[WooClient] Batch response status:', response.status);
      console.log('[WooClient] Batch response keys:', Object.keys(batchResponse));

      // Check for errors in the create array
      const created = batchResponse.create || [];
      const errors = created.filter((item: { error?: { message?: string } }) => item.error);

      if (errors.length > 0) {
        console.error('[WooClient] Batch creation errors:', JSON.stringify(errors.slice(0, 3), null, 2));
      }

      // Filter out items with errors
      const successful = created.filter((item: { error?: unknown; id?: number }) => !item.error && item.id);
      console.log('[WooClient] Successfully created:', successful.length, 'products');

      return successful;
    } catch (error) {
      console.error('[WooClient] Batch creation failed:', error);
      // Log the full error response if available
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        console.error('[WooClient] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
        console.error('[WooClient] Error status:', axiosError.response?.status);
      }
      throw error;
    }
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

    console.log('[WooClient] Creating variations batch for product:', productId, 'count:', variations.length);

    try {
      const response = await this.api.post(
        `products/${productId}/variations/batch`,
        request
      );
      const batchResponse = response.data;

      // Check for errors in the create array
      const created = batchResponse.create || [];
      const errors = created.filter((item: { error?: { message?: string } }) => item.error);

      if (errors.length > 0) {
        console.error('[WooClient] Variation batch errors:', JSON.stringify(errors.slice(0, 3), null, 2));
      }

      const successful = created.filter((item: { error?: unknown; id?: number }) => !item.error && item.id);
      console.log('[WooClient] Successfully created:', successful.length, 'variations');

      return successful;
    } catch (error) {
      console.error('[WooClient] Variation batch creation failed:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        console.error('[WooClient] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw error;
    }
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

  // ========================
  // Product Attribute Operations
  // ========================

  /**
   * Get all global product attributes (taxonomies like pa_color, pa_brand)
   */
  async getProductAttributes(): Promise<WooProductAttributeTaxonomy[]> {
    const response = await this.api.get('products/attributes');
    return response.data;
  }

  /**
   * Create a global product attribute (taxonomy)
   * This creates attributes like pa_brand that can be used across products
   */
  async createProductAttribute(data: {
    name: string;
    slug?: string;
    type?: string;
    order_by?: string;
    has_archives?: boolean;
  }): Promise<WooProductAttributeTaxonomy> {
    console.log('[WooClient] Creating product attribute:', data.name);
    try {
      const response = await this.api.post('products/attributes', data);
      console.log('[WooClient] Product attribute created:', response.data.id, response.data.name);
      return response.data;
    } catch (error) {
      // Check if attribute already exists
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { code?: string; data?: { resource_id?: number } } } };
        const errorData = axiosError.response?.data;

        if (errorData?.code === 'woocommerce_rest_duplicate_attribute_slug' ||
            errorData?.code === 'term_exists') {
          console.log('[WooClient] Product attribute already exists, fetching existing...');
          // Fetch all attributes to find the existing one
          const attributes = await this.getProductAttributes();
          const existing = attributes.find(a => a.slug === (data.slug || data.name.toLowerCase()));
          if (existing) {
            return existing;
          }
        }

        console.error('[WooClient] Product attribute creation failed:', data.name);
        console.error('[WooClient] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Delete a product attribute
   */
  async deleteProductAttribute(id: number): Promise<void> {
    await this.api.delete(`products/attributes/${id}`, { force: true });
  }

  /**
   * Get all terms for a product attribute
   */
  async getAttributeTerms(attributeId: number, params?: { per_page?: number }): Promise<WooAttributeTerm[]> {
    const response = await this.api.get(`products/attributes/${attributeId}/terms`, {
      per_page: params?.per_page || 100,
    });
    return response.data;
  }

  /**
   * Create a term for a product attribute
   */
  async createAttributeTerm(
    attributeId: number,
    data: { name: string; slug?: string; description?: string }
  ): Promise<WooAttributeTerm> {
    console.log('[WooClient] Creating attribute term:', data.name, 'for attribute:', attributeId);
    try {
      const response = await this.api.post(`products/attributes/${attributeId}/terms`, data);
      console.log('[WooClient] Attribute term created:', response.data.id, response.data.name);
      return response.data;
    } catch (error) {
      // Check if term already exists
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { code?: string; data?: { resource_id?: number } } } };
        const errorData = axiosError.response?.data;

        if (errorData?.code === 'term_exists' && errorData?.data?.resource_id) {
          console.log('[WooClient] Attribute term already exists, using existing ID:', errorData.data.resource_id);
          return {
            id: errorData.data.resource_id,
            name: data.name,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            description: data.description || '',
            menu_order: 0,
            count: 0,
          };
        }

        console.error('[WooClient] Attribute term creation failed:', data.name);
        console.error('[WooClient] Error response:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Delete an attribute term
   */
  async deleteAttributeTerm(attributeId: number, termId: number): Promise<void> {
    await this.api.delete(`products/attributes/${attributeId}/terms/${termId}`, { force: true });
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
