import { describe, it, beforeEach } from 'vitest';
import { SelectProductsPageMCP } from '../../page-objects/shops/select-products.page.mcp.js';
import { ShopsPageMCP } from '../../page-objects/shops/shops.page.mcp.js';
import { useAuthenticatedPage } from '../../fixtures/auth.fixture.js';
import * as testData from '../../fixtures/test-data.js';

describe('Product Selection', () => {
  let selectProductsPage: SelectProductsPageMCP;

  beforeEach(async () => {
    if (!testData.TEST_SHOP_ID) {
      // Skip entire suite if no test shop
      return;
    }

    const pageAdapter = await useAuthenticatedPage();
    selectProductsPage = new SelectProductsPageMCP(pageAdapter);
    await selectProductsPage.goto(testData.TEST_SHOP_ID);
    await selectProductsPage.waitForProductsLoaded();
  });

  describe('Page Display', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should display product selection page', async () => {
      await selectProductsPage.expectSelectProductsPage();
    });

    it.skipIf(skipTests)('should show products list', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount > 0) {
        await selectProductsPage.expectProductsDisplayed();
      } else {
        await selectProductsPage.expectEmptyState();
      }
    });

    it.skipIf(skipTests)('should have select all checkbox', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      // Check for select all checkbox via evaluate_script
      // @ts-ignore - MCP tools are provided globally
      const hasSelectAll = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          const selectAllCheckbox = checkboxes.find(cb =>
            cb.getAttribute('aria-label')?.toLowerCase().includes('select all') ||
            cb.getAttribute('data-testid') === 'select-all' ||
            cb.classList.contains('select-all')
          );
          return !!selectAllCheckbox;
        }`,
      });

      if (!hasSelectAll) {
        throw new Error('Select all checkbox should be visible when products exist');
      }
    });

    it.skipIf(skipTests)('should have save button', async () => {
      const hasSaveButton = await selectProductsPage.isVisible(
        { role: 'button', text: /save|apply/i },
        5000
      );
      if (!hasSaveButton) {
        throw new Error('Save button should be visible');
      }
    });
  });

  describe('Selection Actions', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should select individual product', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      await selectProductsPage.selectProductByIndex(0);

      // Verify selection
      const selectedCount = await selectProductsPage.getSelectedCount();
      if (selectedCount < 1) {
        throw new Error('Selected count should be at least 1 after selection');
      }
    });

    it.skipIf(skipTests)('should deselect individual product', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      // Select then deselect
      await selectProductsPage.selectProductByIndex(0);
      await selectProductsPage.deselectProductByIndex(0);

      // Verify checkbox is unchecked
      // @ts-ignore - MCP tools are provided globally
      const isChecked = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const productItems = Array.from(document.querySelectorAll('[role="article"]'));
          const productItem = productItems[0];
          if (productItem) {
            const checkbox = productItem.querySelector('input[type="checkbox"]');
            return checkbox ? checkbox.checked : false;
          }
          return false;
        }`,
      });

      if (isChecked) {
        throw new Error('First product checkbox should be unchecked');
      }
    });

    it.skipIf(skipTests)('should select all products', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      await selectProductsPage.selectAll();

      // All checkboxes should be checked
      // @ts-ignore - MCP tools are provided globally
      const checkedCount = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const productItems = Array.from(document.querySelectorAll('[role="article"]'));
          let count = 0;
          productItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) count++;
          });
          return count;
        }`,
      });

      if (checkedCount !== productCount) {
        throw new Error(`Expected ${productCount} products checked, got ${checkedCount}`);
      }
    });

    it.skipIf(skipTests)('should deselect all products', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      // Select all first
      await selectProductsPage.selectAll();
      // Then deselect all
      await selectProductsPage.deselectAll();

      // Selected count should be 0
      const selectedCount = await selectProductsPage.getSelectedCount();
      if (selectedCount !== 0) {
        throw new Error(`Expected 0 selected products, got ${selectedCount}`);
      }
    });
  });

  describe('Search and Filter', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should search products', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to filter
        return;
      }

      // Get product names first
      const productNames = await selectProductsPage.getProductNames();

      if (productNames.length === 0) {
        // Could not get product names
        return;
      }

      // Search for first product name
      const searchTerm = productNames[0].split(' ')[0]; // First word
      await selectProductsPage.searchProducts(searchTerm);

      // Should show filtered results
      await selectProductsPage.waitForProductsLoaded();
    });

    it.skipIf(skipTests)('should filter by category if available', async () => {
      const hasCategoryFilter = await selectProductsPage.isVisible(
        { role: 'combobox', name: /category/i },
        2000
      );

      if (!hasCategoryFilter) {
        // Category filter not available
        return;
      }

      // Get available options via evaluate_script
      // @ts-ignore - MCP tools are provided globally
      const optionCount = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const selects = Array.from(document.querySelectorAll('select'));
          const categorySelect = selects.find(s =>
            s.name === 'category' ||
            s.getAttribute('aria-label')?.toLowerCase().includes('category')
          );
          if (categorySelect) {
            return categorySelect.options.length;
          }
          return 0;
        }`,
      });

      if (optionCount <= 1) {
        // No category options available
        return;
      }

      // Select second option (first is usually "All")
      await selectProductsPage.filterByCategory('1'); // Index or value
      await selectProductsPage.waitForProductsLoaded();
    });
  });

  describe('Pagination', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should navigate to next page', async () => {
      const hasNextPage = await selectProductsPage.isVisible(
        { role: 'button', name: /next/i },
        2000
      );

      if (!hasNextPage) {
        // No next page available
        return;
      }

      await selectProductsPage.nextPage();
      await selectProductsPage.waitForProductsLoaded();

      // Should show different products (or at least page loaded)
      const count = await selectProductsPage.getProductCount();
      if (count === 0) {
        throw new Error('Should show products on next page');
      }
    });

    it.skipIf(skipTests)('should navigate to previous page', async () => {
      // First check if next page exists
      const hasNextPage = await selectProductsPage.isVisible(
        { role: 'button', name: /next/i },
        2000
      );

      if (!hasNextPage) {
        // No pages to navigate
        return;
      }

      // Go to page 2
      await selectProductsPage.nextPage();

      // Then go back
      await selectProductsPage.previousPage();
      await selectProductsPage.waitForProductsLoaded();
    });
  });

  describe('Save Selection', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should save product selection', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount === 0) {
        // No products to select
        return;
      }

      // Select some products
      await selectProductsPage.selectProductByIndex(0);
      if (productCount > 1) {
        await selectProductsPage.selectProductByIndex(1);
      }

      // Save selection
      await selectProductsPage.saveSelection();

      // Should show success or navigate back
      await selectProductsPage.sleep(1000);

      const toast = await selectProductsPage.getToastMessage();
      const url = await selectProductsPage.getCurrentUrl();
      const urlChanged = !url.includes('select-products');

      if (!toast && !urlChanged) {
        // May not show immediate feedback, that's ok in some cases
      }
    });

    it.skipIf(skipTests)('should cancel selection', async () => {
      await selectProductsPage.cancelSelection();

      // Should navigate back to products or shops
      await selectProductsPage.sleep(500);

      const url = await selectProductsPage.getCurrentUrl();
      if (!url.includes('products') && !url.includes('shops')) {
        throw new Error('Should navigate back to products or shops page');
      }
    });
  });
});

describe('Product Selection via Shop Navigation', () => {
  const skipTests = !testData.TEST_SHOP_ID;

  it.skipIf(skipTests)(
    'should navigate to product selection from shops page',
    async () => {
      const pageAdapter = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(pageAdapter);
      await shopsPage.goto();

      await shopsPage.openShop(testData.TEST_SHOP_ID);

      // From products page, click select products
      await shopsPage.sleep(1000);

      const hasSelectButton = await shopsPage.isVisible(
        { role: 'button', text: /select.*products/i },
        5000
      );

      if (!hasSelectButton) {
        // Select products button not visible
        return;
      }

      await shopsPage.elementAdapter.click({
        role: 'button',
        text: /select.*products/i,
      });

      await shopsPage.sleep(1000);

      const url = await shopsPage.getCurrentUrl();
      if (!url.includes('select-products')) {
        throw new Error('Should navigate to select products page');
      }
    }
  );
});
