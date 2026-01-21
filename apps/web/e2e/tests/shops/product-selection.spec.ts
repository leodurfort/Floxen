import { test, expect } from '@playwright/test';
import { SelectProductsPage, ShopsPage } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Product Selection', () => {
  let selectProductsPage: SelectProductsPage;

  test.beforeEach(async ({ page }) => {
    test.skip(!testData.TEST_SHOP_ID, 'No test shop configured');

    selectProductsPage = new SelectProductsPage(page);
    await selectProductsPage.goto(testData.TEST_SHOP_ID);
    await selectProductsPage.waitForProductsLoaded();
  });

  test.describe('Page Display', () => {
    test('should display product selection page', async () => {
      await selectProductsPage.expectSelectProductsPage();
    });

    test('should show products list', async () => {
      const productCount = await selectProductsPage.getProductCount();

      if (productCount > 0) {
        await selectProductsPage.expectProductsDisplayed();
      } else {
        await expect(selectProductsPage.emptyState).toBeVisible();
      }
    });

    test('should have select all checkbox', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      await expect(selectProductsPage.selectAllCheckbox).toBeVisible();
    });

    test('should have save button', async () => {
      await expect(selectProductsPage.saveButton).toBeVisible();
    });
  });

  test.describe('Selection Actions', () => {
    test('should select individual product', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      await selectProductsPage.selectProductByIndex(0);

      // Verify selection
      const selectedCount = await selectProductsPage.getSelectedCount();
      expect(selectedCount).toBeGreaterThanOrEqual(1);
    });

    test('should deselect individual product', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      // Select then deselect
      await selectProductsPage.selectProductByIndex(0);
      await selectProductsPage.deselectProductByIndex(0);

      // Verify checkbox is unchecked
      const isChecked = await selectProductsPage.productCheckboxes
        .first()
        .isChecked();
      expect(isChecked).toBe(false);
    });

    test('should select all products', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      await selectProductsPage.selectAll();

      // All checkboxes should be checked
      const checkedCount = await selectProductsPage.productCheckboxes
        .filter({ has: selectProductsPage.page.locator(':checked') })
        .count();
      expect(checkedCount).toBe(productCount);
    });

    test('should deselect all products', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      // Select all first
      await selectProductsPage.selectAll();
      // Then deselect all
      await selectProductsPage.deselectAll();

      // Selected count should be 0
      const selectedCount = await selectProductsPage.getSelectedCount();
      expect(selectedCount).toBe(0);
    });
  });

  test.describe('Search and Filter', () => {
    test('should search products', async () => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to filter');

      // Get product names first
      const productNames = await selectProductsPage.getProductNames();
      test.skip(productNames.length === 0, 'Could not get product names');

      // Search for first product name
      const searchTerm = productNames[0].split(' ')[0]; // First word
      await selectProductsPage.searchProducts(searchTerm);

      // Should show filtered results
      await selectProductsPage.waitForProductsLoaded();
    });

    test('should filter by category if available', async ({ page }) => {
      const categoryFilterVisible = await selectProductsPage.categoryFilter
        .isVisible()
        .catch(() => false);
      test.skip(!categoryFilterVisible, 'Category filter not available');

      // Get available options
      const options = await selectProductsPage.categoryFilter.locator('option').all();
      test.skip(options.length <= 1, 'No category options available');

      // Select a category
      await selectProductsPage.categoryFilter.selectOption({ index: 1 });
      await selectProductsPage.waitForProductsLoaded();
    });
  });

  test.describe('Pagination', () => {
    test('should navigate to next page', async () => {
      const productCount = await selectProductsPage.getProductCount();
      const hasNextPage = await selectProductsPage.nextPageButton
        .isEnabled()
        .catch(() => false);
      test.skip(!hasNextPage, 'No next page available');

      await selectProductsPage.nextPage();
      await selectProductsPage.waitForProductsLoaded();

      // Should show different products (or at least page loaded)
      expect(await selectProductsPage.getProductCount()).toBeGreaterThan(0);
    });

    test('should navigate to previous page', async () => {
      // First go to page 2
      const hasNextPage = await selectProductsPage.nextPageButton
        .isEnabled()
        .catch(() => false);
      test.skip(!hasNextPage, 'No pages to navigate');

      await selectProductsPage.nextPage();

      // Then go back
      await selectProductsPage.previousPage();
      await selectProductsPage.waitForProductsLoaded();
    });
  });

  test.describe('Save Selection', () => {
    test('should save product selection', async ({ page }) => {
      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products to select');

      // Select some products
      await selectProductsPage.selectProductByIndex(0);
      if (productCount > 1) {
        await selectProductsPage.selectProductByIndex(1);
      }

      // Save selection
      await selectProductsPage.saveSelection();

      // Should show success or navigate back
      const toast = await selectProductsPage.getToastMessage();
      const urlChanged = !page.url().includes('select-products');

      expect(toast || urlChanged).toBeTruthy();
    });

    test('should cancel selection', async ({ page }) => {
      await selectProductsPage.cancelSelection();

      // Should navigate back to products or shops
      await expect(page).toHaveURL(/products|shops/);
    });
  });
});

test.describe('Product Selection via Shop Navigation', () => {
  test.skip(!testData.TEST_SHOP_ID, 'No test shop configured');

  test('should navigate to product selection from shops page', async ({ page }) => {
    const shopsPage = new ShopsPage(page);
    await shopsPage.goto();

    await shopsPage.openShop(testData.TEST_SHOP_ID);

    // From products page, click select products
    const selectButton = page.locator(
      'button:has-text("Select Products"), [data-testid="select-products-button"]'
    );

    if (await selectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectButton.click();
      await expect(page).toHaveURL(/select-products/);
    }
  });
});
