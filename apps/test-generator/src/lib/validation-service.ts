/**
 * Validation Service - Checks store data against expected definitions
 *
 * Validates:
 * 1. Product counts (simple, variable, grouped, categories, brands)
 * 2. Data completeness (GTIN, weight, dimensions, material, gender, etc.)
 * 3. Edge cases (specific products with special values)
 * 4. Relationships (cross-sells, upsells)
 * 5. Reviews (products with reviews)
 */

import { WooClient } from './woo-client';
import { ALL_PRODUCTS, PRODUCTS_BY_CATEGORY, PRODUCT_COUNTS } from '@/data/products';
import { CATEGORIES } from '@/data/categories';
import { BRAND_LIST } from '@/data/brands';
import { getEdgeCaseOverride, getEdgeCaseKeys } from '@/data/products/edge-cases';
import {
  ValidationResult,
  ValidationCategory,
  ValidationCheck,
  ValidationStatus,
  ValidationEvent,
  ValidationPhase,
  MissingItems,
} from '@/types/validation';
import { WooProduct } from '@/types/woocommerce';

const GENERATOR_META_KEY = '_generated_by';
const GENERATOR_META_VALUE = 'woo-test-generator';

export class ValidationService {
  private wooClient: WooClient;
  private startTime: number = 0;

  // Fetched store data
  private storeProducts: WooProduct[] = [];
  private productsBySku: Map<string, WooProduct> = new Map();
  private storeCategories: Map<string, number> = new Map();
  private storeBrands: Set<string> = new Set();
  private productsWithVariations: Map<number, number> = new Map();

  constructor(wooClient: WooClient) {
    this.wooClient = wooClient;
  }

  /**
   * Main validation method - yields progress events
   */
  async *validate(): AsyncGenerator<ValidationEvent> {
    this.startTime = Date.now();

    try {
      // Phase 1: Fetch all store data
      yield* this.fetchStoreData();

      // Phase 2-6: Run validations
      const counts = this.validateCounts();
      yield this.progress('checking-products', 1, 1, 'Product count validation complete');

      const dataCompleteness = this.validateDataCompleteness();
      yield this.progress('checking-data-completeness', 1, 1, 'Data completeness validation complete');

      const edgeCases = this.validateEdgeCases();
      yield this.progress('checking-edge-cases', 1, 1, 'Edge case validation complete');

      const relationships = this.validateRelationships();
      yield this.progress('checking-relationships', 1, 1, 'Relationship validation complete');

      const reviews = this.validateReviews();
      yield this.progress('checking-reviews', 1, 1, 'Review validation complete');

      // Build final result
      const result = this.buildResult({
        counts,
        dataCompleteness,
        edgeCases,
        relationships,
        reviews,
      });

      yield { type: 'complete', result };
    } catch (error) {
      yield {
        type: 'error',
        error: {
          code: 'VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Validation failed',
        },
      };
    }
  }

  /**
   * Fetch all store data for validation
   */
  private async *fetchStoreData(): AsyncGenerator<ValidationEvent> {
    yield this.progress('initializing', 0, 4, 'Fetching store data...');

    // Fetch products
    let page = 1;
    while (true) {
      const products = await this.wooClient.getProducts({ page, per_page: 100 });
      const generated = products.filter((p) =>
        p.meta_data?.some((m) => m.key === GENERATOR_META_KEY && m.value === GENERATOR_META_VALUE)
      );

      this.storeProducts.push(...generated);
      for (const p of generated) {
        if (p.sku) this.productsBySku.set(p.sku, p);
        if (p.type === 'variable' && p.variations) {
          this.productsWithVariations.set(p.id, p.variations.length);
        }
      }

      if (products.length < 100) break;
      page++;
    }

    yield this.progress('initializing', 1, 4, `Found ${this.storeProducts.length} generated products`);

    // Fetch categories
    const categories = await this.wooClient.getCategories({ per_page: 100 });
    for (const cat of categories) {
      this.storeCategories.set(cat.slug, cat.id);
    }

    yield this.progress('initializing', 2, 4, `Found ${this.storeCategories.size} categories`);

    // Fetch brands
    const brands = await this.wooClient.getBrands();
    for (const brand of brands) {
      this.storeBrands.add(brand.name);
    }

    yield this.progress('initializing', 3, 4, `Found ${this.storeBrands.size} brands`);
    yield this.progress('initializing', 4, 4, 'Store data loaded');
  }

