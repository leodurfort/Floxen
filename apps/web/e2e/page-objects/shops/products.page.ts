import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Products (Catalog) page object
 * Handles viewing and managing the product catalog for a shop
 */
export class ProductsPage extends BasePage {
  // Product list
  readonly productsList: Locator;
  readonly productItems: Locator;
  readonly emptyState: Locator;

  // Stats
  readonly totalProducts: Locator;
  readonly activeProducts: Locator;
  readonly syncStatus: Locator;
  readonly lastSyncTime: Locator;

  // Actions
  readonly syncButton: Locator;
  readonly selectProductsButton: Locator;
  readonly feedSettingsButton: Locator;
  readonly exportButton: Locator;

  // Product details
  readonly productName: Locator;
  readonly productSku: Locator;
  readonly productPrice: Locator;
  readonly productImage: Locator;
  readonly productStatus: Locator;

  // Filters and search
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly statusFilter: Locator;
  readonly sortSelect: Locator;

  // Pagination
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageInfo: Locator;
  readonly perPageSelect: Locator;

  // Feed info
  readonly feedUrl: Locator;
  readonly copyFeedUrlButton: Locator;
  readonly feedStatus: Locator;

  constructor(page: Page) {
    super(page);

    // Product list
    this.productsList = page.locator(
      '[data-testid="products-list"], ' + '.products-list, ' + '.catalog'
    );
    this.productItems = page.locator(
      '[data-testid="product-item"], ' + '.product-item, ' + '.catalog-item'
    );
    this.emptyState = page.locator(
      '[data-testid="no-products"], ' +
        '.empty-state, ' +
        'text=No products'
    );

    // Stats
    this.totalProducts = page.locator(
      '[data-testid="total-products"], ' + '.total-products, ' + 'text=/Total.*\\d+/'
    );
    this.activeProducts = page.locator(
      '[data-testid="active-products"], ' + '.active-products, ' + 'text=/Active.*\\d+/'
    );
    this.syncStatus = page.locator(
      '[data-testid="sync-status"], ' + '.sync-status'
    );
    this.lastSyncTime = page.locator(
      '[data-testid="last-sync"], ' + '.last-sync, ' + 'text=/Last sync/'
    );

    // Actions
    this.syncButton = page.locator(
      'button:has-text("Sync"), ' +
        'button:has-text("Sync Now"), ' +
        '[data-testid="sync-button"]'
    );
    this.selectProductsButton = page.locator(
      'button:has-text("Select Products"), ' +
        'button:has-text("Edit Selection"), ' +
        '[data-testid="select-products-button"]'
    );
    this.feedSettingsButton = page.locator(
      'button:has-text("Feed Settings"), ' +
        'button:has-text("Configure Feed"), ' +
        '[data-testid="feed-settings"]'
    );
    this.exportButton = page.locator(
      'button:has-text("Export"), ' + '[data-testid="export-button"]'
    );

    // Product details (for use within product items)
    this.productName = page.locator('.product-name, [data-testid="product-name"]');
    this.productSku = page.locator('.product-sku, [data-testid="product-sku"]');
    this.productPrice = page.locator('.product-price, [data-testid="product-price"]');
    this.productImage = page.locator('.product-image, [data-testid="product-image"]');
    this.productStatus = page.locator('.product-status, [data-testid="product-status"]');

    // Filters
    this.searchInput = page.locator(
      'input[placeholder*="search" i], ' + '[data-testid="search-products"]'
    );
    this.categoryFilter = page.locator(
      'select[name="category"], ' + '[data-testid="category-filter"]'
    );
    this.statusFilter = page.locator(
      'select[name="status"], ' + '[data-testid="status-filter"]'
    );
    this.sortSelect = page.locator(
      'select[name="sort"], ' + '[data-testid="sort-select"]'
    );

    // Pagination
    this.previousPageButton = page.locator(
      'button[aria-label*="previous" i], ' +
        'button:has-text("Previous"), ' +
        '[data-testid="prev-page"]'
    );
    this.nextPageButton = page.locator(
      'button[aria-label*="next" i], ' +
        'button:has-text("Next"), ' +
        '[data-testid="next-page"]'
    );
    this.pageInfo = page.locator('[data-testid="page-info"], .pagination-info');
    this.perPageSelect = page.locator(
      'select[name="perPage"], ' + '[data-testid="per-page"]'
    );

    // Feed info
    this.feedUrl = page.locator(
      '[data-testid="feed-url"], ' + '.feed-url, ' + 'input[readonly][value*="feed"]'
    );
    this.copyFeedUrlButton = page.locator(
      'button:has-text("Copy"), ' +
        '[data-testid="copy-feed-url"], ' +
        'button[aria-label*="copy" i]'
    );
    this.feedStatus = page.locator(
      '[data-testid="feed-status"], ' + '.feed-status'
    );
  }

