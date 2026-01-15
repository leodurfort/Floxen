/**
 * FieldDiscoveryService
 *
 * Scans a shop's WooCommerce products to discover custom meta_data fields
 * and saves them as shop-specific WooCommerce fields for mapping.
 */

import { prisma } from '../lib/prisma';
import { createWooClient } from './wooClient';
import { logger } from '../lib/logger';

interface DiscoveredField {
  key: string;           // e.g., "_gtin", "_brand"
  label: string;         // e.g., "GTIN (Meta)", "Brand (Meta)"
  occurrences: number;   // How many products have this field
  sampleValue: any;      // Example value from first occurrence
}

interface DiscoveryResult {
  discovered: DiscoveredField[];
  saved: number;
  skipped: number;
  errors: string[];
}

export class FieldDiscoveryService {
  /**
   * Discover meta_data fields in a shop's products
   */
  static async discoverFields(shopId: string): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      discovered: [],
      saved: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Get shop with WooCommerce credentials
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
      });

      if (!shop) {
        throw new Error('Shop not found');
      }

      if (!shop.wooConsumerKey || !shop.wooConsumerSecret) {
        throw new Error('Shop not connected to WooCommerce');
      }

      // Create WooCommerce client
      const wooClient = createWooClient({
        storeUrl: shop.wooStoreUrl,
        consumerKey: shop.wooConsumerKey,
        consumerSecret: shop.wooConsumerSecret,
      });

      // Fetch ALL products from the shop (paginated)
      logger.info('Fetching products for field discovery', { shopId, sellerName: shop.sellerName });

      const products: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wooClient.get('products', {
          per_page: 100,
          page,
          status: 'publish',
        });

        const pageProducts = response.data as any[];
        products.push(...pageProducts);

        logger.info('Field discovery: fetched page', {
          shopId,
          page,
          productsInPage: pageProducts.length,
          totalSoFar: products.length,
        });

        // Check if there are more pages
        hasMore = pageProducts.length === 100;
        page++;
      }

      if (!products || products.length === 0) {
        logger.warn('No products found for discovery', { shopId });
        return result;
      }

      logger.info('Analyzing products for meta_data and attribute fields', {
        shopId,
        productCount: products.length
      });

      const metaFieldMap = new Map<string, { count: number; sample: any }>();
      const attributeFieldMap = new Map<string, { count: number; sample: any }>();

      for (const product of products) {
        this.scanMetaData(product, metaFieldMap);
        this.scanAttributes(product, attributeFieldMap);
      }

      const metaFields = this.mapToDiscoveredFields(metaFieldMap, (key) => this.generateLabelFromKey(key));
      const attributeFields = this.mapToDiscoveredFields(attributeFieldMap, (key) => `${key.split('.')[1]} (Attribute)`);

      result.discovered = [...metaFields, ...attributeFields].sort((a, b) => b.occurrences - a.occurrences);

      logger.info('Field discovery complete', {
        shopId,
        totalDiscovered: result.discovered.length,
        metaFields: metaFields.length,
        attributeFields: attributeFields.length,
      });

      // Save discovered fields to database
      await this.saveDiscoveredFields(shopId, result.discovered, result);

      return result;
    } catch (error) {
      logger.error('Field discovery failed', {
        shopId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Save discovered fields to woocommerce_fields table
   */
  private static async saveDiscoveredFields(
    shopId: string,
    fields: DiscoveredField[],
    result: DiscoveryResult
  ): Promise<void> {
    for (const field of fields) {
      try {
        // Determine field value and category
        // If key already starts with 'attributes.', use as-is
        // Otherwise, it's a meta field, so prefix with 'meta_data.'
        const value = field.key.startsWith('attributes.')
          ? field.key
          : `meta_data.${field.key}`;

        const category = field.key.startsWith('attributes.') ? 'Attributes' : 'Meta';

        // Check if this field already exists globally
        const existing = await prisma.wooCommerceField.findUnique({
          where: {
            value,
          },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Create new discovered field (global, not shop-specific)
        await prisma.wooCommerceField.create({
          data: {
            value,
            label: field.label,
            description: `Found in ${field.occurrences} products. Example: ${JSON.stringify(field.sampleValue).substring(0, 100)}`,
            category,
          },
        });

        result.saved++;
      } catch (error) {
        logger.error('Failed to save discovered field', {
          shopId,
          field: field.key,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        result.errors.push(`Failed to save ${field.key}: ${error}`);
      }
    }
  }

  /**
   * Determine if a meta key should be skipped
   */
  private static shouldSkipMetaKey(key: string): boolean {
    // Skip WordPress internal fields
    if (key.startsWith('_wp_')) return true;
    if (key.startsWith('_edit_')) return true;
    if (key.startsWith('_oembed_')) return true;

    // Skip WooCommerce system fields (but keep useful ones)
    const systemFields = [
      '_product_attributes',
      '_default_attributes',
      '_virtual',
      '_downloadable',
      '_download_limit',
      '_download_expiry',
      '_stock',
      '_stock_status',
      '_backorders',
      '_sold_individually',
      '_manage_stock',
      '_tax_status',
      '_tax_class',
      '_purchase_note',
      '_featured',
      '_thumbnail_id',
      '_product_image_gallery',
      '_product_version',
      '_price',
      '_regular_price',
      '_sale_price',
      '_sale_price_dates_from',
      '_sale_price_dates_to',
    ];

    return systemFields.includes(key);
  }

  private static generateLabelFromKey(key: string): string {
    const label = (key.startsWith('_') ? key.substring(1) : key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    return `${label} (Meta)`;
  }

  private static scanMetaData(product: any, fieldMap: Map<string, { count: number; sample: any }>): void {
    if (!Array.isArray(product.meta_data)) return;

    for (const meta of product.meta_data) {
      if (!meta.key || typeof meta.key !== 'string' || this.shouldSkipMetaKey(meta.key)) continue;
      this.trackField(fieldMap, meta.key, meta.value);
    }
  }

  private static scanAttributes(product: any, fieldMap: Map<string, { count: number; sample: any }>): void {
    if (!Array.isArray(product.attributes)) return;

    for (const attr of product.attributes) {
      if (!attr.name || typeof attr.name !== 'string') continue;
      const key = `attributes.${attr.name}`;
      const sample = Array.isArray(attr.options) && attr.options.length > 0 ? attr.options.join(', ') : null;
      this.trackField(fieldMap, key, sample);
    }
  }

  private static trackField(fieldMap: Map<string, { count: number; sample: any }>, key: string, sample: any): void {
    const existing = fieldMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      fieldMap.set(key, { count: 1, sample });
    }
  }

  private static mapToDiscoveredFields(
    fieldMap: Map<string, { count: number; sample: any }>,
    labelFn: (key: string) => string
  ): DiscoveredField[] {
    return Array.from(fieldMap.entries()).map(([key, data]) => ({
      key,
      label: labelFn(key),
      occurrences: data.count,
      sampleValue: data.sample,
    }));
  }

  static async getShopFields(shopId: string): Promise<any[]> {
    return prisma.wooCommerceField.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });
  }
}
