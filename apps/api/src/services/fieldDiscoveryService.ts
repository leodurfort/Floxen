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

      // Track discovered meta fields
      const metaFieldMap = new Map<string, { count: number; sample: any }>();
      // Track discovered attribute fields
      const attributeFieldMap = new Map<string, { count: number; sample: any }>();

      // Scan all products for meta_data AND attributes
      for (const product of products) {
        // === SCAN META_DATA ===
        if (product.meta_data && Array.isArray(product.meta_data)) {
          for (const meta of product.meta_data) {
            if (!meta.key || typeof meta.key !== 'string') {
              continue;
            }

            // Skip internal WordPress/WooCommerce meta (starts with _)
            // but include common ones that users might want to map
            const key = meta.key;

            // Skip system meta keys that are too technical
            if (this.shouldSkipMetaKey(key)) {
              continue;
            }

            // Track this field
            if (metaFieldMap.has(key)) {
              const existing = metaFieldMap.get(key)!;
              existing.count++;
            } else {
              metaFieldMap.set(key, {
                count: 1,
                sample: meta.value,
              });
            }
          }
        }

        // === SCAN ATTRIBUTES ===
        if (product.attributes && Array.isArray(product.attributes)) {
          for (const attr of product.attributes) {
            if (!attr.name || typeof attr.name !== 'string') {
              continue;
            }

            // Create field path like "attributes.Color"
            const key = `attributes.${attr.name}`;

            // Get the first option as sample value
            const sampleValue = Array.isArray(attr.options) && attr.options.length > 0
              ? attr.options.join(', ')  // Join multiple options
              : null;

            // Track this field
            if (attributeFieldMap.has(key)) {
              const existing = attributeFieldMap.get(key)!;
              existing.count++;
            } else {
              attributeFieldMap.set(key, {
                count: 1,
                sample: sampleValue,
              });
            }
          }
        }
      }

      // Convert meta fields to discovered fields array
      const metaFields = Array.from(metaFieldMap.entries()).map(([key, data]) => ({
        key,
        label: this.generateLabelFromKey(key),
        occurrences: data.count,
        sampleValue: data.sample,
      }));

      // Convert attribute fields to discovered fields array
      const attributeFields = Array.from(attributeFieldMap.entries()).map(([key, data]) => ({
        key,
        label: `${key.split('.')[1]} (Attribute)`,
        occurrences: data.count,
        sampleValue: data.sample,
      }));

      // Combine both types of discovered fields
      result.discovered = [...metaFields, ...attributeFields];

      // Sort by occurrence count (most common first)
      result.discovered.sort((a, b) => b.occurrences - a.occurrences);

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

    if (systemFields.includes(key)) return true;

    return false;
  }

  /**
   * Generate a human-readable label from meta key
   */
  private static generateLabelFromKey(key: string): string {
    // Remove leading underscore
    let label = key.startsWith('_') ? key.substring(1) : key;

    // Replace underscores with spaces
    label = label.replace(/_/g, ' ');

    // Capitalize words
    label = label.replace(/\b\w/g, (char) => char.toUpperCase());

    // Add "(Meta)" suffix
    label = `${label} (Meta)`;

    return label;
  }

  /**
   * Get all fields for a shop (all global fields)
   */
  static async getShopFields(shopId: string): Promise<any[]> {
    const fields = await prisma.wooCommerceField.findMany({
      orderBy: [
        { category: 'asc' },
        { label: 'asc' },
      ],
    });

    return fields;
  }
}