  /**
   * Navigate to products page for a shop
   */
  async goto(shopId: string): Promise<void> {
    await super.goto(`/shops/${shopId}/products`);
    await this.waitForLoad();
  }

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded(): Promise<void> {
    await this.waitForLoadingComplete();
    await expect(this.productItems.first().or(this.emptyState)).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Get number of products displayed
   */
  async getProductCount(): Promise<number> {
    await this.waitForProductsLoaded();
    return await this.productItems.count();
  }

  /**
   * Search for products
   */
  async searchProducts(query: string): Promise<void> {
    await this.fillField(this.searchInput, query);
    await this.waitForProductsLoaded();
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.selectOption(category);
    await this.waitForProductsLoaded();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.waitForProductsLoaded();
  }

  /**
   * Sort products
   */
  async sortBy(sortOption: string): Promise<void> {
    await this.sortSelect.selectOption(sortOption);
    await this.waitForProductsLoaded();
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.waitForProductsLoaded();
  }

  /**
   * Change products per page
   */
  async setPerPage(count: number): Promise<void> {
    await this.perPageSelect.selectOption(count.toString());
    await this.waitForProductsLoaded();
  }

  /**
   * Trigger sync
   */
  async clickSync(): Promise<void> {
    await this.syncButton.click();
  }

  /**
   * Navigate to select products page
   */
  async clickSelectProducts(): Promise<void> {
    await this.selectProductsButton.click();
    await this.page.waitForURL(/.*select-products.*/);
  }

  /**
   * Open feed settings
   */
  async openFeedSettings(): Promise<void> {
    await this.feedSettingsButton.click();
  }

  /**
   * Export products
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * Get feed URL
   */
  async getFeedUrl(): Promise<string | null> {
    try {
      return await this.feedUrl.getAttribute('value').catch(() => null) ||
        await this.feedUrl.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Copy feed URL
   */
  async copyFeedUrl(): Promise<void> {
    await this.copyFeedUrlButton.click();
  }

  /**
   * Get product by index
   */
  getProductByIndex(index: number): Locator {
    return this.productItems.nth(index);
  }

  /**
   * Get product by name
   */
  getProductByName(name: string): Locator {
    return this.page.locator(
      `[data-testid="product-item"]:has-text("${name}"), ` +
        `.product-item:has-text("${name}")`
    );
  }

  /**
   * Get product name at index
   */
  async getProductNameAt(index: number): Promise<string | null> {
    const product = this.getProductByIndex(index);
    const nameElement = product.locator('.product-name, [data-testid="product-name"]');
    return await nameElement.textContent();
  }

  /**
   * Get product price at index
   */
  async getProductPriceAt(index: number): Promise<string | null> {
    const product = this.getProductByIndex(index);
    const priceElement = product.locator('.product-price, [data-testid="product-price"]');
    return await priceElement.textContent();
  }

  /**
   * Get total products count from stats
   */
  async getTotalProductsCount(): Promise<number> {
    const text = await this.totalProducts.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get active products count from stats
   */
  async getActiveProductsCount(): Promise<number> {
    const text = await this.activeProducts.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get sync status text
   */
  async getSyncStatus(): Promise<string | null> {
    try {
      return await this.syncStatus.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await this.lastSyncTime.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Verify on products page
   */
  async expectProductsPage(): Promise<void> {
    await this.waitForProductsLoaded();
  }

  /**
   * Verify products are displayed
   */
  async expectProductsDisplayed(): Promise<void> {
    await expect(this.productItems.first()).toBeVisible({ timeout: 15000 });
  }

  /**
   * Verify empty state
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify sync is in progress
   */
  async expectSyncInProgress(): Promise<void> {
    await expect(this.syncStatus).toContainText(/syncing|in progress/i);
  }

  /**
   * Verify feed URL is available
   */
  async expectFeedUrlAvailable(): Promise<void> {
    await expect(this.feedUrl).toBeVisible();
    const url = await this.getFeedUrl();
    expect(url).toBeTruthy();
    expect(url).toMatch(/^https?:\/\//);
  }
}
