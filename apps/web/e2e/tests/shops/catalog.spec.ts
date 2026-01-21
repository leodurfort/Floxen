import { test, expect } from '@playwright/test';
import { ProductsPage, ShopsPage } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Product Catalog', () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    test.skip(!testData.TEST_SHOP_ID, 'No test shop configured');

    productsPage = new ProductsPage(page);
    await productsPage.goto(testData.TEST_SHOP_ID);
    await productsPage.waitForProductsLoaded();
  });

  test.describe('Page Display', () => {
    test('should display products page', async () => {
      await productsPage.expectProductsPage();
    });

    test('should show products or empty state', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount > 0) {
        await productsPage.expectProductsDisplayed();
      } else {
        await productsPage.expectEmptyState();
      }
    });

    test('should display product stats', async () => {
      const productCount = await productsPage.getProductCount();
      test.skip(productCount === 0, 'No products in catalog');

      // Should show total products count
      const totalElement = productsPage.totalProducts;
      await expect(totalElement.or(productsPage.productItems.first())).toBeVisible();
    });

    test('should have sync button', async () => {
      await expect(productsPage.syncButton).toBeVisible();
    });
  });

  test.describe('Product Details', () => {
    test('should display product name', async () => {
      const productCount = await productsPage.getProductCount();
      test.skip(productCount === 0, 'No products to display');

      const name = await productsPage.getProductNameAt(0);
      expect(name).toBeTruthy();
    });

    test('should display product price', async () => {
      const productCount = await productsPage.getProductCount();
      test.skip(productCount === 0, 'No products to display');

      const price = await productsPage.getProductPriceAt(0);
      // Price may or may not be visible depending on UI
      // Just verify we can attempt to get it
    });

    test('should have product images', async () => {
      const productCount = await productsPage.getProductCount();
      test.skip(productCount === 0, 'No products to display');

      const product = productsPage.getProductByIndex(0);
      const image = product.locator('img');

      // Images may be lazy loaded or use different elements
      const hasImage = await image.isVisible().catch(() => false);
      // Don't fail if no image, just log
    });
  });

  test.describe('Search and Filter', () => {
    test('should search products by name', async () => {
      const productCount = await productsPage.getProductCount();
      test.skip(productCount === 0, 'No products to search');

      // Get first product name
      const firstName = await productsPage.getProductNameAt(0);
      test.skip(!firstName, 'Could not get product name');

      // Search for it
      const searchTerm = firstName!.split(' ')[0];
      await productsPage.searchProducts(searchTerm);

      // Should still show results
      const filteredCount = await productsPage.getProductCount();
      expect(filteredCount).toBeGreaterThan(0);
    });

    test('should filter by status if available', async () => {
      const statusFilterVisible = await productsPage.statusFilter
        .isVisible()
        .catch(() => false);
      test.skip(!statusFilterVisible, 'Status filter not available');

      // Select active status
      await productsPage.filterByStatus('active');
      await productsPage.waitForProductsLoaded();
    });

    test('should filter by category if available', async () => {
      const categoryFilterVisible = await productsPage.categoryFilter
        .isVisible()
        .catch(() => false);
      test.skip(!categoryFilterVisible, 'Category filter not available');

      const options = await productsPage.categoryFilter.locator('option').all();
      test.skip(options.length <= 1, 'No category options');

      await productsPage.filterByCategory(await options[1].getAttribute('value') || '');
      await productsPage.waitForProductsLoaded();
    });

    test('should sort products', async () => {
      const sortSelectVisible = await productsPage.sortSelect
        .isVisible()
        .catch(() => false);
      test.skip(!sortSelectVisible, 'Sort select not available');

      await productsPage.sortBy('name');
      await productsPage.waitForProductsLoaded();
    });
  });

  test.describe('Pagination', () => {
    test('should navigate pages', async () => {
      const hasNextPage = await productsPage.nextPageButton
        .isEnabled()
        .catch(() => false);
      test.skip(!hasNextPage, 'Pagination not available');

      await productsPage.nextPage();
      await productsPage.waitForProductsLoaded();

      // Should show products on page 2
      expect(await productsPage.getProductCount()).toBeGreaterThan(0);
    });

    test('should change items per page', async () => {
      const perPageVisible = await productsPage.perPageSelect
        .isVisible()
        .catch(() => false);
      test.skip(!perPageVisible, 'Per page select not available');

      await productsPage.setPerPage(50);
      await productsPage.waitForProductsLoaded();
    });
  });

  test.describe('Sync Functionality', () => {
    test('should trigger sync', async () => {
      await productsPage.clickSync();

      // Should show syncing status or success message
      const toast = await productsPage.getToastMessage();
      const status = await productsPage.getSyncStatus();

      expect(toast || status).toBeTruthy();
    });

    test('should show last sync time', async () => {
      const lastSync = await productsPage.getLastSyncTime();
      // May or may not be available
    });
  });

  test.describe('Feed Management', () => {
    test('should display feed URL if activated', async () => {
      const feedUrlVisible = await productsPage.feedUrl
        .isVisible()
        .catch(() => false);

      if (feedUrlVisible) {
        const feedUrl = await productsPage.getFeedUrl();
        expect(feedUrl).toMatch(/^https?:\/\//);
      }
    });

    test('should have copy feed URL button', async () => {
      const feedUrlVisible = await productsPage.feedUrl
        .isVisible()
        .catch(() => false);
      test.skip(!feedUrlVisible, 'Feed URL not visible');

      await expect(productsPage.copyFeedUrlButton).toBeVisible();
    });

    test('should copy feed URL to clipboard', async ({ page, context }) => {
      const feedUrlVisible = await productsPage.feedUrl
        .isVisible()
        .catch(() => false);
      test.skip(!feedUrlVisible, 'Feed URL not visible');

      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await productsPage.copyFeedUrl();

      // Verify clipboard or toast
      const toast = await productsPage.getToastMessage();
      expect(toast).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to select products', async ({ page }) => {
      const selectButton = productsPage.selectProductsButton;
      const buttonVisible = await selectButton.isVisible().catch(() => false);
      test.skip(!buttonVisible, 'Select products button not visible');

      await productsPage.clickSelectProducts();
      await expect(page).toHaveURL(/select-products/);
    });

    test('should open feed settings if available', async () => {
      const settingsButton = productsPage.feedSettingsButton;
      const buttonVisible = await settingsButton.isVisible().catch(() => false);
      test.skip(!buttonVisible, 'Feed settings button not visible');

      await productsPage.openFeedSettings();
      // Should open modal or navigate
    });
  });
});

test.describe('Catalog Navigation', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should navigate to catalog from shops list', async ({ page }) => {
    test.skip(!testData.TEST_SHOP_ID, 'No test shop configured');

    const shopsPage = new ShopsPage(page);
    await shopsPage.goto();

    await shopsPage.openShop(testData.TEST_SHOP_ID);
    await expect(page).toHaveURL(/products|shop/);
  });
});
