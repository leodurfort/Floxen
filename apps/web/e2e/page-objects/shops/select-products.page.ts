import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Select products page object
 * Handles product selection for shop catalog after sync
 */
export class SelectProductsPage extends BasePage {
  // Product list
  readonly productsList: Locator;
  readonly productItems: Locator;
  readonly productCheckboxes: Locator;
  readonly emptyState: Locator;

  // Selection controls
  readonly selectAllCheckbox: Locator;
  readonly deselectAllButton: Locator;
  readonly selectedCount: Locator;

  // Actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly activateFeedButton: Locator;

  // Filters and search
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly statusFilter: Locator;

  // Pagination
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageInfo: Locator;

  // Loading states
  readonly productsLoading: Locator;

  constructor(page: Page) {
    super(page);

    // Product list
    this.productsList = page.locator(
      '[data-testid="products-list"], ' + '.products-list, ' + '.product-grid'
    );
    this.productItems = page.locator(
      '[data-testid="product-item"], ' + '.product-item, ' + '.product-row'
    );
    this.productCheckboxes = page.locator(
      '[data-testid="product-checkbox"], ' +
        '.product-item input[type="checkbox"], ' +
        '.product-checkbox'
    );
    this.emptyState = page.locator(
      '[data-testid="no-products"], ' +
        '.empty-state, ' +
        'text=No products found'
    );

    // Selection controls
    this.selectAllCheckbox = page.locator(
      '[data-testid="select-all"], ' +
        'input[aria-label*="select all" i], ' +
        '.select-all-checkbox'
    );
    this.deselectAllButton = page.locator(
      'button:has-text("Deselect all"), ' +
        'button:has-text("Clear selection"), ' +
        '[data-testid="deselect-all"]'
    );
    this.selectedCount = page.locator(
      '[data-testid="selected-count"], ' +
        '.selected-count, ' +
        'text=/\\d+ selected/'
    );

    // Actions
    this.saveButton = page.locator(
      'button[type="submit"]:has-text("Save"), ' +
        'button:has-text("Save Selection"), ' +
        '[data-testid="save-selection"]'
    );
    this.cancelButton = page.locator(
      'button:has-text("Cancel"), ' + '[data-testid="cancel-selection"]'
    );
    this.activateFeedButton = page.locator(
      'button:has-text("Activate Feed"), ' +
        'button:has-text("Publish"), ' +
        '[data-testid="activate-feed"]'
    );

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
    this.pageInfo = page.locator(
      '[data-testid="page-info"], ' + '.pagination-info'
    );

    // Loading
    this.productsLoading = page.locator(
      '[data-testid="products-loading"], ' + '.products-loading'
    );
  }

  /**
   * Navigate to select products page for a shop
   */
  async goto(shopId: string): Promise<void> {
    await super.goto(`/shops/${shopId}/select-products`);
    await this.waitForLoad();
  }

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded(): Promise<void> {
    // Wait for loading indicator to disappear
    if (await this.isVisible(this.productsLoading, 1000)) {
      await expect(this.productsLoading).toBeHidden({ timeout: 30000 });
    }
    // Wait for either products or empty state
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
   * Get number of selected products
   */
  async getSelectedCount(): Promise<number> {
    const text = await this.selectedCount.textContent().catch(() => null);
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Select all products
   */
  async selectAll(): Promise<void> {
    await this.selectAllCheckbox.check();
  }

  /**
   * Deselect all products
   */
  async deselectAll(): Promise<void> {
    if (await this.deselectAllButton.isVisible().catch(() => false)) {
      await this.deselectAllButton.click();
    } else {
      await this.selectAllCheckbox.uncheck();
    }
  }

  /**
   * Select product by index
   */
  async selectProductByIndex(index: number): Promise<void> {
    const checkbox = this.productCheckboxes.nth(index);
    await checkbox.check();
  }

  /**
   * Deselect product by index
   */
  async deselectProductByIndex(index: number): Promise<void> {
    const checkbox = this.productCheckboxes.nth(index);
    await checkbox.uncheck();
  }

  /**
   * Select product by name
   */
  async selectProductByName(name: string): Promise<void> {
    const productItem = this.page.locator(
      `[data-testid="product-item"]:has-text("${name}"), ` +
        `.product-item:has-text("${name}")`
    );
    const checkbox = productItem.locator('input[type="checkbox"]');
    await checkbox.check();
  }

  /**
   * Check if product is selected by name
   */
  async isProductSelected(name: string): Promise<boolean> {
    const productItem = this.page.locator(
      `[data-testid="product-item"]:has-text("${name}"), ` +
        `.product-item:has-text("${name}")`
    );
    const checkbox = productItem.locator('input[type="checkbox"]');
    return await checkbox.isChecked();
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
   * Save selection
   */
  async saveSelection(): Promise<void> {
    await this.saveButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Cancel selection
   */
  async cancelSelection(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Activate feed with current selection
   */
  async activateFeed(): Promise<void> {
    await this.activateFeedButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Select multiple products by index
   */
  async selectProducts(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectProductByIndex(index);
    }
  }

  /**
   * Verify on select products page
   */
  async expectSelectProductsPage(): Promise<void> {
    await this.waitForProductsLoaded();
    await expect(this.productsList.or(this.emptyState)).toBeVisible();
  }

  /**
   * Verify products are displayed
   */
  async expectProductsDisplayed(): Promise<void> {
    await expect(this.productItems.first()).toBeVisible({ timeout: 15000 });
  }

  /**
   * Verify selection count
   */
  async expectSelectedCount(count: number): Promise<void> {
    await expect(this.selectedCount).toContainText(count.toString());
  }

  /**
   * Get product names
   */
  async getProductNames(): Promise<string[]> {
    await this.waitForProductsLoaded();
    const names: string[] = [];
    const count = await this.productItems.count();
    for (let i = 0; i < count; i++) {
      const nameElement = this.productItems
        .nth(i)
        .locator('.product-name, [data-testid="product-name"]');
      const name = await nameElement.textContent();
      if (name) names.push(name.trim());
    }
    return names;
  }
}