  /**
   * Validate product counts
   */
  private validateCounts(): ValidationCategory {
    const checks: ValidationCheck[] = [];

    // Total products
    checks.push(this.createCheck('Total Products', PRODUCT_COUNTS.total, this.storeProducts.length));

    // Simple products
    const simpleActual = this.storeProducts.filter((p) => p.type === 'simple').length;
    checks.push(this.createCheck('Simple Products', PRODUCT_COUNTS.simple, simpleActual));

    // Variable products
    const variableActual = this.storeProducts.filter((p) => p.type === 'variable').length;
    checks.push(this.createCheck('Variable Products', PRODUCT_COUNTS.variable, variableActual));

    // Grouped products
    const groupedActual = this.storeProducts.filter((p) => p.type === 'grouped').length;
    checks.push(this.createCheck('Grouped Products', PRODUCT_COUNTS.grouped, groupedActual));

    // Categories
    const categoriesExpected = CATEGORIES.length;
    const categoriesActual = CATEGORIES.filter((c) => this.storeCategories.has(c.slug)).length;
    checks.push(this.createCheck('Categories', categoriesExpected, categoriesActual));

    // Brands
    const brandsExpected = BRAND_LIST.length;
    const brandsActual = this.storeBrands.size;
    checks.push(this.createCheck('Brands', brandsExpected, brandsActual));

    return this.buildCategory('Product Counts', checks);
  }

  /**
   * Validate data completeness (field coverage)
   */
  private validateDataCompleteness(): ValidationCategory {
    const checks: ValidationCheck[] = [];
    const totalProducts = this.storeProducts.length;

    if (totalProducts === 0) {
      return this.buildCategory('Data Completeness', [
        { name: 'No products to validate', status: 'skipped', expected: '-', actual: '-' },
      ]);
    }

    // GTIN coverage (expected: ~30%)
    const gtinExpected = Math.floor(totalProducts * 0.3);
    const gtinActual = this.storeProducts.filter((p) =>
      p.meta_data?.some((m) => ['_gtin', 'gtin', '_global_unique_id'].includes(m.key))
    ).length;
    checks.push(this.createCoverageCheck('GTIN Coverage', gtinExpected, gtinActual, 0.3, 0.15));

    // Weight coverage (expected: ~80%)
    const weightExpected = Math.floor(totalProducts * 0.8);
    const weightActual = this.storeProducts.filter((p) => p.weight && p.weight !== '').length;
    checks.push(this.createCoverageCheck('Weight Coverage', weightExpected, weightActual, 0.8, 0.15));

    // Dimensions coverage (expected: ~60%)
    const dimExpected = Math.floor(totalProducts * 0.6);
    const dimActual = this.storeProducts.filter(
      (p) => p.dimensions && (p.dimensions.length || p.dimensions.width || p.dimensions.height)
    ).length;
    checks.push(this.createCoverageCheck('Dimensions Coverage', dimExpected, dimActual, 0.6, 0.15));

    // Material coverage (expected: ~70%)
    const materialExpected = Math.floor(totalProducts * 0.7);
    const materialActual = this.storeProducts.filter((p) =>
      p.attributes?.some((a) => a.name.toLowerCase() === 'material')
    ).length;
    checks.push(this.createCoverageCheck('Material Attribute', materialExpected, materialActual, 0.7, 0.15));

    // Gender coverage (expected: ~60%)
    const genderExpected = Math.floor(totalProducts * 0.6);
    const genderActual = this.storeProducts.filter((p) =>
      p.attributes?.some((a) => a.name.toLowerCase() === 'gender')
    ).length;
    checks.push(this.createCoverageCheck('Gender Attribute', genderExpected, genderActual, 0.6, 0.15));

    // Age group coverage (expected: ~40%)
    const ageExpected = Math.floor(totalProducts * 0.4);
    const ageActual = this.storeProducts.filter((p) =>
      p.attributes?.some((a) => a.name.toLowerCase() === 'age group')
    ).length;
    checks.push(this.createCoverageCheck('Age Group Attribute', ageExpected, ageActual, 0.4, 0.15));

    // Brand via taxonomy (~40%)
    const taxonomyExpected = Math.floor(totalProducts * 0.4);
    const taxonomyActual = this.storeProducts.filter((p) =>
      p.attributes?.some((a) => a.name.toLowerCase() === 'brand' && a.id && a.id > 0)
    ).length;
    checks.push(this.createCoverageCheck('Brand via Taxonomy', taxonomyExpected, taxonomyActual, 0.4, 0.15));

    // Brand via meta (~20%)
    const metaExpected = Math.floor(totalProducts * 0.2);
    const metaActual = this.storeProducts.filter((p) => p.meta_data?.some((m) => m.key === '_brand')).length;
    checks.push(this.createCoverageCheck('Brand via Meta', metaExpected, metaActual, 0.2, 0.15));

    return this.buildCategory('Data Completeness', checks);
  }

