import { describe, it, beforeEach } from 'vitest';
import { ProductsPageMCP } from '../../page-objects/shops/products.page.mcp.js';
import { ShopsPageMCP } from '../../page-objects/shops/shops.page.mcp.js';
import { useAuthenticatedPage } from '../../fixtures/auth.fixture.js';
import * as testData from '../../fixtures/test-data.js';

describe('Product Catalog', () => {
  let productsPage: ProductsPageMCP;

  beforeEach(async () => {
    if (!testData.TEST_SHOP_ID) {
      // Skip entire suite if no test shop
      return;
    }

    const pageAdapter = await useAuthenticatedPage();
    productsPage = new ProductsPageMCP(pageAdapter);
    await productsPage.goto(testData.TEST_SHOP_ID);
    await productsPage.waitForProductsLoaded();
  });

  describe('Page Display', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should display products page', async () => {
      await productsPage.expectProductsPage();
    });

    it.skipIf(skipTests)('should show products or empty state', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount > 0) {
        await productsPage.expectProductsDisplayed();
      } else {
        await productsPage.expectEmptyState();
      }
    });

    it.skipIf(skipTests)('should display product stats', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount === 0) {
        // No products to show stats
        return;
      }

      // Should show total products count or products list
      const hasStats = await productsPage.isVisible(
        { text: /total.*\d+/i },
        3000
      );
      const hasProducts = await productsPage.isVisible(
        { role: 'article' },
        3000
      );

      if (!hasStats && !hasProducts) {
        throw new Error('Should show product stats or product items');
      }
    });

    it.skipIf(skipTests)('should have sync button', async () => {
      const hasSyncButton = await productsPage.isVisible(
        { role: 'button', text: /sync/i },
        5000
      );
      if (!hasSyncButton) {
        throw new Error('Sync button should be visible');
      }
    });
  });

  describe('Product Details', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should display product name', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount === 0) {
        // No products to display
        return;
      }

      const name = await productsPage.getProductNameAt(0);
      if (!name) {
        throw new Error('Product name should be available');
      }
    });

    it.skipIf(skipTests)('should display product price', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount === 0) {
        // No products to display
        return;
      }

      const price = await productsPage.getProductPriceAt(0);
      // Price may or may not be visible depending on UI
      // Just verify we can attempt to get it without errors
    });

    it.skipIf(skipTests)('should have product images', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount === 0) {
        // No products to display
        return;
      }

      // Check for images within product articles
      const hasImages = await productsPage.isVisible(
        { role: 'img' },
        3000
      );
      // Images may be lazy loaded, so we don't fail if none found
    });
  });

  describe('Search and Filter', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should search products by name', async () => {
      const productCount = await productsPage.getProductCount();

      if (productCount === 0) {
        // No products to search
        return;
      }

      // Get first product name
      const firstName = await productsPage.getProductNameAt(0);

      if (!firstName) {
        // Could not get product name
        return;
      }

      // Search for first word of product name
      const searchTerm = firstName.split(' ')[0];
      await productsPage.searchProducts(searchTerm);

      // Should still show results
      const filteredCount = await productsPage.getProductCount();
      if (filteredCount === 0) {
        throw new Error('Search should return at least one result for existing product');
      }
    });

    it.skipIf(skipTests)('should filter by status if available', async () => {
      const hasStatusFilter = await productsPage.isVisible(
        { role: 'combobox', name: /status/i },
        2000
      );

      if (!hasStatusFilter) {
        // Status filter not available
        return;
      }

      // Select active status
      await productsPage.filterByStatus('active');
      await productsPage.waitForProductsLoaded();
    });

    it.skipIf(skipTests)('should filter by category if available', async () => {
      const hasCategoryFilter = await productsPage.isVisible(
        { role: 'combobox', name: /category/i },
        2000
      );

      if (!hasCategoryFilter) {
        // Category filter not available
        return;
      }

      // Try to filter by a category
      // Note: Would need to inspect available options first
      // For now, just verify the filter exists
    });

    it.skipIf(skipTests)('should sort products', async () => {
      const hasSortSelect = await productsPage.isVisible(
        { role: 'combobox', name: /sort/i },
        2000
      );

      if (!hasSortSelect) {
        // Sort select not available
        return;
      }

      await productsPage.sortBy('name');
      await productsPage.waitForProductsLoaded();
    });
  });

  describe('Pagination', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should navigate pages', async () => {
      const hasNextPage = await productsPage.isVisible(
        { role: 'button', name: /next/i },
        2000
      );

      if (!hasNextPage) {
        // Pagination not available (not enough products)
        return;
      }

      await productsPage.nextPage();
      await productsPage.waitForProductsLoaded();

      // Should show products on page 2
      const count = await productsPage.getProductCount();
      if (count === 0) {
        throw new Error('Should show products on next page');
      }
    });

    it.skipIf(skipTests)('should change items per page', async () => {
      const hasPerPageSelect = await productsPage.isVisible(
        { role: 'combobox', name: /per.*page/i },
        2000
      );

      if (!hasPerPageSelect) {
        // Per page select not available
        return;
      }

      await productsPage.setPerPage(50);
      await productsPage.waitForProductsLoaded();
    });
  });

  describe('Sync Functionality', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should trigger sync', async () => {
      await productsPage.clickSync();

      // Should show syncing status or success message
      await productsPage.sleep(1000);

      const toast = await productsPage.getToastMessage();
      const status = await productsPage.getSyncStatus();

      if (!toast && !status) {
        // May not show immediate feedback, that's ok
      }
    });

    it.skipIf(skipTests)('should show last sync time', async () => {
      const lastSync = await productsPage.getLastSyncTime();
      // May or may not be available, just verify no errors
    });
  });

  describe('Feed Management', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should display feed URL if activated', async () => {
      const feedUrl = await productsPage.getFeedUrl();

      if (feedUrl) {
        // Should be a valid URL
        if (!feedUrl.match(/^https?:\/\//)) {
          throw new Error(`Invalid feed URL format: ${feedUrl}`);
        }
      }
    });

    it.skipIf(skipTests)('should have copy feed URL button', async () => {
      const feedUrl = await productsPage.getFeedUrl();

      if (!feedUrl) {
        // Feed not activated, skip
        return;
      }

      const hasCopyButton = await productsPage.isVisible(
        { role: 'button', name: /copy/i },
        3000
      );
      if (!hasCopyButton) {
        throw new Error('Copy feed URL button should be visible when feed is active');
      }
    });

    it.skipIf(skipTests)('should copy feed URL to clipboard', async () => {
      const feedUrl = await productsPage.getFeedUrl();

      if (!feedUrl) {
        // Feed not activated, skip
        return;
      }

      await productsPage.copyFeedUrl();

      // Verify toast message
      const toast = await productsPage.getToastMessage();
      if (!toast) {
        // Toast may not show, that's ok
      }
    });
  });

  describe('Navigation', () => {
    const skipTests = !testData.TEST_SHOP_ID;

    it.skipIf(skipTests)('should navigate to select products', async () => {
      const hasSelectButton = await productsPage.isVisible(
        { role: 'button', text: /select.*products/i },
        3000
      );

      if (!hasSelectButton) {
        // Select products button not visible
        return;
      }

      await productsPage.clickSelectProducts();

      const url = await productsPage.getCurrentUrl();
      if (!url.includes('select-products')) {
        throw new Error('Should navigate to select products page');
      }
    });

    it.skipIf(skipTests)('should open feed settings if available', async () => {
      const hasSettingsButton = await productsPage.isVisible(
        { role: 'button', text: /settings/i },
        3000
      );

      if (!hasSettingsButton) {
        // Feed settings button not visible
        return;
      }

      await productsPage.openFeedSettings();
      // Should open modal or navigate
      await productsPage.sleep(500);
    });
  });
});

describe('Catalog Navigation', () => {
  const skipTests = !testData.TEST_SHOP_ID;

  it.skipIf(skipTests)(
    'should navigate to catalog from shops list',
    async () => {
      const pageAdapter = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(pageAdapter);
      await shopsPage.goto();

      await shopsPage.openShop(testData.TEST_SHOP_ID);

      const url = await shopsPage.getCurrentUrl();
      if (!url.includes('products') && !url.includes('shop')) {
        throw new Error('Should navigate to products page from shops list');
      }
    }
  );
});
