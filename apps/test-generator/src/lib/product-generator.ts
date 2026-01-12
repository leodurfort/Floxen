/**
 * Main Product Generator - Orchestrates creation of all products in WooCommerce
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
import { WooMetaData, WooProduct, WooProductAttribute } from '@/types/woocommerce';

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
  private startTime: number = 0;

  // Counters for summary
  private categoriesCreated = 0;
  private simpleProductsCreated = 0;
  private variableProductsCreated = 0;
  private variationsCreated = 0;
  private groupedProductsCreated = 0;

  constructor(wooClient: WooClient) {
    this.wooClient = wooClient;
  }

  /**
   * Main generation method - yields progress events
   */
  async *generate(): AsyncGenerator<GeneratorEvent> {
    this.startTime = Date.now();

    try {
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
   */
  private async *generateCategories(): AsyncGenerator<ProgressEvent> {
    const categories = getCategoriesByHierarchy();
    const total = categories.length;
    let current = 0;

    for (const category of categories) {
      current++;
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
   */
  private async *generateSimpleProducts(): AsyncGenerator<ProgressEvent> {
    const simpleProducts = ALL_PRODUCTS.filter(
      (p): p is SimpleProductDefinition => p.type === 'simple'
    );
    const total = simpleProducts.length;

    for (let i = 0; i < simpleProducts.length; i += BATCH_SIZE) {
      const batch = simpleProducts.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress(
        'simple-products',
        current,
        total,
        `Creating simple products: ${current}/${total}`
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
   */
  private async *generateVariableProducts(): AsyncGenerator<ProgressEvent> {
    const variableProducts = ALL_PRODUCTS.filter(
      (p): p is VariableProductDefinition => p.type === 'variable'
    );
    const total = variableProducts.length;

    for (let i = 0; i < variableProducts.length; i += BATCH_SIZE) {
      const batch = variableProducts.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress(
        'variable-products',
        current,
        total,
        `Creating variable products: ${current}/${total}`
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
   */
  private async *generateVariations(): AsyncGenerator<ProgressEvent> {
    const variableProducts = ALL_PRODUCTS.filter(
      (p): p is VariableProductDefinition => p.type === 'variable'
    );

    const totalVariations = variableProducts.reduce(
      (sum, p) => sum + p.variations.length,
      0
    );
    let createdVariations = 0;

    for (const product of variableProducts) {
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
          `Creating variations for ${product.sku}: ${i + batch.length}/${product.variations.length}`
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
   */
  private async *generateGroupedProducts(): AsyncGenerator<ProgressEvent> {
    const groupedProducts = ALL_PRODUCTS.filter(
      (p): p is GroupedProductDefinition => p.type === 'grouped'
    );
    const total = groupedProducts.length;
    let current = 0;

    for (const product of groupedProducts) {
      current++;
      yield this.progress(
        'grouped-products',
        current,
        total,
        `Creating grouped product: ${product.name}`
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