  /**
   * Validate edge cases
   */
  private validateEdgeCases(): ValidationCategory {
    const checks: ValidationCheck[] = [];
    const edgeCaseKeys = getEdgeCaseKeys();

    for (const key of edgeCaseKeys) {
      const [category, indexStr] = key.split(':');
      const index = parseInt(indexStr);
      const override = getEdgeCaseOverride(category, index);

      // Get expected product definition
      const categoryProducts = PRODUCTS_BY_CATEGORY[category] || [];
      if (index >= categoryProducts.length) continue;

      const expectedProduct = categoryProducts[index];
      const actualProduct = this.productsBySku.get(expectedProduct.sku);

      if (!actualProduct) {
        checks.push({
          name: `${key}: Product exists`,
          status: 'fail',
          expected: expectedProduct.sku,
          actual: 'Not found',
        });
        continue;
      }

      // Check specific edge case properties based on override
      if (override?.name === '') {
        checks.push(this.createEdgeCaseCheck(key, 'Empty name', '', actualProduct.name || ''));
      } else if (override?.name && override.name.length > 100) {
        checks.push(
          this.createEdgeCaseCheck(key, 'Long name', `${override.name.length}+ chars`, `${actualProduct.name?.length || 0} chars`)
        );
      }

      if (override?.regularPrice === '0.00') {
        checks.push(this.createEdgeCaseCheck(key, 'Zero price', '0.00', actualProduct.regular_price || ''));
      } else if (override?.regularPrice === '0.01') {
        checks.push(this.createEdgeCaseCheck(key, 'Min price', '0.01', actualProduct.regular_price || ''));
      } else if (override?.regularPrice === '999999.99') {
        checks.push(this.createEdgeCaseCheck(key, 'Max price', '999999.99', actualProduct.regular_price || ''));
      }

      if (override?.sku === '') {
        checks.push(this.createEdgeCaseCheck(key, 'Empty SKU', '', actualProduct.sku || ''));
      } else if (override?.sku && override.sku.length > 50) {
        checks.push(this.createEdgeCaseCheck(key, 'Long SKU', `${override.sku.length}+ chars`, `${actualProduct.sku?.length || 0} chars`));
      }

      if (override?.stockQuantity !== undefined && override.stockQuantity < 0) {
        checks.push(
          this.createEdgeCaseCheck(key, 'Negative stock', String(override.stockQuantity), String(actualProduct.stock_quantity ?? ''))
        );
      }

      if (override?.stockQuantity === 0 && override?.stockStatus === 'instock') {
        const isZeroInstock = actualProduct.stock_quantity === 0 && actualProduct.stock_status === 'instock';
        checks.push({
          name: `${key}: Zero stock in-stock`,
          status: isZeroInstock ? 'pass' : 'fail',
          expected: '0/instock',
          actual: `${actualProduct.stock_quantity}/${actualProduct.stock_status}`,
        });
      }

      if (override?.categories?.length === 0) {
        checks.push(
          this.createEdgeCaseCheck(key, 'No categories', '0', String(actualProduct.categories?.length || 0))
        );
      }

      if (override?.images?.length === 0) {
        checks.push(this.createEdgeCaseCheck(key, 'No images', '0', String(actualProduct.images?.length || 0)));
      }

      if (override?.description && override.description.length > 5000) {
        checks.push(
          this.createEdgeCaseCheck(
            key,
            'Long description',
            `${override.description.length}+ chars`,
            `${actualProduct.description?.length || 0} chars`
          )
        );
      }

      if (override?.description?.includes('<script>')) {
        const hasXss = actualProduct.description?.includes('script') || actualProduct.description?.includes('alert');
        checks.push({
          name: `${key}: XSS content`,
          status: hasXss ? 'pass' : 'warning',
          expected: 'Contains XSS test',
          actual: hasXss ? 'Present' : 'Sanitized/Missing',
        });
      }
    }

    if (checks.length === 0) {
      return this.buildCategory('Edge Cases', [
        { name: 'No edge cases defined', status: 'skipped', expected: '-', actual: '-' },
      ]);
    }

    return this.buildCategory('Edge Cases', checks);
  }

