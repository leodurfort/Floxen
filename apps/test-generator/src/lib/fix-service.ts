/**
 * Fix Service - Generates only missing items identified by ValidationService
 *
 * This is a targeted generation service that only creates the items
 * that are missing from the store based on MissingItems from validation.
 */

import { WooClient } from './woo-client';
import { ALL_PRODUCTS, PRODUCTS_BY_CATEGORY } from '@/data/products';
import { CATEGORIES, getCategoriesByHierarchy } from '@/data/categories';
import { BRAND_LIST } from '@/data/brands';
import { getPlaceholderGallery } from './placeholder-images';
import {
  MissingItems,
  FixEvent,
  FixPhase,
  FixSummary,
} from '@/types/validation';
import {
  ProductDefinition,
  SimpleProductDefinition,
  VariableProductDefinition,
  GroupedProductDefinition,
} from '@/types/product';
import { WooProduct, WooProductAttribute, WooMetaData } from '@/types/woocommerce';

const GENERATOR_META_KEY = '_generated_by';
const GENERATOR_META_VALUE = 'woo-test-generator';
const BATCH_SIZE = 50;
const BRAND_ATTRIBUTE_SLUG = 'pa_brand';

export class FixService {
  private wooClient: WooClient;
  private missingItems: MissingItems;
  private startTime: number = 0;

  // Tracking maps
  private categoryIdMap: Map<string, number> = new Map();
  private productIdMap: Map<string, number> = new Map();
  private brandAttributeId: number | null = null;
  private brandTermIdMap: Map<string, number> = new Map();

  // Counters
  private brandsCreated = 0;
  private categoriesCreated = 0;
  private productsCreated = 0;
  private variationsCreated = 0;
  private relationshipsCreated = 0;
  private reviewsCreated = 0;

  constructor(wooClient: WooClient, missingItems: MissingItems) {
    this.wooClient = wooClient;
    this.missingItems = missingItems;
  }

  /**
   * Main fix method - only generates missing items
   */
  async *fix(): AsyncGenerator<FixEvent> {
    this.startTime = Date.now();

    try {
      // First, fetch existing data to populate maps
      yield* this.fetchExistingData();

      // Fix brands
      if (this.missingItems.brands.length > 0) {
        yield* this.fixBrands();
      }

      // Fix categories
      if (this.missingItems.categories.length > 0) {
        yield* this.fixCategories();
      }

      // Fix simple products
      if (this.missingItems.products.simple.length > 0) {
        yield* this.fixSimpleProducts();
      }

      // Fix variable products
      if (this.missingItems.products.variable.length > 0) {
        yield* this.fixVariableProducts();
      }

      // Fix grouped products
      if (this.missingItems.products.grouped.length > 0) {
        yield* this.fixGroupedProducts();
      }

      // Fix relationships
      if (this.missingItems.relationships.length > 0) {
        yield* this.fixRelationships();
      }

      // Fix reviews
      if (this.missingItems.reviews.length > 0) {
        yield* this.fixReviews();
      }

      yield this.buildCompleteEvent();
    } catch (error) {
      yield {
        type: 'error',
        error: {
          code: 'FIX_FAILED',
          message: error instanceof Error ? error.message : 'Fix failed',
        },
      };
    }
  }

  /**
   * Fetch existing store data to populate ID maps
   */
  private async *fetchExistingData(): AsyncGenerator<FixEvent> {
    yield this.progress('fixing-brands', 0, 1, 'Loading existing store data...');

    // Fetch existing categories
    const categories = await this.wooClient.getCategories({ per_page: 100 });
    for (const cat of categories) {
      this.categoryIdMap.set(cat.slug, cat.id);
    }

    // Fetch existing products
    let page = 1;
    while (true) {
      const products = await this.wooClient.getProducts({ page, per_page: 100 });
      for (const p of products) {
        if (p.sku) this.productIdMap.set(p.sku, p.id);
      }
      if (products.length < 100) break;
      page++;
    }

    // Fetch existing brand attribute
    const attributes = await this.wooClient.getProductAttributes();
    const brandAttr = attributes.find((a) => a.slug === 'brand' || a.slug === BRAND_ATTRIBUTE_SLUG);
    if (brandAttr) {
      this.brandAttributeId = brandAttr.id;
      const terms = await this.wooClient.getAttributeTerms(brandAttr.id);
      for (const term of terms) {
        this.brandTermIdMap.set(term.name, term.id);
      }
    }
  }

