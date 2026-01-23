/**
 * Main Product Generator - Orchestrates creation of all products in WooCommerce
 *
 * Supports resuming interrupted generations by checking for existing items
 * and skipping already-created categories, products, and variations.
 *
 * Brand Storage Methods (EC-BRD-01 through EC-BRD-04):
 * - taxonomy: Uses pa_brand global attribute taxonomy
 * - attribute: Uses a visible "Brand" product attribute
 * - meta: Uses product meta_data with key "_brand"
 * - none: No brand information stored
 */

import { WooClient } from './woo-client';
import { getPlaceholderGallery } from './placeholder-images';
import { CATEGORIES, getCategoriesByHierarchy, CategoryDefinition } from '@/data/categories';
import { ALL_PRODUCTS, PRODUCT_COUNTS } from '@/data/products';
import { BRAND_LIST } from '@/data/brands';
import {
  WINTER_SPORTS_CATEGORIES,
  getWinterSportsCategoriesByHierarchy,
  ALL_WINTER_SPORTS_PRODUCTS,
  WINTER_SPORTS_PRODUCT_COUNTS,
  getWinterSportsBrandList,
} from '@/data/winter-sports';
import { FeedType } from '@/types/feed';
import {
  ProductDefinition,
  SimpleProductDefinition,
  VariableProductDefinition,
  GroupedProductDefinition,
  VariationDefinition,
  BrandStorageMethod,
  GtinStorageMethod,
} from '@/types/product';
import {
  GeneratorEvent,
  ProgressEvent,
  CompleteEvent,
  ErrorEvent,
  GenerationSummary,
  GeneratorPhase,
} from '@/types/events';
import { WooMetaData, WooProduct, WooProductAttribute, WooCategory } from '@/types/woocommerce';

const GENERATOR_META_KEY = '_generated_by';
const GENERATOR_META_VALUE = 'woo-test-generator';
const BATCH_SIZE = 50; // Products per batch request
const BRAND_ATTRIBUTE_SLUG = 'pa_brand';

/**
 * Main Product Generator class
 */
export class ProductGenerator {
  private wooClient: WooClient;
  private feedType: FeedType;
  private categoryIdMap: Map<string, number> = new Map();
  private productIdMap: Map<string, number> = new Map(); // SKU -> WooCommerce ID
  private productsWithVariations: Set<number> = new Set(); // Product IDs that already have variations
  private startTime: number = 0;
  private isResume: boolean = false;

  // Brand taxonomy tracking
  private brandAttributeId: number | null = null; // ID of the pa_brand attribute
  private brandTermIdMap: Map<string, number> = new Map(); // Brand name -> term ID

  // Resume tracking for relationships and reviews
  private productsWithRelationships: Set<number> = new Set(); // Product IDs that already have cross-sell/upsell
  private productsWithReviews: Set<number> = new Set(); // Product IDs that already have reviews

  // Counters for summary
  private brandsCreated = 0;
  private categoriesCreated = 0;
  private simpleProductsCreated = 0;
  private variableProductsCreated = 0;
  private variationsCreated = 0;
  private groupedProductsCreated = 0;
  private relationshipsCreated = { related: 0, crossSell: 0, upsell: 0 };
  private reviewsCreated = 0;

  // Brand storage distribution tracking
  private brandDistribution = {
    taxonomy: 0,
    attribute: 0,
    meta: 0,
    none: 0,
  };

  // Resume counters (items found from previous run)
  private brandsSkipped = 0;
  private categoriesSkipped = 0;
  private productsSkipped = 0;
  private variationsSkipped = 0;
  private relationshipsSkipped = 0;
  private reviewsSkipped = 0;

  constructor(wooClient: WooClient, feedType: FeedType = 'comprehensive') {
    this.wooClient = wooClient;
    this.feedType = feedType;
  }

  /**
   * Get the products based on feed type
   */
  private getProducts(): ProductDefinition[] {
    if (this.feedType === 'winter-sports') {
      return ALL_WINTER_SPORTS_PRODUCTS;
    }
    return ALL_PRODUCTS;
  }

  /**
   * Get categories based on feed type
   */
  private getCategories(): CategoryDefinition[] {
    if (this.feedType === 'winter-sports') {
      return WINTER_SPORTS_CATEGORIES;
    }
    return CATEGORIES;
  }

  /**
   * Get categories by hierarchy based on feed type
   */
  private getCategoriesByHierarchy(): CategoryDefinition[] {
    if (this.feedType === 'winter-sports') {
      return getWinterSportsCategoriesByHierarchy();
    }
    return getCategoriesByHierarchy();
  }

  /**
   * Get brand list based on feed type
   */
  private getBrandList(): { name: string }[] {
    if (this.feedType === 'winter-sports') {
      return getWinterSportsBrandList();
    }
    return BRAND_LIST;
  }

  /**
   * Get product counts based on feed type
   */
  private getProductCounts(): { total: number; simple: number; variable: number; grouped: number; variations: number } {
    if (this.feedType === 'winter-sports') {
      return {
        total: WINTER_SPORTS_PRODUCT_COUNTS.total,
        simple: WINTER_SPORTS_PRODUCT_COUNTS.total, // All are simple for winter-sports
        variable: 0,
        grouped: 0,
        variations: 0,
      };
    }
    return PRODUCT_COUNTS;
  }