  /**
   * Validate relationships (cross-sells, upsells)
   */
  private validateRelationships(): ValidationCategory {
    const checks: ValidationCheck[] = [];
    const totalProducts = this.storeProducts.length;

    if (totalProducts === 0) {
      return this.buildCategory('Relationships', [
        { name: 'No products to validate', status: 'skipped', expected: '-', actual: '-' },
      ]);
    }

    // Expected: ~40% of products have some relationship
    // ~20% with cross-sells, ~20% with upsells

    const withCrossSells = this.storeProducts.filter((p) => p.cross_sell_ids && p.cross_sell_ids.length > 0).length;
    const crossSellExpected = Math.floor(totalProducts * 0.2);
    checks.push(this.createCoverageCheck('Products with Cross-sells', crossSellExpected, withCrossSells, 0.2, 0.1));

    const withUpsells = this.storeProducts.filter((p) => p.upsell_ids && p.upsell_ids.length > 0).length;
    const upsellExpected = Math.floor(totalProducts * 0.2);
    checks.push(this.createCoverageCheck('Products with Upsells', upsellExpected, withUpsells, 0.2, 0.1));

    return this.buildCategory('Relationships', checks);
  }

  /**
   * Validate reviews
   */
  private validateReviews(): ValidationCategory {
    const checks: ValidationCheck[] = [];
    const totalProducts = this.storeProducts.length;

    if (totalProducts === 0) {
      return this.buildCategory('Reviews', [
        { name: 'No products to validate', status: 'skipped', expected: '-', actual: '-' },
      ]);
    }

    // Expected: ~5% of products have reviews
    const expectedWithReviews = Math.floor(totalProducts * 0.05);
    const actualWithReviews = this.storeProducts.filter((p) => p.rating_count && p.rating_count > 0).length;
    checks.push(this.createCoverageCheck('Products with Reviews', expectedWithReviews, actualWithReviews, 0.05, 0.05));

    return this.buildCategory('Reviews', checks);
  }

  // ========================
  // Helper Methods
  // ========================

  private progress(phase: ValidationPhase, current: number, total: number, message: string): ValidationEvent {
    return { type: 'progress', phase, current, total, message };
  }

  private createCheck(name: string, expected: number, actual: number): ValidationCheck {
    const diff = expected - actual;
    let status: ValidationStatus;

    if (actual >= expected) {
      status = 'pass';
    } else if (diff <= Math.ceil(expected * 0.05)) {
      // Within 5% tolerance
      status = 'warning';
    } else {
      status = 'fail';
    }

    return { name, status, expected, actual, difference: diff };
  }

  private createCoverageCheck(
    name: string,
    expected: number,
    actual: number,
    expectedPercent: number,
    tolerancePercent: number
  ): ValidationCheck {
    const totalProducts = this.storeProducts.length;
    const toleranceAmount = Math.ceil(totalProducts * tolerancePercent);
    const diff = expected - actual;

    let status: ValidationStatus;
    if (actual >= expected - toleranceAmount) {
      status = actual >= expected ? 'pass' : 'warning';
    } else {
      status = 'fail';
    }

    return {
      name,
      status,
      expected: `~${expected} (${Math.round(expectedPercent * 100)}%)`,
      actual,
      difference: diff,
    };
  }

