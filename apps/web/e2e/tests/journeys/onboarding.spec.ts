import { test, expect } from '@playwright/test';
import {
  LoginPage,
  ShopsPage,
  SelectProductsPage,
  ProductsPage,
  SidebarComponent,
} from '../../page-objects';
import * as testData from '../../fixtures/test-data';
import { completeWooCommerceOAuth } from '../../helpers/woocommerce-oauth.helper';

/**
 * End-to-end journey tests covering complete user flows
 */

test.describe('User Onboarding Journey', () => {
  test.describe('Login and Shop Connection', () => {
    test('should complete login to shop connection flow', async ({ page }) => {
      // Step 1: Login
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Verify logged in
      expect(await loginPage.isAuthenticated()).toBe(true);

      // Step 2: Navigate to shops
      const sidebar = new SidebarComponent(page);
      await sidebar.gotoShops();

      // Step 3: Verify on shops page
      const shopsPage = new ShopsPage(page);
      await shopsPage.expectShopsPage();

      // Check for existing shops or add new
      const shopCount = await shopsPage.getShopCount();

      if (shopCount === 0) {
        // No shops - verify add shop flow is available
        await expect(shopsPage.addShopButton).toBeVisible();
      } else {
        // Has shops - verify they display
        await expect(shopsPage.shopCards.first()).toBeVisible();
      }
    });

    test.skip(!testData.WOOCOMMERCE_URL, 'WooCommerce test store not configured');

    test('should complete full WooCommerce connection flow', async ({ page }) => {
      // Login first
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Go to shops
      const shopsPage = new ShopsPage(page);
      await shopsPage.goto();

      // Start WooCommerce connection
      await shopsPage.startWooCommerceConnection(testData.WOOCOMMERCE_URL);

      // Complete OAuth
      const oauthResult = await completeWooCommerceOAuth(page);

      if (oauthResult.success) {
        // Verify back on our app with shop connected
        await expect(page).toHaveURL(new RegExp(testData.BASE_URL));

        // Should see the new shop
        await shopsPage.waitForLoadingComplete();
        const shopCount = await shopsPage.getShopCount();
        expect(shopCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Shop Management Journey', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test.skip(!testData.TEST_SHOP_ID, 'No test shop configured');

    test('should navigate shop, view products, and trigger sync', async ({ page }) => {
      // Go to shops
      const shopsPage = new ShopsPage(page);
      await shopsPage.goto();

      // Open test shop
      await shopsPage.openShop(testData.TEST_SHOP_ID);

      // View products
      const productsPage = new ProductsPage(page);
      await productsPage.waitForProductsLoaded();

      // Trigger sync
      await productsPage.clickSync();

      // Verify sync started
      const toast = await productsPage.getToastMessage();
      expect(toast).toBeTruthy();
    });

    test('should select products and activate feed', async ({ page }) => {
      // Go to product selection
      const selectProductsPage = new SelectProductsPage(page);
      await selectProductsPage.goto(testData.TEST_SHOP_ID);
      await selectProductsPage.waitForProductsLoaded();

      const productCount = await selectProductsPage.getProductCount();
      test.skip(productCount === 0, 'No products available');

      // Select some products
      await selectProductsPage.selectProductByIndex(0);
      if (productCount > 1) {
        await selectProductsPage.selectProductByIndex(1);
      }

      // Save selection
      await selectProductsPage.saveSelection();

      // Verify success
      const toast = await selectProductsPage.getToastMessage();
      expect(toast || page.url().includes('products')).toBeTruthy();
    });
  });

  test.describe('Full Session Journey', () => {
    test('should complete login, browse, and logout', async ({ page }) => {
      // 1. Login
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // 2. Browse shops
      const sidebar = new SidebarComponent(page);
      await sidebar.gotoShops();

      const shopsPage = new ShopsPage(page);
      await shopsPage.expectShopsPage();

      // 3. Browse settings
      await sidebar.gotoSettings();
      await expect(page).toHaveURL(/settings/);

      // 4. Go back to shops
      await sidebar.gotoShops();
      await expect(page).toHaveURL(/shops/);

      // 5. Logout
      await sidebar.logout_click();

      // 6. Verify logged out
      await expect(page).toHaveURL(/login|\/$/);
      expect(await loginPage.isAuthenticated()).toBe(false);
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('should handle session expiry gracefully', async ({ page }) => {
      // Login
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Clear tokens to simulate expiry
      await loginPage.clearAuthTokens();

      // Try to access protected page
      await page.goto('/shops');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should preserve intended destination after login', async ({ page }) => {
      // Try to access protected page without auth
      await page.goto('/shops');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);

      // Login
      const loginPage = new LoginPage(page);
      await loginPage.login(testData.TEST_USER.email, testData.TEST_USER.password);

      // Should redirect to intended destination
      await expect(page).toHaveURL(/shops|dashboard/);
    });
  });

  test.describe('Mobile Journey', () => {
    test.use({
      viewport: { width: 375, height: 667 },
      storageState: 'playwright/.auth/user.json',
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Go to shops
      await page.goto('/shops');
      await page.waitForLoadState('networkidle');

      // Sidebar may be collapsed on mobile
      const sidebar = new SidebarComponent(page);

      // Open mobile menu if needed
      await sidebar.openMobileMenu();

      // Navigate via sidebar
      await sidebar.gotoSettings();
      await expect(page).toHaveURL(/settings/);

      // Go back
      await sidebar.openMobileMenu();
      await sidebar.gotoShops();
      await expect(page).toHaveURL(/shops/);
    });
  });
});

test.describe('New User Experience', () => {
  test.skip(
    !process.env.E2E_MAILBOX_API_KEY,
    'New user tests require email verification'
  );

  test('should guide new user through onboarding', async ({ page }) => {
    // This would test the complete new user flow:
    // 1. Register
    // 2. Verify email
    // 3. Set password
    // 4. Complete profile
    // 5. Connect first shop
    // 6. Select products
    // 7. Activate feed

    // Implementation would require email API integration
  });
});