  /**
   * Check for existing generated items to support resume functionality
   * This queries WooCommerce for categories, products, and brand attributes
   */
  private async *checkExistingItems(): AsyncGenerator<ProgressEvent> {
    yield this.progress('checking', 0, 4, 'Checking for existing generated items...');

    // Check existing brand attribute
    try {
      const attributes = await this.wooClient.getProductAttributes();
      const brandAttr = attributes.find((a) => a.slug === 'brand' || a.slug === BRAND_ATTRIBUTE_SLUG);
      if (brandAttr) {
        this.brandAttributeId = brandAttr.id;
        console.log(`[Generator] Found existing brand attribute: ${brandAttr.id}`);

        // Fetch existing brand terms
        const terms = await this.wooClient.getAttributeTerms(brandAttr.id);
        for (const term of terms) {
          this.brandTermIdMap.set(term.name, term.id);
          this.brandsSkipped++;
        }
        console.log(`[Generator] Found ${this.brandsSkipped} existing brand terms`);
      }
    } catch (error) {
      console.error('[Generator] Failed to fetch existing brand attribute:', error);
    }

    yield this.progress('checking', 1, 4, 'Checking existing categories...');

    // Check existing categories
    try {
      const existingCategories = await this.wooClient.getCategories({ per_page: 100 });
      for (const cat of existingCategories) {
        // Map by slug for matching with our category definitions
        this.categoryIdMap.set(cat.slug, cat.id);
        this.categoriesSkipped++;
      }
      console.log(`[Generator] Found ${this.categoriesSkipped} existing categories`);
    } catch (error) {
      console.error('[Generator] Failed to fetch existing categories:', error);
    }

    yield this.progress('checking', 2, 4, 'Checking existing products...');

    // Check existing products with our meta tag
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const products = await this.wooClient.getProducts({ page, per_page: 100 });

        for (const product of products) {
          const isGenerated = product.meta_data?.some(
            (m) => m.key === GENERATOR_META_KEY && m.value === GENERATOR_META_VALUE
          );

          if (isGenerated && product.sku) {
            this.productIdMap.set(product.sku, product.id);
            this.productsSkipped++;

            // For variable products, check if they have variations
            if (product.type === 'variable' && product.variations && product.variations.length > 0) {
              this.productsWithVariations.add(product.id);
              this.variationsSkipped += product.variations.length;
            }

            // Track products that already have relationships (cross-sell/upsell)
            const hasCrossSell = product.cross_sell_ids && product.cross_sell_ids.length > 0;
            const hasUpsell = product.upsell_ids && product.upsell_ids.length > 0;
            if (hasCrossSell || hasUpsell) {
              this.productsWithRelationships.add(product.id);
              this.relationshipsSkipped++;
            }
          }
        }

        hasMore = products.length === 100;
        page++;
      }