  /**
   * Fix missing brands
   */
  private async *fixBrands(): AsyncGenerator<FixEvent> {
    const total = this.missingItems.brands.length;
    let current = 0;

    // Ensure brand attribute exists
    if (!this.brandAttributeId) {
      yield this.progress('fixing-brands', 0, total + 1, 'Creating Brand attribute...');
      const brandAttr = await this.wooClient.createProductAttribute({
        name: 'Brand',
        slug: 'brand',
        type: 'select',
        order_by: 'name',
        has_archives: true,
      });
      this.brandAttributeId = brandAttr.id;
    }

    for (const brandName of this.missingItems.brands) {
      current++;
      yield this.progress('fixing-brands', current, total, `Creating brand: ${brandName}`);

      const term = await this.wooClient.createAttributeTerm(this.brandAttributeId!, {
        name: brandName,
        slug: brandName.toLowerCase().replace(/\s+/g, '-'),
      });
      this.brandTermIdMap.set(brandName, term.id);
      this.brandsCreated++;
    }
  }

  /**
   * Fix missing categories
   */
  private async *fixCategories(): AsyncGenerator<FixEvent> {
    // Get categories in hierarchy order
    const allCategories = getCategoriesByHierarchy();
    const missingSet = new Set(this.missingItems.categories);
    const categoriesToCreate = allCategories.filter((c) => missingSet.has(c.slug));

    const total = categoriesToCreate.length;
    let current = 0;

    for (const category of categoriesToCreate) {
      current++;
      yield this.progress('fixing-categories', current, total, `Creating category: ${category.name}`);

      const parentId = category.parent ? this.categoryIdMap.get(category.parent) : undefined;

      const created = await this.wooClient.createCategory({
        name: category.name,
        slug: category.slug,
        parent: parentId,
        meta_data: [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }],
      });

      this.categoryIdMap.set(category.slug, created.id);
      this.categoriesCreated++;
    }
  }

  /**
   * Fix missing simple products
   */
  private async *fixSimpleProducts(): AsyncGenerator<FixEvent> {
    const skusToCreate = new Set(this.missingItems.products.simple);
    const productsToCreate = ALL_PRODUCTS.filter(
      (p): p is SimpleProductDefinition => p.type === 'simple' && skusToCreate.has(p.sku)
    );

    const total = productsToCreate.length;

    for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
      const batch = productsToCreate.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress('fixing-simple-products', current, total, `Creating simple products: ${current}/${total}`);

      const wooProducts = batch.map((p) => this.mapSimpleProduct(p));
      const created = await this.wooClient.createProductsBatch(wooProducts);
      created.forEach((p) => this.productIdMap.set(p.sku, p.id));
      this.productsCreated += created.length;
    }
  }

  /**
   * Fix missing variable products
   */
  private async *fixVariableProducts(): AsyncGenerator<FixEvent> {
    const skusToCreate = new Set(this.missingItems.products.variable);
    const productsToCreate = ALL_PRODUCTS.filter(
      (p): p is VariableProductDefinition => p.type === 'variable' && skusToCreate.has(p.sku)
    );

    const total = productsToCreate.length;

    // First create parent products
    for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
      const batch = productsToCreate.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, total);

      yield this.progress('fixing-variable-products', current, total, `Creating variable products: ${current}/${total}`);

      const wooProducts = batch.map((p) => this.mapVariableProduct(p));
      const created = await this.wooClient.createProductsBatch(wooProducts);
      created.forEach((p) => this.productIdMap.set(p.sku, p.id));
      this.productsCreated += created.length;
    }

    // Then create variations
    yield this.progress('fixing-variations', 0, productsToCreate.length, 'Creating variations...');

    let varCurrent = 0;
    for (const product of productsToCreate) {
      varCurrent++;
      const productId = this.productIdMap.get(product.sku);
      if (!productId) continue;

      yield this.progress(
        'fixing-variations',
        varCurrent,
        productsToCreate.length,
        `Creating variations for ${product.sku}`
      );

      for (let i = 0; i < product.variations.length; i += BATCH_SIZE) {
        const batch = product.variations.slice(i, i + BATCH_SIZE);
        const wooVariations = batch.map((v) => ({
          sku: v.sku,
          regular_price: v.regularPrice,
          sale_price: v.salePrice || '',
          manage_stock: true,
          stock_quantity: v.stockQuantity ?? 10,
          stock_status: v.stockStatus || 'instock',
          attributes: Object.entries(v.attributes).map(([name, option]) => ({
            id: 0,
            name,
            option,
          })),
          meta_data: [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }],
        }));

        const created = await this.wooClient.createVariationsBatch(productId, wooVariations);
        this.variationsCreated += created.length;
      }
    }
  }

  /**
   * Fix missing grouped products
   */
  private async *fixGroupedProducts(): AsyncGenerator<FixEvent> {
    const skusToCreate = new Set(this.missingItems.products.grouped);
    const productsToCreate = ALL_PRODUCTS.filter(
      (p): p is GroupedProductDefinition => p.type === 'grouped' && skusToCreate.has(p.sku)
    );

    const total = productsToCreate.length;
    let current = 0;

    for (const product of productsToCreate) {
      current++;
      yield this.progress('fixing-grouped-products', current, total, `Creating: ${product.name}`);

      const groupedIds = product.groupedProductSkus
        .map((sku) => this.productIdMap.get(sku))
        .filter((id): id is number => id !== undefined);

      if (groupedIds.length === 0) continue;

      const wooProduct = this.mapGroupedProduct(product, groupedIds);
      const created = await this.wooClient.createProduct(wooProduct);
      this.productIdMap.set(product.sku, created.id);
      this.productsCreated++;
    }
  }

  /**
   * Fix missing relationships
   */
  private async *fixRelationships(): AsyncGenerator<FixEvent> {
    const skusToFix = new Set(this.missingItems.relationships);
    const productsToFix = ALL_PRODUCTS.filter((p) => skusToFix.has(p.sku));

    const total = productsToFix.length;
    const updates: Array<{ id: number; cross_sell_ids?: number[]; upsell_ids?: number[] }> = [];

    for (const product of productsToFix) {
      const productId = this.productIdMap.get(product.sku);
      if (!productId) continue;

      const categoryProducts = ALL_PRODUCTS.filter(
        (p) => p.categories.some((c) => product.categories.includes(c)) && p.sku !== product.sku
      )
        .map((p) => this.productIdMap.get(p.sku))
        .filter((id): id is number => id !== undefined);

      if (categoryProducts.length === 0) continue;

      const update: { id: number; cross_sell_ids?: number[]; upsell_ids?: number[] } = { id: productId };

      if (updates.length % 2 === 0) {
        update.cross_sell_ids = categoryProducts.slice(0, 3);
      }
      if (updates.length % 2 === 1 || categoryProducts.length > 3) {
        update.upsell_ids = categoryProducts.slice(3, 6);
        if (!update.upsell_ids.length) {
          update.upsell_ids = categoryProducts.slice(0, 2);
        }
      }

      updates.push(update);
    }

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const current = Math.min(i + BATCH_SIZE, updates.length);

      yield this.progress('fixing-relationships', current, total, `Setting relationships: ${current}/${total}`);

      await this.wooClient.updateProductsBatch(batch as Array<{ id: number } & Partial<WooProduct>>);
      this.relationshipsCreated += batch.length;
    }
  }

  /**
   * Fix missing reviews
   */
  private async *fixReviews(): AsyncGenerator<FixEvent> {
    const skusToFix = new Set(this.missingItems.reviews);
    const productsToFix = ALL_PRODUCTS.filter((p) => skusToFix.has(p.sku));

    const reviewTexts = [
      'Great product! Exactly as described.',
      'Good quality for the price.',
      'Nice product, fast shipping.',
      'Excellent quality, very happy!',
      'Perfect fit, will buy again!',
    ];
    const reviewerNames = ['John D.', 'Sarah M.', 'Mike T.', 'Emily R.', 'David K.'];

    const total = productsToFix.length;
    let current = 0;

    for (const product of productsToFix) {
      current++;
      const productId = this.productIdMap.get(product.sku);
      if (!productId) continue;

      yield this.progress('fixing-reviews', current, total, `Adding reviews: ${current}/${total}`);

      // Add 1-5 reviews
      const reviewCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < reviewCount; i++) {
        try {
          await this.wooClient.createReview({
            product_id: productId,
            review: reviewTexts[i % reviewTexts.length],
            reviewer: reviewerNames[i % reviewerNames.length],
            reviewer_email: `reviewer${i}@example.com`,
            rating: Math.floor(Math.random() * 3) + 3,
          });
          this.reviewsCreated++;
        } catch {
          // Reviews might fail if disabled, continue
          break;
        }
      }
    }
  }

  // ========================
  // Product Mapping Helpers
  // ========================

  private mapSimpleProduct(product: SimpleProductDefinition): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    const attributes: WooProductAttribute[] = [];
    const meta_data: WooMetaData[] = [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }];

    // Add brand based on storage method
    if (product.brandStorageMethod === 'taxonomy' && this.brandAttributeId) {
      attributes.push({
        id: this.brandAttributeId,
        name: 'Brand',
        position: 0,
        visible: true,
        variation: false,
        options: [product.brand],
      });
    } else if (product.brandStorageMethod === 'attribute') {
      attributes.push({
        id: 0,
        name: 'Brand',
        position: 0,
        visible: true,
        variation: false,
        options: [product.brand],
      });
    } else if (product.brandStorageMethod === 'meta') {
      meta_data.push({ key: '_brand', value: product.brand });
    }

    return {
      name: product.name,
      type: 'simple',
      status: 'publish',
      sku: product.sku,
      regular_price: product.regularPrice,
      sale_price: product.salePrice || '',
      description: product.description,
      short_description: product.shortDescription,
      manage_stock: true,
      stock_quantity: product.stockQuantity ?? 10,
      stock_status: product.stockStatus || 'instock',
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      attributes: attributes.length > 0 ? attributes : undefined,
      images: getPlaceholderGallery(product.sku, product.categories[0], 2).map((src) => ({
        id: 0,
        src,
        name: '',
        alt: product.name,
        date_created: '',
        date_modified: '',
      })),
      meta_data,
      weight: product.weight,
      dimensions: product.dimensions,
    };
  }

  private mapVariableProduct(product: VariableProductDefinition): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    const attributes: WooProductAttribute[] = product.attributes.map((attr, index) => ({
      id: 0,
      name: attr.name,
      position: index,
      visible: attr.visible,
      variation: attr.variation,
      options: attr.options,
    }));

    const meta_data: WooMetaData[] = [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }];

    // Add brand
    if (product.brandStorageMethod === 'taxonomy' && this.brandAttributeId) {
      attributes.push({
        id: this.brandAttributeId,
        name: 'Brand',
        position: attributes.length,
        visible: true,
        variation: false,
        options: [product.brand],
      });
    } else if (product.brandStorageMethod === 'attribute') {
      attributes.push({
        id: 0,
        name: 'Brand',
        position: attributes.length,
        visible: true,
        variation: false,
        options: [product.brand],
      });
    } else if (product.brandStorageMethod === 'meta') {
      meta_data.push({ key: '_brand', value: product.brand });
    }

    return {
      name: product.name,
      type: 'variable',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      attributes,
      images: getPlaceholderGallery(product.sku, product.categories[0], 2).map((src) => ({
        id: 0,
        src,
        name: '',
        alt: product.name,
        date_created: '',
        date_modified: '',
      })),
      meta_data,
      weight: product.weight,
      dimensions: product.dimensions,
    };
  }

  private mapGroupedProduct(product: GroupedProductDefinition, groupedIds: number[]): Partial<WooProduct> {
    const categoryIds = product.categories
      .map((slug) => this.categoryIdMap.get(slug))
      .filter((id): id is number => id !== undefined);

    const meta_data: WooMetaData[] = [{ key: GENERATOR_META_KEY, value: GENERATOR_META_VALUE }];

    return {
      name: product.name,
      type: 'grouped',
      status: 'publish',
      sku: product.sku,
      description: product.description,
      short_description: product.shortDescription,
      categories: categoryIds.map((id) => ({ id, name: '', slug: '' })),
      grouped_products: groupedIds,
      images: getPlaceholderGallery(product.sku, product.categories[0], 1).map((src) => ({
        id: 0,
        src,
        name: '',
        alt: product.name,
        date_created: '',
        date_modified: '',
      })),
      meta_data,
    };
  }

  // ========================
  // Event Builders
  // ========================

  private progress(phase: FixPhase, current: number, total: number, message: string): FixEvent {
    return { type: 'progress', phase, current, total, message };
  }

  private buildCompleteEvent(): FixEvent {
    const summary: FixSummary = {
      brandsCreated: this.brandsCreated,
      categoriesCreated: this.categoriesCreated,
      productsCreated: this.productsCreated,
      variationsCreated: this.variationsCreated,
      relationshipsCreated: this.relationshipsCreated,
      reviewsCreated: this.reviewsCreated,
      durationMs: Date.now() - this.startTime,
    };
    return { type: 'complete', summary };
  }
}
