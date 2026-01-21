import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Select products page object (MCP version)
 *
 * Handles:
 * - Product selection/deselection for shop catalog
 * - Bulk selection operations
 * - Search and filtering
 * - Pagination
 * - Save/cancel actions
 * - Feed activation
 */
export class SelectProductsPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to select products page for a shop
   * @param shopId - Shop ID
   */
  async goto(shopId: string): Promise<void> {
    await super.goto(`/shops/${shopId}/select-products`);
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
      text: /no products|no items|empty|not found/i,
    };
  }

  /**
   * Get selected count selector
   */
  private getSelectedCountSelector(): ElementSelector {
    return {
      text: /\d+\s*selected/i,
    };
  }

  // ========== Action Button Selectors ==========

  /**
   * Get save button selector with text fallbacks
   */
  private async getSaveButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Save',
      'Save Selection',
      'Apply',
      'Confirm',
      /save|apply|confirm/i,
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

    // Fallback to submit button
    return { role: 'button', attribute: { key: 'type', value: 'submit' } };
  }

  /**
   * Get cancel button selector
   */
  private getCancelButtonSelector(): ElementSelector {
    return {
      role: 'button',
      text: /cancel|back/i,
    };
  }

  /**
   * Get activate feed button selector with text fallbacks
   */
  private async getActivateFeedButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Activate Feed',
      'Publish',
      'Enable Feed',
      'Go Live',
      /activate|publish|enable.*feed/i,
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

    throw new Error('Activate feed button not found');
  }

  /**
   * Get deselect all button selector
   */
  private getDeselectAllButtonSelector(): ElementSelector {
    return {
      role: 'button',
      text: /deselect.*all|clear.*selection/i,
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

  // ========== Product Loading ==========

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded(): Promise<void> {
    // Wait for loading to complete
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
   * Get number of selected products from UI
   * @returns Number of selected products
   */
  async getSelectedCount(): Promise<number> {
    try {
      const text = await this.elementAdapter.getText(this.getSelectedCountSelector());
      if (!text) return 0;

      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  // ========== Selection Operations ==========

  /**
   * Select all products via checkbox
   */
  async selectAll(): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `() => {
        // Find select all checkbox
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const selectAllCheckbox = checkboxes.find(cb =>
          cb.getAttribute('aria-label')?.toLowerCase().includes('select all') ||
          cb.getAttribute('data-testid') === 'select-all' ||
          cb.classList.contains('select-all')
        );

        if (selectAllCheckbox && !selectAllCheckbox.checked) {
          selectAllCheckbox.click();
        }
      }`,
    });

    await this.sleep(500); // Wait for UI to update
  }

  /**
   * Deselect all products
   */
  async deselectAll(): Promise<void> {
    // Try button first
    const hasDeselectButton = await this.isVisible(this.getDeselectAllButtonSelector(), 2000);

    if (hasDeselectButton) {
      await this.elementAdapter.click(this.getDeselectAllButtonSelector());
    } else {
      // Use checkbox
      // @ts-ignore - MCP tools are provided globally
      await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          const selectAllCheckbox = checkboxes.find(cb =>
            cb.getAttribute('aria-label')?.toLowerCase().includes('select all') ||
            cb.getAttribute('data-testid') === 'select-all' ||
            cb.classList.contains('select-all')
          );

          if (selectAllCheckbox && selectAllCheckbox.checked) {
            selectAllCheckbox.click();
          }
        }`,
      });
    }

    await this.sleep(500);
  }

  /**
   * Select product by index
   * @param index - Product index (0-based)
   */
  async selectProductByIndex(index: number): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(index) => {
        const productItems = Array.from(document.querySelectorAll('[role="article"]'));
        const productItem = productItems[index];

        if (productItem) {
          const checkbox = productItem.querySelector('input[type="checkbox"]');
          if (checkbox && !checkbox.checked) {
            checkbox.click();
          }
        }
      }`,
    });

    await this.sleep(300);
  }

  /**
   * Deselect product by index
   * @param index - Product index (0-based)
   */
  async deselectProductByIndex(index: number): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(index) => {
        const productItems = Array.from(document.querySelectorAll('[role="article"]'));
        const productItem = productItems[index];

        if (productItem) {
          const checkbox = productItem.querySelector('input[type="checkbox"]');
          if (checkbox && checkbox.checked) {
            checkbox.click();
          }
        }
      }`,
    });

    await this.sleep(300);
  }

  /**
   * Select product by name
   * @param name - Product name
   */
  async selectProductByName(name: string): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(name) => {
        const productItems = Array.from(document.querySelectorAll('[role="article"]'));
        const productItem = productItems.find(item =>
          item.textContent?.toLowerCase().includes(name.toLowerCase())
        );

        if (productItem) {
          const checkbox = productItem.querySelector('input[type="checkbox"]');
          if (checkbox && !checkbox.checked) {
            checkbox.click();
          }
        }
      }`,
    });

    await this.sleep(300);
  }

  /**
   * Check if product is selected by name
   * @param name - Product name
   * @returns True if product is selected
   */
  async isProductSelected(name: string): Promise<boolean> {
    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__evaluate_script({
      function: `(name) => {
        const productItems = Array.from(document.querySelectorAll('[role="article"]'));
        const productItem = productItems.find(item =>
          item.textContent?.toLowerCase().includes(name.toLowerCase())
        );

        if (productItem) {
          const checkbox = productItem.querySelector('input[type="checkbox"]');
          return checkbox ? checkbox.checked : false;
        }

        return false;
      }`,
    });

    return result as boolean;
  }

  /**
   * Select multiple products by index
   * @param indices - Array of product indices
   */
  async selectProducts(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.selectProductByIndex(index);
    }
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

  // ========== Actions ==========

  /**
   * Save selection
   */
  async saveSelection(): Promise<void> {
    const saveButton = await this.getSaveButtonSelector();
    await this.elementAdapter.click(saveButton);
    await this.waitForLoadingComplete();
  }

  /**
   * Cancel selection
   */
  async cancelSelection(): Promise<void> {
    await this.elementAdapter.click(this.getCancelButtonSelector());
  }

  /**
   * Activate feed with current selection
   */
  async activateFeed(): Promise<void> {
    const activateButton = await this.getActivateFeedButtonSelector();
    await this.elementAdapter.click(activateButton);
    await this.waitForLoadingComplete();
  }

  // ========== Product Details ==========

  /**
   * Get product names
   * @returns Array of product names
   */
  async getProductNames(): Promise<string[]> {
    await this.waitForProductsLoaded();

    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__evaluate_script({
      function: `() => {
        const productItems = Array.from(document.querySelectorAll('[role="article"]'));
        return productItems.map(item => {
          // Try to find product name element
          const nameElement = item.querySelector('[data-testid="product-name"], .product-name');
          if (nameElement) {
            return nameElement.textContent?.trim() || '';
          }

          // Fallback to item text content
          return item.textContent?.split('\\n')[0]?.trim() || '';
        }).filter(name => name.length > 0);
      }`,
    });

    return result as string[];
  }

  // ========== Assertions ==========

  /**
   * Assert we're on the select products page
   */
  async expectSelectProductsPage(): Promise<void> {
    await this.waitForProductsLoaded();

    // Either products or empty state should be visible
    const hasProducts = await this.isVisible(this.getProductItemsSelector(), 2000);
    const hasEmptyState = await this.isVisible(this.getEmptyStateSelector(), 2000);

    if (!hasProducts && !hasEmptyState) {
      throw new Error('Select products page did not load properly');
    }
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
   * Assert selection count matches expected
   * @param count - Expected selection count
   */
  async expectSelectedCount(count: number): Promise<void> {
    const actualCount = await this.getSelectedCount();

    if (actualCount !== count) {
      throw new Error(`Expected ${count} selected, but found ${actualCount}`);
    }
  }

  /**
   * Assert specific product is selected
   * @param name - Product name
   */
  async expectProductSelected(name: string): Promise<void> {
    const isSelected = await this.isProductSelected(name);

    if (!isSelected) {
      throw new Error(`Expected product "${name}" to be selected, but it is not`);
    }
  }

  /**
   * Assert specific product is not selected
   * @param name - Product name
   */
  async expectProductNotSelected(name: string): Promise<void> {
    const isSelected = await this.isProductSelected(name);

    if (isSelected) {
      throw new Error(`Expected product "${name}" to not be selected, but it is`);
    }
  }
}
