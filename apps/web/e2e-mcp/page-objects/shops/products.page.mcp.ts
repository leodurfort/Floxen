import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Products (Catalog) page object (MCP version)
 *
 * Handles:
 * - Viewing product catalog for a shop
 * - Searching and filtering products
 * - Product statistics
 * - Sync operations
 * - Feed management
 * - Pagination
 */
export class ProductsPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to products page for a shop
   * @param shopId - Shop ID
   */
  async goto(shopId: string): Promise<void> {
    await super.goto(`/shops/${shopId}/products`);
  }

  // ========== Product List Selectors ==========

  /**
   * Get product items selector
   */
  private getProductItemsSelector(): ElementSelector {
    return {
      role: 'article',
    };
  }

  /**
   * Get empty state selector
   */
  private getEmptyStateSelector(): ElementSelector {
    return {
      text: /no products|no items|empty/i,
    };
  }

  // ========== Action Button Selectors ==========

  /**
   * Get sync button selector with text fallbacks
   */
  private async getSyncButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Sync',
      'Sync Now',
      'Sync Products',
      'Refresh',
      /sync|refresh/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    throw new Error('Sync button not found');
  }

  /**
   * Get select products button selector with text fallbacks
   */
  private async getSelectProductsButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Select Products',
      'Edit Selection',
      'Choose Products',
      'Manage Products',
      /select.*products|edit.*selection/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    throw new Error('Select products button not found');
  }

  /**
   * Get feed settings button selector
   */
  private async getFeedSettingsButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Feed Settings',
      'Configure Feed',
      'Settings',
      /feed.*settings|configure.*feed/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    return { role: 'button', text: /settings/i };
  }

  /**
   * Get export button selector
   */
  private getExportButtonSelector(): ElementSelector {
    return {
      role: 'button',
      text: /export/i,
    };
  }

  // ========== Filter/Search Selectors ==========

  /**
   * Get search input selector
   */
  private getSearchInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /search/i,
    };
  }

  /**
   * Get category filter selector
   */
  private getCategoryFilterSelector(): ElementSelector {
    return {
      role: 'combobox',
      name: /category/i,
    };
  }

  /**
   * Get status filter selector
   */
  private getStatusFilterSelector(): ElementSelector {
    return {
      role: 'combobox',
      name: /status/i,
    };
  }

  /**
   * Get sort select selector
   */
  private getSortSelectSelector(): ElementSelector {
    return {
      role: 'combobox',
      name: /sort/i,
    };
  }

  // ========== Pagination Selectors ==========

  /**
   * Get previous page button selector
   */
  private getPreviousPageButtonSelector(): ElementSelector {
    return {
      role: 'button',
      name: /previous/i,
    };
  }

  /**
   * Get next page button selector
   */
  private getNextPageButtonSelector(): ElementSelector {
    return {
      role: 'button',
      name: /next/i,
    };
  }

  /**
   * Get per page select selector
   */
  private getPerPageSelectSelector(): ElementSelector {
    return {
      role: 'combobox',
      name: /per.*page|items.*per.*page/i,
    };
  }

  // ========== Product Loading ==========

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded(): Promise<void> {
    await this.waitForLoadingComplete();

    // Wait for either products or empty state
    const hasProducts = await this.isVisible(this.getProductItemsSelector(), 15000);
    const hasEmptyState = await this.isVisible(this.getEmptyStateSelector(), 2000);

    if (!hasProducts && !hasEmptyState) {
      throw new Error('Neither products nor empty state appeared');
    }
  }

  /**
   * Get number of products displayed
   * @returns Number of product items
   */
  async getProductCount(): Promise<number> {
    await this.waitForProductsLoaded();

    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);
    const products = this.snapshotAdapter.findElements(snapshot, this.getProductItemsSelector());

    return products.length;
  }

  /**
   * Check if products are displayed
   * @returns True if products exist
   */
  async hasProducts(): Promise<boolean> {
    return (await this.getProductCount()) > 0;
  }

  // ========== Search and Filters ==========

  /**
   * Search for products
   * @param query - Search query
   */
  async searchProducts(query: string): Promise<void> {
    await this.fillField(this.getSearchInputSelector(), query);
    await this.waitForProductsLoaded();
  }

  /**
   * Filter by category
   * @param category - Category name or value
   */
  async filterByCategory(category: string): Promise<void> {
    // For select elements, we need to use evaluate_script
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(category) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const categorySelect = selects.find(s =>
          s.name === 'category' ||
          s.getAttribute('aria-label')?.toLowerCase().includes('category')
        );
        if (categorySelect) {
          categorySelect.value = category;
          categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }`,
    });

    await this.waitForProductsLoaded();
  }

  /**
   * Filter by status
   * @param status - Status value
   */
  async filterByStatus(status: string): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(status) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const statusSelect = selects.find(s =>
          s.name === 'status' ||
          s.getAttribute('aria-label')?.toLowerCase().includes('status')
        );
        if (statusSelect) {
          statusSelect.value = status;
          statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }`,
    });

    await this.waitForProductsLoaded();
  }

  /**
   * Sort products
   * @param sortOption - Sort option value
   */
  async sortBy(sortOption: string): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(sortOption) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const sortSelect = selects.find(s =>
          s.name === 'sort' ||
          s.getAttribute('aria-label')?.toLowerCase().includes('sort')
        );
        if (sortSelect) {
          sortSelect.value = sortOption;
          sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }`,
    });

    await this.waitForProductsLoaded();
  }

  // ========== Pagination ==========

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    await this.elementAdapter.click(this.getNextPageButtonSelector());
    await this.waitForProductsLoaded();
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    await this.elementAdapter.click(this.getPreviousPageButtonSelector());
    await this.waitForProductsLoaded();
  }

  /**
   * Change products per page
   * @param count - Number of products per page
   */
  async setPerPage(count: number): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(count) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const perPageSelect = selects.find(s =>
          s.name === 'perPage' ||
          s.getAttribute('aria-label')?.toLowerCase().includes('per page')
        );
        if (perPageSelect) {
          perPageSelect.value = count.toString();
          perPageSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }`,
    });

    await this.waitForProductsLoaded();
  }

  // ========== Actions ==========

  /**
   * Trigger sync
   */
  async clickSync(): Promise<void> {
    const syncButton = await this.getSyncButtonSelector();
    await this.elementAdapter.click(syncButton);
  }

  /**
   * Navigate to select products page
   */
  async clickSelectProducts(): Promise<void> {
    const selectButton = await this.getSelectProductsButtonSelector();
    await this.elementAdapter.click(selectButton);

    // Wait for URL to contain 'select-products'
    await this.expectUrl(/select-products/);
  }

  /**
   * Open feed settings
   */
  async openFeedSettings(): Promise<void> {
    const settingsButton = await this.getFeedSettingsButtonSelector();
    await this.elementAdapter.click(settingsButton);
  }

  /**
   * Export products
   */
  async clickExport(): Promise<void> {
    await this.elementAdapter.click(this.getExportButtonSelector());
  }

  // ========== Product Details ==========

  /**
   * Get product name at index
   * @param index - Product index (0-based)
   * @returns Product name or null
   */
  async getProductNameAt(index: number): Promise<string | null> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);
    const products = this.snapshotAdapter.findElements(snapshot, this.getProductItemsSelector());

    if (index >= products.length) {
      return null;
    }

    // Get the product UID and find its name child
    const productUid = products[index];
    const productElement = this.findElementInSnapshot(snapshot, productUid);

    // Look for name in children
    return this.findTextInElement(productElement, /product.*name|name/i);
  }

  /**
   * Get product price at index
   * @param index - Product index (0-based)
   * @returns Product price or null
   */
  async getProductPriceAt(index: number): Promise<string | null> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);
    const products = this.snapshotAdapter.findElements(snapshot, this.getProductItemsSelector());

    if (index >= products.length) {
      return null;
    }

    const productUid = products[index];
    const productElement = this.findElementInSnapshot(snapshot, productUid);

    // Look for price in children
    return this.findTextInElement(productElement, /\$\d+|\d+\.\d+|price/i);
  }

  // ========== Stats ==========

  /**
   * Get total products count from stats display
   * @returns Total product count
   */
  async getTotalProductsCount(): Promise<number> {
    try {
      const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);
      const statElement = this.snapshotAdapter.findElement(snapshot, {
        text: /total.*\d+/i,
      });

      if (!statElement) return 0;

      const text = await this.elementAdapter.getText({ text: /total.*\d+/i });
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get active products count from stats display
   * @returns Active product count
   */
  async getActiveProductsCount(): Promise<number> {
    try {
      const text = await this.elementAdapter.getText({ text: /active.*\d+/i });
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get sync status text
   * @returns Sync status or null
   */
  async getSyncStatus(): Promise<string | null> {
    try {
      return await this.elementAdapter.getText({ text: /sync.*status|syncing|synced/i });
    } catch {
      return null;
    }
  }

  /**
   * Get last sync time
   * @returns Last sync time or null
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await this.elementAdapter.getText({ text: /last sync/i });
    } catch {
      return null;
    }
  }

  // ========== Feed Management ==========

  /**
   * Get feed URL
   * @returns Feed URL or null
   */
  async getFeedUrl(): Promise<string | null> {
    try {
      // @ts-ignore - MCP tools are provided globally
      const result = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const inputs = Array.from(document.querySelectorAll('input[readonly]'));
          const feedInput = inputs.find(i => i.value.includes('feed'));
          return feedInput ? feedInput.value : null;
        }`,
      });
      return result as string | null;
    } catch {
      return null;
    }
  }

  /**
   * Copy feed URL to clipboard
   */
  async copyFeedUrl(): Promise<void> {
    const copyButton: ElementSelector = {
      role: 'button',
      name: /copy/i,
    };
    await this.elementAdapter.click(copyButton);
  }

  // ========== Helper Methods ==========

  /**
   * Find element in snapshot by UID
   * @private
   */
  private findElementInSnapshot(snapshot: any, uid: string): any {
    if (snapshot.uid === uid) return snapshot;

    if (snapshot.children) {
      for (const child of snapshot.children) {
        const found = this.findElementInSnapshot(child, uid);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Find text in element matching pattern
   * @private
   */
  private findTextInElement(element: any, pattern: RegExp): string | null {
    if (element.text && pattern.test(element.text)) {
      return element.text;
    }

    if (element.name && pattern.test(element.name)) {
      return element.name;
    }

    if (element.children) {
      for (const child of element.children) {
        const found = this.findTextInElement(child, pattern);
        if (found) return found;
      }
    }

    return null;
  }

  // ========== Assertions ==========

  /**
   * Assert we're on the products page
   */
  async expectProductsPage(): Promise<void> {
    await this.waitForProductsLoaded();
  }

  /**
   * Assert products are displayed
   */
  async expectProductsDisplayed(): Promise<void> {
    await expect(this.getProductItemsSelector(), this.elementAdapter).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.getEmptyStateSelector(), this.elementAdapter).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Assert sync is in progress
   */
  async expectSyncInProgress(): Promise<void> {
    const status = await this.getSyncStatus();
    const isInProgress =
      status?.toLowerCase().includes('syncing') ||
      status?.toLowerCase().includes('in progress');

    if (!isInProgress) {
      throw new Error(`Expected sync in progress, got: ${status}`);
    }
  }

  /**
   * Assert feed URL is available
   */
  async expectFeedUrlAvailable(): Promise<void> {
    const url = await this.getFeedUrl();

    if (!url) {
      throw new Error('Feed URL not found');
    }

    if (!url.match(/^https?:\/\//)) {
      throw new Error(`Invalid feed URL format: ${url}`);
    }
  }
}