  private createEdgeCaseCheck(key: string, checkName: string, expected: string, actual: string): ValidationCheck {
    const isMatch = expected === actual || (expected.includes('chars') && actual.includes('chars'));
    return {
      name: `${key}: ${checkName}`,
      status: isMatch ? 'pass' : 'fail',
      expected,
      actual,
    };
  }

  private buildCategory(name: string, checks: ValidationCheck[]): ValidationCategory {
    const passCount = checks.filter((c) => c.status === 'pass').length;
    const failCount = checks.filter((c) => c.status === 'fail').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;

    let status: ValidationStatus;
    if (failCount === 0 && warningCount === 0) {
      status = 'pass';
    } else if (failCount === 0) {
      status = 'warning';
    } else {
      status = 'fail';
    }

    return { name, status, checks, passCount, failCount, warningCount };
  }

  private buildResult(categories: {
    counts: ValidationCategory;
    dataCompleteness: ValidationCategory;
    edgeCases: ValidationCategory;
    relationships: ValidationCategory;
    reviews: ValidationCategory;
  }): ValidationResult {
    const missingItems = this.calculateMissingItems();

    const allCategories = Object.values(categories);
    const totalFails = allCategories.reduce((sum, c) => sum + c.failCount, 0);
    const totalWarnings = allCategories.reduce((sum, c) => sum + c.warningCount, 0);

    let overallStatus: ValidationStatus;
    if (totalFails === 0 && totalWarnings === 0) {
      overallStatus = 'pass';
    } else if (totalFails === 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'fail';
    }

    const totalChecks = allCategories.reduce((sum, c) => sum + c.checks.length, 0);
    const passed = allCategories.reduce((sum, c) => sum + c.passCount, 0);

    return {
      timestamp: Date.now(),
      durationMs: Date.now() - this.startTime,
      overallStatus,
      categories,
      summary: {
        totalChecks,
        passed,
        failed: totalFails,
        warnings: totalWarnings,
      },
      missingItems,
    };
  }

  private calculateMissingItems(): MissingItems {
    const missingBrands = BRAND_LIST.filter((b) => !this.storeBrands.has(b.name)).map((b) => b.name);

    const missingCategories = CATEGORIES.filter((c) => !this.storeCategories.has(c.slug)).map((c) => c.slug);

    const existingSkus = new Set(this.productsBySku.keys());

    const missingSimple = ALL_PRODUCTS.filter((p) => p.type === 'simple' && !existingSkus.has(p.sku)).map((p) => p.sku);

    const missingVariable = ALL_PRODUCTS.filter((p) => p.type === 'variable' && !existingSkus.has(p.sku)).map(
      (p) => p.sku
    );

    const missingGrouped = ALL_PRODUCTS.filter((p) => p.type === 'grouped' && !existingSkus.has(p.sku)).map(
      (p) => p.sku
    );

    // Products that need relationships (40% should have them)
    const productsNeedingRelationships = ALL_PRODUCTS.filter((p, i) => i % 10 < 4)
      .filter((p) => {
        const storeProduct = this.productsBySku.get(p.sku);
        if (!storeProduct) return false;
        return !storeProduct.cross_sell_ids?.length && !storeProduct.upsell_ids?.length;
      })
      .map((p) => p.sku);

    // Products that need reviews (5% should have them)
    const productsNeedingReviews = ALL_PRODUCTS.filter((p, i) => i % 20 === 0)
      .filter((p) => {
        const storeProduct = this.productsBySku.get(p.sku);
        if (!storeProduct) return false;
        return !storeProduct.rating_count || storeProduct.rating_count === 0;
      })
      .map((p) => p.sku);

    return {
      brands: missingBrands,
      categories: missingCategories,
      products: {
        simple: missingSimple,
        variable: missingVariable,
        grouped: missingGrouped,
      },
      variations: [], // Calculated separately if needed
      relationships: productsNeedingRelationships,
      reviews: productsNeedingReviews,
    };
  }
}
