/**
 * Main Product Generator - Orchestrates creation of all products in WooCommerce
 *
 * Supports resuming interrupted generations by checking for existing items
 * and skipping already-created categories, products, and variations.
 */

import { WooClient } from './woo-client';
import { getPlaceholderGallery } from './placeholder-images';
import { CATEGORIES, getCategoriesByHierarchy } from '@/data/categories';
import { ALL_PRODUCTS, PRODUCT_COUNTS } from '@/data/products';
import {
  ProductDefinition,
  SimpleProductDefinition,
  VariableProductDefinition,
  GroupedProductDefinition,
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

/**
 * Main Product Generator class
 */
export class ProductGenerator {
  private wooClient: WooClient;
  private categoryIdMap: Map<string, number> = new Map();
  private productIdMap: Map<string, number> = new Map(); // SKU -> WooCommerce ID
  private productsWithVariations: Set<number> = new Set(); // Product IDs that already have variations
  private startTime: number = 0;
  private isResume: boolean = false;

  // Counters for summary
  private categoriesCreated = 0;
  private simpleProductsCreated = 0;
  private variableProductsCreated = 0;
  private variationsCreated = 0;
  private groupedProductsCreated = 0;

  // Resume counters (items found from previous run)
  private categoriesSkipped = 0;
  private productsSkipped = 0;
  private variationsSkipped = 0;

  constructor(wooClient: WooClient) {
    this.wooClient = wooClient;
  }

  /**
   * Check for existing generated items to support resume functionality
   * This queries WooCommerce for categories and products with our meta tag
   */
  private async *checkExistingItems(): AsyncGenerator<ProgressEvent> {
    yield this.progress('checking', 0, 3, 'Checking for existing generated items...');

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

    yield this.progress('checking', 1, 3, 'Checking existing products...');

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

    yield this.progress('checking', 3, 3, 'Resume check complete');

    // Determine if this is a resume
    this.isResume = this.productsSkipped > 0 || this.categoriesSkipped > 0;
    if (this.isResume) {
      console.log(`[Generator] Resuming generation - skipping ${this.categoriesSkipped} categories, ${this.productsSkipped} products`);
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

      // Phase 1: Categories
      yield* this.generateCategories();

      // Phase 2: Simple products
      yield* this.generateSimpleProducts();

      // Phase 3: Variable products (without variations)
      yield* this.generateVariableProducts();

      // Phase 4: Variations for variable products
      yield* this.generateVariations();

      // Phase 5: Grouped products
      yield* this.generateGroupedProducts();

      // Complete
      yield this.buildCompleteEvent();
    } catch (error) {
      yield this.buildErrorEvent(error);
    }
  }

  /**
   * Generate categories in hierarchy order
   * Skips categories that already exist (resume support)
   */
  private async *generateCategories(): AsyncGenerator<ProgressEvent> {
    const categories = getCategoriesByHierarchy();
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
    const simpleProducts = ALL_PRODUCTS.filter(
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
    const variableProducts = ALL_PRODUCTS.filter(
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
    const variableProducts = ALL_PRODUCTS.filter(
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

        const wooVariations = batch.map((variation) => ({
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
          meta_data: [
            { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
          ] as WooMetaData[],
        }));

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
    const groupedProducts = ALL_PRODUCTS.filter(
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
   * Map a simple product definition to WooCommerce format
   */
  private mapSimpleProduct(product: SimpleProductDefinition): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    return {
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
      images: getPlaceholderGallery(product.sku, product.categories[0], 2).map(
        (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
      ),
      meta_data: [
        { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
        { key: '_brand', value: product.brand },
      ],
    };
  }

  /**
   * Map a variable product definition to WooCommerce format
   */
  private mapVariableProduct(
    product: VariableProductDefinition
  ): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    const attributes: WooProductAttribute[] = product.attributes.map(
      (attr, index) => ({
        id: 0,
        name: attr.name,
        position: index,
        visible: attr.visible,
        variation: attr.variation,
        options: attr.options,
      })
    );

    return {
      name: product.name,
      type: 'variable',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      attributes,
      images: getPlaceholderGallery(product.sku, product.categories[0], 2).map(
        (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
      ),
      meta_data: [
        { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
        { key: '_brand', value: product.brand },
      ],
    };
  }

  /**
   * Map a grouped product definition to WooCommerce format
   */
  private mapGroupedProduct(
    product: GroupedProductDefinition,
    groupedIds: number[]
  ): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    return {
      name: product.name,
      type: 'grouped',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      grouped_products: groupedIds,
      images: getPlaceholderGallery(product.sku, product.categories[0], 1).map(
        (src) => ({ id: 0, src, name: '', alt: product.name, date_created: '', date_modified: '' })
      ),
      meta_data: [
        { key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE },
        { key: '_brand', value: product.brand },
      ],
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
    };

    // Add resume info if this was a resumed generation
    if (this.isResume) {
      summary.resumed = true;
      summary.skipped = {
        categories: this.categoriesSkipped,
        products: this.productsSkipped,
        variations: this.variationsSkipped,
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
    categories: CATEGORIES.length,
    ...PRODUCT_COUNTS,
  };
}