      console.log(`[Generator] Found ${this.productsSkipped} existing generated products`);
      console.log(`[Generator] Found ${this.productsWithVariations.size} products with variations`);
    } catch (error) {
      console.error('[Generator] Failed to fetch existing products:', error);
    }

    yield this.progress('checking', 3, 5, 'Checking existing reviews...');

    // Check existing reviews (reviews don't have meta_data, so we check by product_id)
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const reviews = await this.wooClient.getReviews({ page, per_page: 100 });

        for (const review of reviews) {
          // Track unique products that have reviews
          if (!this.productsWithReviews.has(review.product_id)) {
            this.productsWithReviews.add(review.product_id);
            this.reviewsSkipped++;
          }
        }

        hasMore = reviews.length === 100;
        page++;
      }

      console.log(`[Generator] Found ${this.productsWithReviews.size} products with existing reviews`);
    } catch (error) {
      console.error('[Generator] Failed to fetch existing reviews:', error);
    }

    yield this.progress('checking', 5, 5, 'Resume check complete');

    // Determine if this is a resume
    this.isResume = this.productsSkipped > 0 || this.categoriesSkipped > 0 || this.brandsSkipped > 0 || this.reviewsSkipped > 0;
    if (this.isResume) {
      console.log(`[Generator] Resuming generation - skipping ${this.brandsSkipped} brands, ${this.categoriesSkipped} categories, ${this.productsSkipped} products`);
    }
  }

  /**
   * Main generation method - yields progress events
   * Automatically resumes from where a previous generation left off
   */
  async *generate(): AsyncGenerator<GeneratorEvent> {
    this.startTime = Date.now();

    try {
      // Check for existing items to enable resume
      yield* this.checkExistingItems();

      // Phase 1: Brands (pa_brand taxonomy and terms)
      yield* this.generateBrands();

      // Phase 2: Categories
      yield* this.generateCategories();

      // Phase 3: Simple products
      yield* this.generateSimpleProducts();

      // Phase 4: Variable products (without variations)
      yield* this.generateVariableProducts();

      // Phase 5: Variations for variable products
      yield* this.generateVariations();

      // Phase 6: Grouped products
      yield* this.generateGroupedProducts();

      // Phase 7: Product relationships (cross-sell, upsell)
      yield* this.generateRelationships();

      // Phase 8: Product reviews
      yield* this.generateReviews();

      // Complete
      yield this.buildCompleteEvent();
    } catch (error) {
      yield this.buildErrorEvent(error);
    }
  }

  /**
   * Generate brand attribute taxonomy and terms
   * Creates pa_brand attribute and terms for all brands used in products with taxonomy storage
   */
  private async *generateBrands(): AsyncGenerator<ProgressEvent> {
    const brands = this.getBrandList();
    const total = brands.length + 1; // +1 for attribute creation
    let current = 0;

    // Create or get the Brand attribute (pa_brand)
    if (!this.brandAttributeId) {
      current++;
      yield this.progress('brands', current, total, 'Creating Brand attribute taxonomy...');

      try {
        const brandAttr = await this.wooClient.createProductAttribute({
          name: 'Brand',
          slug: 'brand',
          type: 'select',
          order_by: 'name',
          has_archives: true,
        });
        this.brandAttributeId = brandAttr.id;
        console.log(`[Generator] Created Brand attribute with ID: ${brandAttr.id}`);
      } catch (error) {
        console.error('[Generator] Failed to create Brand attribute:', error);
        throw error;
      }
    } else {
      current++;
      yield this.progress('brands', current, total, 'Brand attribute exists (skipped)');
    }

    // Create brand terms
    for (const brand of brands) {
      current++;

      // Skip if term already exists
      if (this.brandTermIdMap.has(brand.name)) {
        yield this.progress('brands', current, total, `Brand term exists: ${brand.name} (skipped)`);
        continue;
      }

      yield this.progress('brands', current, total, `Creating brand term: ${brand.name}`);

      try {
        const term = await this.wooClient.createAttributeTerm(this.brandAttributeId!, {
          name: brand.name,
          slug: brand.name.toLowerCase().replace(/\s+/g, '-'),
        });
        this.brandTermIdMap.set(brand.name, term.id);
        this.brandsCreated++;
      } catch (error) {
        console.error(`[Generator] Failed to create brand term ${brand.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Generate categories in hierarchy order
   * Skips categories that already exist (resume support)
   */
  private async *generateCategories(): AsyncGenerator<ProgressEvent> {
    const categories = this.getCategoriesByHierarchy();
    const total = categories.length;
    let current = 0;

    for (const category of categories) {
      current++;

      // Skip if category already exists (from resume check)
      if (this.categoryIdMap.has(category.slug)) {
        yield this.progress('categories', current, total, `Category exists: ${category.name} (skipped)`);
        continue;
      }

      yield this.progress('categories', current, total, `Creating category: ${category.name}`);

      const parentId = category.parent
        ? this.categoryIdMap.get(category.parent)
        : undefined;

      try {
        const created = await this.wooClient.createCategory({
          name: category.name,
          slug: category.slug,
          parent: parentId,
          meta_data: [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }],
        });

        this.categoryIdMap.set(category.slug, created.id);
        this.categoriesCreated++;
      } catch (error) {
        console.error(`Failed to create category ${category.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Generate simple products in batches
   * Skips products that already exist (resume support)
   */
  private async *generateSimpleProducts(): AsyncGenerator<ProgressEvent> {
    const simpleProducts = this.getProducts().filter(
      (p): p is SimpleProductDefinition => p.type === 'simple'
    );

    // Filter out products that already exist
    const productsToCreate = simpleProducts.filter(
      (p) => !this.productIdMap.has(p.sku)
    );

    const skipped = simpleProducts.length - productsToCreate.length;
    if (skipped > 0) {
      console.log(`[Generator] Skipping ${skipped} existing simple products`);
    }

    const total = productsToCreate.length;
    if (total === 0) {
      yield this.progress('simple-products', simpleProducts.length, simpleProducts.length, 'All simple products exist (skipped)');
      return;
    }

    for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
      const batch = productsToCreate.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress(
        'simple-products',
        current,
        total,
        `Creating simple products: ${current}/${total}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
      );

      const wooProducts = batch.map((product) =>
        this.mapSimpleProduct(product)
      );

      try {
        const created = await this.wooClient.createProductsBatch(wooProducts);
        created.forEach((p) => {
          this.productIdMap.set(p.sku, p.id);
        });
        this.simpleProductsCreated += created.length;
      } catch (error) {
        console.error('Failed to create simple products batch:', error);
        throw error;
      }
    }
  }

  /**
   * Generate variable products (parent products only)
   * Skips products that already exist (resume support)
   */
  private async *generateVariableProducts(): AsyncGenerator<ProgressEvent> {
    const variableProducts = this.getProducts().filter(
      (p): p is VariableProductDefinition => p.type === 'variable'
    );

    // Filter out products that already exist
    const productsToCreate = variableProducts.filter(
      (p) => !this.productIdMap.has(p.sku)
    );

    const skipped = variableProducts.length - productsToCreate.length;
    if (skipped > 0) {
      console.log(`[Generator] Skipping ${skipped} existing variable products`);
    }

    const total = productsToCreate.length;
    if (total === 0) {
      yield this.progress('variable-products', variableProducts.length, variableProducts.length, 'All variable products exist (skipped)');
      return;
    }

    for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
      const batch = productsToCreate.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress(
        'variable-products',
        current,
        total,
        `Creating variable products: ${current}/${total}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
      );

      const wooProducts = batch.map((product) =>
        this.mapVariableProduct(product)
      );

      try {
        const created = await this.wooClient.createProductsBatch(wooProducts);
        created.forEach((p) => {
          this.productIdMap.set(p.sku, p.id);
        });
        this.variableProductsCreated += created.length;
      } catch (error) {
        console.error('Failed to create variable products batch:', error);
        throw error;
      }
    }
  }

  /**
   * Generate variations for all variable products
   * Skips products that already have variations (resume support)
   */
  private async *generateVariations(): AsyncGenerator<ProgressEvent> {
    const variableProducts = this.getProducts().filter(
      (p): p is VariableProductDefinition => p.type === 'variable'
    );

    // Filter to only products that need variations
    const productsNeedingVariations = variableProducts.filter((p) => {
      const productId = this.productIdMap.get(p.sku);
      return productId && !this.productsWithVariations.has(productId);
    });

    const skippedProducts = variableProducts.length - productsNeedingVariations.length;
    if (skippedProducts > 0) {
      console.log(`[Generator] Skipping variations for ${skippedProducts} products that already have them`);
    }

    const totalVariations = productsNeedingVariations.reduce(
      (sum, p) => sum + p.variations.length,
      0
    );

    if (totalVariations === 0) {
      yield this.progress('variations', 1, 1, 'All variations exist (skipped)');
      return;
    }

    let createdVariations = 0;

    for (const product of productsNeedingVariations) {
      const productId = this.productIdMap.get(product.sku);
      if (!productId) {
        console.error(`Product ID not found for SKU: ${product.sku}`);
        continue;
      }

      // Create variations in batches
      for (let i = 0; i < product.variations.length; i += BATCH_SIZE) {
        const batch = product.variations.slice(i, i + BATCH_SIZE);

        yield this.progress(
          'variations',
          createdVariations + batch.length,
          totalVariations,
          `Creating variations for ${product.sku}: ${i + batch.length}/${product.variations.length}${skippedProducts > 0 ? ` (${skippedProducts} products skipped)` : ''}`
        );

        const wooVariations = batch.map((variation) => {
          // Build base variation object
          const wooVariation: Record<string, unknown> = {
            sku: variation.sku,
            regular_price: variation.regularPrice,
            sale_price: variation.salePrice || '',
            manage_stock: true,
            stock_quantity: variation.stockQuantity ?? 10,
            stock_status: variation.stockStatus || 'instock',
            attributes: Object.entries(variation.attributes).map(
              ([name, option]) => ({
                id: 0,
                name,
                option,
              })
            ),
            meta_data: this.buildVariationGtinMeta(variation),
          };

          // Add physical attributes if present (EC-DIM-01 to EC-DIM-10)
          if (variation.weight) {
            wooVariation.weight = variation.weight;
          }
          if (variation.dimensions) {
            wooVariation.dimensions = {
              length: variation.dimensions.length,
              width: variation.dimensions.width,
              height: variation.dimensions.height,
            };
          }

          // Add sale dates if present (EC-PRC-08 to EC-PRC-10)
          if (variation.saleDates) {
            wooVariation.date_on_sale_from = variation.saleDates.from;
            wooVariation.date_on_sale_to = variation.saleDates.to;
          }

          return wooVariation;
        });

        try {
          const created = await this.wooClient.createVariationsBatch(
            productId,
            wooVariations
          );
          this.variationsCreated += created.length;
          createdVariations += created.length;
        } catch (error) {
          console.error(
            `Failed to create variations for ${product.sku}:`,
            error
          );
          throw error;
        }
      }
    }
  }

  /**
   * Generate grouped products
   * Skips products that already exist (resume support)
   */
  private async *generateGroupedProducts(): AsyncGenerator<ProgressEvent> {
    const groupedProducts = this.getProducts().filter(
      (p): p is GroupedProductDefinition => p.type === 'grouped'
    );

    // Filter out products that already exist
    const productsToCreate = groupedProducts.filter(
      (p) => !this.productIdMap.has(p.sku)
    );

    const skipped = groupedProducts.length - productsToCreate.length;
    if (skipped > 0) {
      console.log(`[Generator] Skipping ${skipped} existing grouped products`);
    }

    const total = productsToCreate.length;
    if (total === 0) {
      yield this.progress('grouped-products', groupedProducts.length, groupedProducts.length, 'All grouped products exist (skipped)');
      return;
    }

    let current = 0;

    for (const product of productsToCreate) {
      current++;
      yield this.progress(
        'grouped-products',
        current,
        total,
        `Creating grouped product: ${product.name}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
      );

      // Map child SKUs to WooCommerce IDs
      const groupedIds = product.groupedProductSkus
        .map((sku) => this.productIdMap.get(sku))
        .filter((id): id is number => id !== undefined);

      if (groupedIds.length === 0) {
        console.warn(`No child products found for grouped product: ${product.sku}`);
        continue;
      }

      const wooProduct = this.mapGroupedProduct(product, groupedIds);

      try {
        const created = await this.wooClient.createProduct(wooProduct);
        this.productIdMap.set(product.sku, created.id);
        this.groupedProductsCreated++;
      } catch (error) {
        console.error(`Failed to create grouped product ${product.sku}:`, error);
        throw error;
      }
    }
  }

  /**
   * Generate product relationships (cross-sell, upsell)
   * EC-REL-01 to EC-REL-06 coverage
   * Note: related_ids is read-only in WooCommerce API, we can only set cross_sell_ids and upsell_ids
   * Skips products that already have relationships (resume support)
   */
  private async *generateRelationships(): AsyncGenerator<ProgressEvent> {
    // Get products that should have relationships (40% per PRD)
    const productsToUpdate = this.getProducts().filter((p, index) => {
      // 40% have relationships (indices 0-3 out of each 10)
      if (!(index % 10 < 4) || !this.productIdMap.has(p.sku)) {
        return false;
      }
      // Skip products that already have relationships (resume support)
      const productId = this.productIdMap.get(p.sku);
      if (productId && this.productsWithRelationships.has(productId)) {
        return false;
      }
      return true;
    });

    // Count skipped products for logging
    const totalEligible = this.getProducts().filter((p, index) => index % 10 < 4 && this.productIdMap.has(p.sku)).length;
    const skipped = totalEligible - productsToUpdate.length;
    if (skipped > 0) {
      console.log(`[Generator] Skipping ${skipped} products that already have relationships`);
    }

    const total = productsToUpdate.length;
    if (total === 0) {
      yield this.progress('relationships', 1, 1, `All relationships exist (${skipped} skipped)`);
      return;
    }

    // Build updates in batches
    const updates: Array<{ id: number; cross_sell_ids?: number[]; upsell_ids?: number[] }> = [];

    for (const product of productsToUpdate) {
      const productId = this.productIdMap.get(product.sku);
      if (!productId) continue;

      // Get other products in the same category for relationships
      const categoryProducts = this.getProducts()
        .filter((p) => p.categories.some((c) => product.categories.includes(c)) && p.sku !== product.sku)
        .map((p) => this.productIdMap.get(p.sku))
        .filter((id): id is number => id !== undefined);

      if (categoryProducts.length === 0) continue;

      const update: { id: number; cross_sell_ids?: number[]; upsell_ids?: number[] } = { id: productId };

      // 50% of relationship products get cross-sells
      if (updates.length % 2 === 0) {
        update.cross_sell_ids = categoryProducts.slice(0, Math.min(3, categoryProducts.length));
        this.relationshipsCreated.crossSell += update.cross_sell_ids.length;
      }

      // 50% of relationship products get upsells
      if (updates.length % 2 === 1 || categoryProducts.length > 3) {
        update.upsell_ids = categoryProducts.slice(3, Math.min(6, categoryProducts.length));
        if (update.upsell_ids.length === 0 && categoryProducts.length > 0) {
          update.upsell_ids = categoryProducts.slice(0, Math.min(2, categoryProducts.length));
        }
        this.relationshipsCreated.upsell += update.upsell_ids.length;
      }

      updates.push(update);
    }

    // Process in batches
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, updates.length);

      yield this.progress(
        'relationships',
        current,
        updates.length,
        `Setting product relationships: ${current}/${updates.length}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
      );

      try {
        await this.wooClient.updateProductsBatch(batch as Array<{ id: number } & Partial<WooProduct>>);
      } catch (error) {
        console.error('Failed to update product relationships:', error);
        // Don't throw - relationships are optional
      }
    }
  }

  /**
   * Generate product reviews
   * EC-REV-01 to EC-REV-06 coverage
   * Creates actual reviews via WooCommerce API
   * Skips products that already have reviews (resume support)
   */
  private async *generateReviews(): AsyncGenerator<ProgressEvent> {
    // Get products that should have reviews (5%), excluding those that already have reviews
    const productsToReview = this.getProducts().filter((p, index) => {
      // 5% have reviews (1 out of every 20 products)
      if (!(index % 20 === 0) || !this.productIdMap.has(p.sku)) {
        return false;
      }
      // Skip products that already have reviews (resume support)
      const productId = this.productIdMap.get(p.sku);
      if (productId && this.productsWithReviews.has(productId)) {
        return false;
      }
      return true;
    });

    // Count skipped products for logging
    const totalEligible = this.getProducts().filter((p, index) => index % 20 === 0 && this.productIdMap.has(p.sku)).length;
    const skipped = totalEligible - productsToReview.length;
    if (skipped > 0) {
      console.log(`[Generator] Skipping ${skipped} products that already have reviews`);
    }

    const total = productsToReview.length;
    if (total === 0) {
      yield this.progress('reviews', 1, 1, `All reviews exist (${skipped} skipped)`);
      return;
    }

    // Sample review texts
    const reviewTexts = [
      'Great product! Exactly as described and fits perfectly.',
      'Good quality for the price. Would recommend.',
      'Nice product, shipping was fast.',
      'Excellent quality, very happy with my purchase.',
      'Perfect fit and great material. Will buy again!',
      'Decent product but took a while to arrive.',
      'Love it! Better than expected.',
      'Good value for money.',
      'The quality exceeded my expectations. Highly recommend!',
      'Comfortable and stylish. Very satisfied.',
    ];

    const reviewerNames = [
      'John D.', 'Sarah M.', 'Mike T.', 'Emily R.', 'David K.',
      'Lisa W.', 'Chris P.', 'Amanda S.', 'Robert L.', 'Jennifer B.',
    ];

    let current = 0;

    for (const product of productsToReview) {
      current++;
      const productId = this.productIdMap.get(product.sku);
      if (!productId) continue;

      yield this.progress(
        'reviews',
        current,
        total,
        `Creating reviews for product ${current}/${total}${skipped > 0 ? ` (${skipped} skipped)` : ''}`
      );

      // Determine review count based on edge cases
      let reviewCount: number;
      const edgeCaseIndex = current % 20;

      if (edgeCaseIndex === 0) {
        reviewCount = 50; // EC-REV-01: Many reviews
      } else if (edgeCaseIndex === 1) {
        reviewCount = 100; // EC-REV-03: Perfect rating (many 5-star reviews)
      } else if (edgeCaseIndex === 2) {
        reviewCount = 10; // EC-REV-04: Low rating (few reviews)
      } else if (edgeCaseIndex === 3) {
        reviewCount = 1; // EC-REV-06: Single review
      } else {
        reviewCount = Math.floor(Math.random() * 5) + 1; // 1-5 reviews
      }

      // Create reviews
      for (let i = 0; i < reviewCount; i++) {
        // Determine rating based on edge case
        let rating: number;
        if (edgeCaseIndex === 1) {
          rating = 5; // Perfect rating
        } else if (edgeCaseIndex === 2) {
          rating = Math.floor(Math.random() * 2) + 1; // 1-2 stars
        } else {
          rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars (typical distribution)
        }

        try {
          await this.wooClient.createReview({
            product_id: productId,
            review: reviewTexts[i % reviewTexts.length],
            reviewer: reviewerNames[i % reviewerNames.length],
            reviewer_email: `reviewer${i}@example.com`,
            rating,
          });
          this.reviewsCreated++;
        } catch (error) {
          console.error(`Failed to create review for product ${productId}:`, error);
          // Don't throw - reviews are optional and may fail if reviews are disabled
          break; // Stop trying reviews for this product
        }
      }
    }
  }

  /**
   * Build brand-related fields based on storage method
   * Returns attributes, meta_data additions based on brandStorageMethod
   */
  private buildBrandFields(
    brand: string,
    storageMethod: BrandStorageMethod,
    existingAttributes: WooProductAttribute[] = []
  ): {
    attributes: WooProductAttribute[];
    meta_data: WooMetaData[];
  } {
    const meta_data: WooMetaData[] = [
      { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
    ];
    const attributes = [...existingAttributes];

    // Track distribution
    this.brandDistribution[storageMethod]++;

    switch (storageMethod) {
      case 'taxonomy':
        // EC-BRD-01: Use pa_brand taxonomy
        // Add brand as a global attribute (references the taxonomy term)
        if (this.brandAttributeId && this.brandTermIdMap.has(brand)) {
          attributes.push({
            id: this.brandAttributeId,
            name: 'Brand',
            position: attributes.length,
            visible: true,
            variation: false,
            options: [brand],
          });
        }
        break;

      case 'attribute':
        // EC-BRD-02: Use a local product attribute (not taxonomy)
        attributes.push({
          id: 0, // 0 = local attribute, not a taxonomy
          name: 'Brand',
          position: attributes.length,
          visible: true,
          variation: false,
          options: [brand],
        });
        break;

      case 'meta':
        // EC-BRD-03: Use product meta_data
        meta_data.push({ key: '_brand', value: brand });
        break;

      case 'none':
        // EC-BRD-04: No brand information
        break;
    }

    return { attributes, meta_data };
  }

  /**
   * Build extended product fields including GTIN, MPN, material, gender, etc.
   * These are stored in meta_data and/or attributes based on PRD requirements
   */
  private buildExtendedFields(
    product: ProductDefinition,
    existingMetaData: WooMetaData[],
    existingAttributes: WooProductAttribute[]
  ): {
    meta_data: WooMetaData[];
    attributes: WooProductAttribute[];
  } {
    const meta_data = [...existingMetaData];
    const attributes = [...existingAttributes];

    // GTIN storage (EC-GTIN-01 to EC-GTIN-09)
    if (product.gtin && product.gtinStorageMethod) {
      switch (product.gtinStorageMethod) {
        case '_gtin':
          meta_data.push({ key: '_gtin', value: product.gtin });
          break;
        case 'gtin':
          meta_data.push({ key: 'gtin', value: product.gtin });
          break;
        case 'global_unique_id':
          // WooCommerce 8.4+ native field - stored in meta for compatibility
          meta_data.push({ key: '_global_unique_id', value: product.gtin });
          break;
      }
      // Also store GTIN type for reference
      if (product.gtinType) {
        meta_data.push({ key: '_gtin_type', value: product.gtinType });
      }
    }

    // MPN (Manufacturer Part Number)
    if (product.mpn) {
      meta_data.push({ key: '_mpn', value: product.mpn });
    }

    // Material as attribute (70% coverage)
    if (product.material) {
      attributes.push({
        id: 0,
        name: 'Material',
        position: attributes.length,
        visible: true,
        variation: false,
        options: [product.material],
      });
    }

    // Gender as attribute (60% coverage)
    if (product.gender) {
      attributes.push({
        id: 0,
        name: 'Gender',
        position: attributes.length,
        visible: true,
        variation: false,
        options: [product.gender],
      });
    }

    // Age Group as attribute (40% coverage)
    if (product.ageGroup) {
      attributes.push({
        id: 0,
        name: 'Age Group',
        position: attributes.length,
        visible: true,
        variation: false,
        options: [product.ageGroup],
      });
    }

    // Size System as meta (20% coverage for footwear)
    if (product.sizeSystem) {
      meta_data.push({ key: '_size_system', value: product.sizeSystem });
    }

    // Video link (4% coverage)
    if (product.videoLink) {
      meta_data.push({ key: '_video_link', value: product.videoLink });
    }

    // 3D model link (1% coverage)
    if (product.model3dLink) {
      meta_data.push({ key: '_model_3d_link', value: product.model3dLink });
    }

    // Delivery estimate (16% coverage)
    if (product.deliveryEstimate) {
      meta_data.push({ key: '_delivery_estimate', value: product.deliveryEstimate });
    }

    // Warning (3% coverage)
    if (product.warning) {
      meta_data.push({ key: '_warning', value: product.warning });
    }
    if (product.warningUrl) {
      meta_data.push({ key: '_warning_url', value: product.warningUrl });
    }

    // Age restriction (2% coverage)
    if (product.ageRestriction) {
      meta_data.push({ key: '_age_restriction', value: String(product.ageRestriction) });
    }

    // Unit pricing (10% coverage) - PRD Fields for unit-based pricing
    if (product.unitPricingMeasure) {
      meta_data.push({ key: '_unit_pricing_measure', value: product.unitPricingMeasure });
    }
    if (product.unitPricingBaseMeasure) {
      meta_data.push({ key: '_unit_pricing_base_measure', value: product.unitPricingBaseMeasure });
    }

    // PRD Section 9.1 - Additional Required Fields

    // Pricing trend (6% coverage) - Field #28
    if (product.pricingTrend) {
      meta_data.push({ key: '_pricing_trend', value: product.pricingTrend });
    }

    // Availability date (16% coverage) - Field #30
    if (product.availabilityDate) {
      meta_data.push({ key: '_availability_date', value: product.availabilityDate });
    }

    // Expiration date (2% coverage) - Field #32
    if (product.expirationDate) {
      meta_data.push({ key: '_expiration_date', value: product.expirationDate });
    }

    // Pickup method (5% coverage) - Field #33
    if (product.pickupMethod) {
      meta_data.push({ key: '_pickup_method', value: product.pickupMethod });
    }

    // Pickup SLA (5% coverage) - Field #34
    if (product.pickupSla) {
      meta_data.push({ key: '_pickup_sla', value: product.pickupSla });
    }

    // Shipping info (20% coverage) - Field #48
    if (product.shippingInfo) {
      meta_data.push({ key: '_shipping_info', value: JSON.stringify(product.shippingInfo) });
    }

    // Popularity score (30% coverage) - Field #56
    if (product.popularityScore !== undefined) {
      meta_data.push({ key: '_popularity_score', value: String(product.popularityScore) });
    }

    // Return rate (10% coverage) - Field #57
    if (product.returnRate !== undefined) {
      meta_data.push({ key: '_return_rate', value: String(product.returnRate) });
    }

    // Q&A (10% coverage) - Field #65
    if (product.qAndA && product.qAndA.length > 0) {
      meta_data.push({ key: '_product_qa', value: JSON.stringify(product.qAndA) });
    }

    // Raw review data (6% coverage) - Field #66
    if (product.rawReviewData && product.rawReviewData.length > 0) {
      meta_data.push({ key: '_raw_review_data', value: JSON.stringify(product.rawReviewData) });
    }

    // Geo pricing (4% coverage) - Field #69
    if (product.geoPrice && product.geoPrice.length > 0) {
      meta_data.push({ key: '_geo_price', value: JSON.stringify(product.geoPrice) });
    }

    // Geo availability (4% coverage) - Field #70
    if (product.geoAvailability && product.geoAvailability.length > 0) {
      meta_data.push({ key: '_geo_availability', value: JSON.stringify(product.geoAvailability) });
    }

    return { meta_data, attributes };
  }

  /**
   * Build GTIN meta data for variations (EC-VAR-14)
   */
  private buildVariationGtinMeta(variation: VariationDefinition): WooMetaData[] {
    const meta_data: WooMetaData[] = [
      { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
    ];

    if (variation.gtin && variation.gtinStorageMethod) {
      switch (variation.gtinStorageMethod) {
        case '_gtin':
          meta_data.push({ key: '_gtin', value: variation.gtin });
          break;
        case 'gtin':
          meta_data.push({ key: 'gtin', value: variation.gtin });
          break;
        case 'global_unique_id':
          meta_data.push({ key: '_global_unique_id', value: variation.gtin });
          break;
      }
    }

    if (variation.mpn) {
      meta_data.push({ key: '_mpn', value: variation.mpn });
    }

    return meta_data;
  }

  /**
   * Map a simple product definition to WooCommerce format
   * Includes all PRD-required fields: weight, dimensions, GTIN, MPN, material, etc.
   */
  private mapSimpleProduct(product: SimpleProductDefinition): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    // Build brand fields first
    const brandFields = this.buildBrandFields(
      product.brand,
      product.brandStorageMethod
    );

    // Build extended fields (GTIN, MPN, material, gender, etc.)
    const { meta_data, attributes } = this.buildExtendedFields(
      product,
      brandFields.meta_data,
      brandFields.attributes
    );

    // Build the WooCommerce product object
    const wooProduct: Partial<WooProduct> = {
      name: product.name,
      type: 'simple',
      status: 'publish',
      sku: product.sku,
      regular_price: product.regularPrice,
      sale_price: product.salePrice || '',
      description: product.description,
      short_description: product.shortDescription,
      manage_stock: product.manageStock ?? true,
      stock_quantity: product.stockQuantity ?? 10,
      stock_status: product.stockStatus || 'instock',
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      attributes: attributes.length > 0 ? attributes : undefined,
      // Handle images: use product's images if defined, otherwise use placeholders
      // EC-IMG-04: Product with no images (empty array)
      images: product.images !== undefined
        ? product.images.map((src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' }))
        : getPlaceholderGallery(product.sku, product.categories[0], 2).map(
            (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
          ),
      meta_data,
    };

    // Physical attributes (EC-DIM-01 to EC-DIM-10)
    if (product.weight) {
      wooProduct.weight = product.weight;
    }
    if (product.dimensions) {
      wooProduct.dimensions = {
        length: product.dimensions.length,
        width: product.dimensions.width,
        height: product.dimensions.height,
      };
    }

    // Sale dates (EC-PRC-08 to EC-PRC-10)
    if (product.saleDates) {
      wooProduct.date_on_sale_from = product.saleDates.from;
      wooProduct.date_on_sale_to = product.saleDates.to;
    }

    return wooProduct;
  }

  /**
   * Map a variable product definition to WooCommerce format
   * Includes all PRD-required fields: weight, dimensions, GTIN, MPN, material, etc.
   */
  private mapVariableProduct(
    product: VariableProductDefinition
  ): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    // Start with the product's variation attributes
    const variationAttributes: WooProductAttribute[] = product.attributes.map(
      (attr, index) => ({
        id: 0,
        name: attr.name,
        position: index,
        visible: attr.visible,
        variation: attr.variation,
        options: attr.options,
      })
    );

    // Add brand based on storage method
    const brandFields = this.buildBrandFields(
      product.brand,
      product.brandStorageMethod,
      variationAttributes
    );

    // Build extended fields (GTIN, MPN, material, gender, etc.)
    const { meta_data, attributes } = this.buildExtendedFields(
      product,
      brandFields.meta_data,
      brandFields.attributes
    );

    // Build the WooCommerce product object
    const wooProduct: Partial<WooProduct> = {
      name: product.name,
      type: 'variable',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      attributes,
      // Handle images: use product's images if defined, otherwise use placeholders
      images: product.images !== undefined
        ? product.images.map((src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' }))
        : getPlaceholderGallery(product.sku, product.categories[0], 2).map(
            (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
          ),
      meta_data,
    };

    // Physical attributes at parent level (EC-DIM-01 to EC-DIM-10)
    if (product.weight) {
      wooProduct.weight = product.weight;
    }
    if (product.dimensions) {
      wooProduct.dimensions = {
        length: product.dimensions.length,
        width: product.dimensions.width,
        height: product.dimensions.height,
      };
    }

    return wooProduct;
  }

  /**
   * Map a grouped product definition to WooCommerce format
   * Includes all PRD-required fields: weight, dimensions, GTIN, MPN, material, etc.
   */
  private mapGroupedProduct(
    product: GroupedProductDefinition,
    groupedIds: number[]
  ): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    // Build brand fields first
    const brandFields = this.buildBrandFields(
      product.brand,
      product.brandStorageMethod
    );

    // Build extended fields (GTIN, MPN, material, gender, etc.)
    const { meta_data, attributes } = this.buildExtendedFields(
      product,
      brandFields.meta_data,
      brandFields.attributes
    );

    return {
      name: product.name,
      type: 'grouped',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      grouped_products: groupedIds,
      attributes: attributes.length > 0 ? attributes : undefined,
      // Handle images: use product's images if defined, otherwise use placeholders
      images: product.images !== undefined
        ? product.images.map((src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' }))
        : getPlaceholderGallery(product.sku, product.categories[0], 1).map(
            (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
          ),
      meta_data,
    };
  }

  /**
   * Build a progress event
   */
  private progress(
    phase: GeneratorPhase,
    current: number,
    total: number,
    message: string
  ): ProgressEvent {
    return { type: 'progress', phase, current, total, message };
  }

  /**
   * Build the completion event
   */
  private buildCompleteEvent(): CompleteEvent {
    const summary: GenerationSummary = {
      brands: this.brandsCreated,
      categories: this.categoriesCreated,
      simpleProducts: this.simpleProductsCreated,
      variableProducts: this.variableProductsCreated,
      variations: this.variationsCreated,
      groupedProducts: this.groupedProductsCreated,
      totalProducts:
        this.simpleProductsCreated +
        this.variableProductsCreated +
        this.groupedProductsCreated,
      durationMs: Date.now() - this.startTime,
      brandDistribution: { ...this.brandDistribution },
      relationships: { ...this.relationshipsCreated },
      reviews: this.reviewsCreated,
    };

    // Add resume info if this was a resumed generation
    if (this.isResume) {
      summary.resumed = true;
      summary.skipped = {
        brands: this.brandsSkipped,
        categories: this.categoriesSkipped,
        products: this.productsSkipped,
        variations: this.variationsSkipped,
        relationships: this.relationshipsSkipped,
        reviews: this.reviewsSkipped,
      };
    }

    return { type: 'complete', summary };
  }

  /**
   * Build an error event
   */
  private buildErrorEvent(error: unknown): ErrorEvent {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      type: 'error',
      error: {
        code: 'GENERATION_FAILED',
        message,
      },
    };
  }
}

/**
 * Get expected product counts for display
 */
export function getExpectedCounts() {
  return {
    brands: BRAND_LIST.length,
    categories: CATEGORIES.length,
    ...PRODUCT_COUNTS,
  };
}
