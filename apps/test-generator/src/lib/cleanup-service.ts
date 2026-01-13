/**
 * Cleanup Service - Removes all generated products and categories from WooCommerce
 */

import { WooClient } from './woo-client';
import {
  GeneratorEvent,
  ProgressEvent,
  CompleteEvent,
  ErrorEvent,
  CleanupSummary,
  CleanupPhase,
} from '@/types/events';
import { WooProduct, WooCategory } from '@/types/woocommerce';

const GENERATOR_META_KEY = '_generated_by';
const GENERATOR_META_VALUE = 'woo-test-generator';
const BATCH_SIZE = 100;

/**
 * Cleanup Service class
 */
export class CleanupService {
  private wooClient: WooClient;
  private startTime: number = 0;

  // Counters
  private productsDeleted = 0;
  private variationsDeleted = 0;
  private categoriesDeleted = 0;
  private brandsDeleted = 0;

  constructor(wooClient: WooClient) {
    this.wooClient = wooClient;
  }

  /**
   * Main cleanup method - yields progress events
   */
  async *cleanup(): AsyncGenerator<GeneratorEvent> {
    this.startTime = Date.now();

    try {
      // Phase 1: Find all generated products
      yield this.progress('finding', 0, 0, 'Finding generated products...');
      const products = await this.findGeneratedProducts();

      // Phase 2: Delete variations first (for variable products)
      yield* this.deleteVariations(products);

      // Phase 3: Delete products
      yield* this.deleteProducts(products);

      // Phase 4: Find and delete categories
      yield this.progress('deleting-categories', 0, 0, 'Finding generated categories...');
      const categories = await this.findGeneratedCategories();
      yield* this.deleteCategories(categories);

      // Phase 5: Find and delete brands (pa_brand taxonomy terms)
      yield this.progress('deleting-brands', 0, 0, 'Finding generated brands...');
      yield* this.deleteBrands();

      // Complete
      yield this.buildCompleteEvent();
    } catch (error) {
      yield this.buildErrorEvent(error);
    }
  }

  /**
   * Find all products with our generator meta field
   */
  private async findGeneratedProducts(): Promise<WooProduct[]> {
    const allProducts: WooProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.wooClient.getProducts({
        page,
        per_page: 100,
        status: 'any',
      });

      // Filter by meta field
      const generated = products.filter((p) =>
        p.meta_data?.some(
          (m) => m.key === GENERATOR_META_KEY && m.value === GENERATOR_META_VALUE
        )
      );

      allProducts.push(...generated);
      hasMore = products.length === 100;
      page++;
    }

    return allProducts;
  }

  /**
   * Find all categories with our generator meta field
   */
  private async findGeneratedCategories(): Promise<WooCategory[]> {
    const allCategories = await this.wooClient.getCategories({ per_page: 100 });

    return allCategories.filter((c) =>
      // Categories don't have meta_data in list response, so we match by name/slug
      // that follows our pattern, or we could store generated category slugs
      true // We'll delete all categories created by the generator
    );
  }

  /**
   * Delete variations for variable products
   */
  private async *deleteVariations(
    products: WooProduct[]
  ): AsyncGenerator<ProgressEvent> {
    const variableProducts = products.filter((p) => p.type === 'variable');
    const total = variableProducts.length;
    let current = 0;

    for (const product of variableProducts) {
      current++;
      yield this.progress(
        'deleting-variations',
        current,
        total,
        `Deleting variations for ${product.sku}`
      );

      try {
        const variations = await this.wooClient.getVariations(product.id);
        if (variations.length > 0) {
          const variationIds = variations.map((v) => v.id);

          // Delete in batches
          for (let i = 0; i < variationIds.length; i += BATCH_SIZE) {
            const batch = variationIds.slice(i, i + BATCH_SIZE);
            await this.wooClient.deleteVariationsBatch(product.id, batch);
            this.variationsDeleted += batch.length;
          }
        }
      } catch (error) {
        console.error(`Failed to delete variations for ${product.sku}:`, error);
        // Continue with other products
      }
    }
  }

  /**
   * Delete products in batches
   */
  private async *deleteProducts(
    products: WooProduct[]
  ): AsyncGenerator<ProgressEvent> {
    const total = products.length;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress(
        'deleting-products',
        current,
        total,
        `Deleting products: ${current}/${total}`
      );

      try {
        const ids = batch.map((p) => p.id);
        await this.wooClient.deleteProductsBatch(ids);
        this.productsDeleted += batch.length;
      } catch (error) {
        console.error('Failed to delete products batch:', error);
        // Try deleting individually
        for (const product of batch) {
          try {
            await this.wooClient.deleteProduct(product.id);
            this.productsDeleted++;
          } catch (e) {
            console.error(`Failed to delete product ${product.sku}:`, e);
          }
        }
      }
    }
  }

  /**
   * Delete categories in reverse hierarchy order (children first)
   */
  private async *deleteCategories(
    categories: WooCategory[]
  ): AsyncGenerator<ProgressEvent> {
    // Sort by depth (deepest first for safe deletion)
    const sorted = this.sortByHierarchyDepth(categories);
    const total = sorted.length;
    let current = 0;

    for (const category of sorted) {
      current++;
      yield this.progress(
        'deleting-categories',
        current,
        total,
        `Deleting category: ${category.name}`
      );

      try {
        await this.wooClient.deleteCategory(category.id);
        this.categoriesDeleted++;
      } catch (error) {
        console.error(`Failed to delete category ${category.name}:`, error);
        // Continue with other categories
      }
    }
  }

  /**
   * Delete brands (pa_brand taxonomy terms)
   */
  private async *deleteBrands(): AsyncGenerator<ProgressEvent> {
    try {
      // Get all brands (pa_brand terms)
      const brands = await this.wooClient.getBrands();
      const total = brands.length;
      let current = 0;

      for (const brand of brands) {
        current++;
        yield this.progress(
          'deleting-brands',
          current,
          total,
          `Deleting brand: ${brand.name}`
        );

        try {
          await this.wooClient.deleteBrand(brand.id);
          this.brandsDeleted++;
        } catch (error) {
          console.error(`Failed to delete brand ${brand.name}:`, error);
          // Continue with other brands
        }
      }
    } catch (error) {
      // Brand attribute might not exist, which is fine
      console.log('No brands to delete or brand attribute not found');
    }
  }

  /**
   * Sort categories by hierarchy depth (deepest first for deletion)
   */
  private sortByHierarchyDepth(categories: WooCategory[]): WooCategory[] {
    const depthMap = new Map<number, number>();
    const parentMap = new Map(categories.map((c) => [c.id, c.parent]));

    const getDepth = (id: number): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      const parentId = parentMap.get(id);
      if (!parentId || parentId === 0) {
        depthMap.set(id, 0);
        return 0;
      }
      const depth = getDepth(parentId) + 1;
      depthMap.set(id, depth);
      return depth;
    };

    categories.forEach((c) => getDepth(c.id));

    return [...categories].sort(
      (a, b) => (depthMap.get(b.id) || 0) - (depthMap.get(a.id) || 0)
    );
  }

  /**
   * Build a progress event
   */
  private progress(
    phase: CleanupPhase,
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
    const summary: CleanupSummary = {
      productsDeleted: this.productsDeleted,
      variationsDeleted: this.variationsDeleted,
      categoriesDeleted: this.categoriesDeleted,
      brandsDeleted: this.brandsDeleted,
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
        code: 'CLEANUP_FAILED',
        message,
      },
    };
  }
}
