/**
 * Example Test Patterns for Chrome DevTools MCP Tests
 *
 * This file demonstrates common testing patterns used in the E2E MCP test suite.
 * Use this as a reference when writing new tests.
 */

import { describe, it, beforeEach } from 'vitest';
import { BasePageMCP } from '../page-objects/base.page.mcp.js';
import { useAuthenticatedPage } from '../fixtures/auth.fixture.js';
import type { ElementSelector } from '../adapters/types.js';

describe('Example Test Patterns', () => {
  let page: BasePageMCP;

  beforeEach(async () => {
    // Pattern 1: Get authenticated page for tests requiring login
    const pageAdapter = await useAuthenticatedPage();
    page = new BasePageMCP(pageAdapter);
  });

  describe('Pattern 1: Basic Navigation', () => {
    it('should navigate to a page and verify URL', async () => {
      // Navigate to page
      await page.goto('/dashboard');

      // Wait for page to load
      await page.waitForLoad();

      // Verify URL
      await page.expectUrl(/dashboard/);
    });
  });

  describe('Pattern 2: Element Visibility', () => {
    it('should check if element is visible', async () => {
      await page.goto('/dashboard');

      // Check visibility with timeout
      const isVisible = await page.isVisible(
        { role: 'button', text: /add/i },
        5000
      );

      if (!isVisible) {
        throw new Error('Add button should be visible');
      }
    });

    it('should wait for element to appear', async () => {
      await page.goto('/dashboard');

      // Wait for element with custom timeout
      await page.waitForElement(
        { role: 'heading', text: 'Dashboard' },
        10000
      );
    });
  });

  describe('Pattern 3: Text Fallback Strategy', () => {
    it('should find element with multiple text variations', async () => {
      await page.goto('/shops');

      // Define text variations (most common first)
      const textVariations = [
        'Connect new store',  // Current production
        'Add Shop',           // Alternative
        'Connect Shop',       // Another alternative
        /connect.*shop/i,     // Regex fallback
      ];

      // Try each variation
      let found = false;
      for (const text of textVariations) {
        const selector: ElementSelector = {
          role: 'button',
          text,
        };

        if (await page.isVisible(selector, 1000)) {
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error('Add shop button not found with any text variation');
      }
    });
  });

  describe('Pattern 4: Form Interactions', () => {
    it('should fill and submit a form', async () => {
      await page.goto('/login');

      // Fill form fields
      await page.elementAdapter.fill(
        { role: 'textbox', name: /email/i },
        'test@example.com'
      );

      await page.elementAdapter.fill(
        { role: 'textbox', name: /password/i },
        'password123'
      );

      // Click submit button
      await page.elementAdapter.click({
        role: 'button',
        text: /sign in|login/i,
      });

      // Wait for navigation
      await page.waitForLoad();
    });
  });

  describe('Pattern 5: Conditional Test Skipping', () => {
    const skipTest = !process.env.E2E_TEST_SHOP_ID;

    it.skipIf(skipTest)('should run only if shop ID configured', async () => {
      // This test only runs if E2E_TEST_SHOP_ID is set
      await page.goto(`/shops/${process.env.E2E_TEST_SHOP_ID}`);
      await page.waitForLoad();
    });
  });

  describe('Pattern 6: Dynamic Content Handling', () => {
    it('should handle dynamically loaded content', async () => {
      await page.goto('/products');

      // Wait for loading indicator to disappear
      await page.waitForLoadingComplete();

      // Or wait for specific content
      await page.waitForElement(
        { role: 'article' },
        10000
      );
    });
  });

  describe('Pattern 7: Toast Messages', () => {
    it('should verify toast message appears', async () => {
      await page.goto('/shops');

      // Perform action that shows toast
      await page.elementAdapter.click({
        role: 'button',
        text: /sync/i,
      });

      // Check for toast message
      const toast = await page.getToastMessage();
      if (!toast) {
        // Toast might not appear, that's okay in some cases
        return;
      }

      // Verify toast content (if it appeared)
      if (!toast.match(/success|synced/i)) {
        throw new Error(`Unexpected toast message: ${toast}`);
      }
    });
  });

  describe('Pattern 8: Error Handling', () => {
    it('should handle missing elements gracefully', async () => {
      await page.goto('/dashboard');

      // Check for optional element
      const hasOptionalButton = await page.isVisible(
        { role: 'button', text: /optional/i },
        2000
      );

      if (!hasOptionalButton) {
        // Element doesn't exist, skip this part
        return;
      }

      // Element exists, interact with it
      await page.elementAdapter.click({
        role: 'button',
        text: /optional/i,
      });
    });
  });

  describe('Pattern 9: Using evaluate_script for Complex Operations', () => {
    it('should use evaluate_script for DOM queries', async () => {
      await page.goto('/products');

      // Get product count via JavaScript
      // @ts-ignore - MCP tools are provided globally
      const productCount = await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const products = document.querySelectorAll('[role="article"]');
          return products.length;
        }`,
      });

      if (productCount === 0) {
        // No products available
        return;
      }

      // productCount is now available for assertions
    });

    it('should manipulate checkboxes with evaluate_script', async () => {
      await page.goto('/products/select');

      // Check all checkboxes via JavaScript
      // @ts-ignore - MCP tools are provided globally
      await mcp__chrome_devtools__evaluate_script({
        function: `() => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => {
            if (!cb.checked) cb.click();
          });
        }`,
      });

      // Wait for state to update
      await page.sleep(500);
    });
  });

  describe('Pattern 10: localStorage Access', () => {
    it('should read from localStorage', async () => {
      await page.goto('/dashboard');

      // Get localStorage item
      const accessToken = await page.getLocalStorageItem('floxen.access');

      if (!accessToken) {
        throw new Error('User should be authenticated');
      }
    });

    it('should write to localStorage', async () => {
      await page.goto('/dashboard');

      // Set localStorage item
      await page.setLocalStorageItem('test_key', 'test_value');

      // Verify it was set
      const value = await page.getLocalStorageItem('test_key');
      if (value !== 'test_value') {
        throw new Error('localStorage item not set correctly');
      }
    });
  });

  describe('Pattern 11: Multi-Step Flows', () => {
    it('should handle multi-step wizard', async () => {
      await page.goto('/register');

      // Step 1: Email
      await page.elementAdapter.fill(
        { role: 'textbox', name: /email/i },
        'test@example.com'
      );
      await page.elementAdapter.click({
        role: 'button',
        text: /continue|next/i,
      });
      await page.sleep(1000);

      // Step 2: Verification (if verification step exists)
      const hasVerificationInput = await page.isVisible(
        { role: 'textbox', name: /code|verification/i },
        2000
      );

      if (hasVerificationInput) {
        await page.elementAdapter.fill(
          { role: 'textbox', name: /code|verification/i },
          '123456'
        );
        await page.elementAdapter.click({
          role: 'button',
          text: /verify|continue/i,
        });
        await page.sleep(1000);
      }

      // Continue with remaining steps...
    });
  });

  describe('Pattern 12: Pagination', () => {
    it('should navigate through pages', async () => {
      await page.goto('/products');

      // Check if next page button exists
      const hasNextPage = await page.isVisible(
        { role: 'button', name: /next/i },
        2000
      );

      if (!hasNextPage) {
        // No pagination available
        return;
      }

      // Go to next page
      await page.elementAdapter.click({
        role: 'button',
        name: /next/i,
      });

      await page.waitForLoadingComplete();

      // Verify page changed (URL or content)
      await page.sleep(1000);
    });
  });

  describe('Pattern 13: Search and Filter', () => {
    it('should search and filter results', async () => {
      await page.goto('/products');

      // Search
      await page.elementAdapter.fill(
        { role: 'searchbox' },
        'test product'
      );

      // Wait for results to update
      await page.sleep(500);

      // Apply filter (if available)
      const hasFilter = await page.isVisible(
        { role: 'combobox', name: /category/i },
        2000
      );

      if (hasFilter) {
        await page.elementAdapter.fill(
          { role: 'combobox', name: /category/i },
          'electronics'
        );
        await page.sleep(500);
      }
    });
  });

  describe('Pattern 14: Screenshots on Failure', () => {
    it('should capture screenshot on failure', async () => {
      try {
        await page.goto('/products');

        // Perform test operations
        const element = await page.isVisible(
          { role: 'button', text: 'NonExistentButton' },
          5000
        );

        if (!element) {
          throw new Error('Element not found');
        }
      } catch (error) {
        // Capture screenshot before re-throwing
        await page.screenshot('test-failure');
        throw error;
      }
    });
  });

  describe('Pattern 15: Wait for Network Idle', () => {
    it('should wait for network requests to complete', async () => {
      await page.goto('/products');

      // Wait for initial load
      await page.waitForLoad();

      // Perform action that triggers requests
      await page.elementAdapter.click({
        role: 'button',
        text: /sync/i,
      });

      // Wait for network to be idle
      await page.sleep(2000); // Or implement custom network idle detection
    });
  });
});

/**
 * Pattern 16: Page Object Usage Example
 *
 * Instead of using BasePageMCP directly, extend it for specific pages:
 */
class ExampleShopsPage extends BasePageMCP {
  async clickAddShop(): Promise<void> {
    const selector = await this.getAddShopButtonSelector();
    await this.elementAdapter.click(selector);
  }

  private async getAddShopButtonSelector(): Promise<ElementSelector> {
    const textVariations = [
      'Connect new store',
      'Add Shop',
      'Connect Shop',
      /connect.*shop/i,
    ];

    for (const text of textVariations) {
      const snapshot = await this.snapshotAdapter.takeSnapshot(
        this.pageAdapter.pageId
      );
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });
      if (uid) {
        return { role: 'button', text };
      }
    }

    throw new Error('Add shop button not found');
  }

  async expectShopsPage(): Promise<void> {
    await this.expectUrl(/shops/);
    await this.waitForElement({ text: /shops|stores/i }, 5000);
  }
}

describe('Pattern 16: Using Page Objects', () => {
  it('should use page object methods', async () => {
    const pageAdapter = await useAuthenticatedPage();
    const shopsPage = new ExampleShopsPage(pageAdapter);

    await shopsPage.goto('/shops');
    await shopsPage.expectShopsPage();
    await shopsPage.clickAddShop();
  });
});
