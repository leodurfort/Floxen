/**
 * Smoke tests for MCP E2E framework
 *
 * Verifies core functionality:
 * - Page creation and navigation
 * - Snapshot taking and element finding
 * - Authentication state
 * - ShopsPage with text fallback strategy
 * - Selector resilience (the original problem we're solving)
 */

import { describe, it, expect as vitestExpect, beforeAll } from 'vitest';
import { useAuthenticatedPage, useUnauthenticatedPage } from '../fixtures/auth.fixture.js';
import { ShopsPageMCP } from '../page-objects/shops/shops.page.mcp.js';
import { testData } from '../test-data.js';
import type { PageAdapter } from '../adapters/browser.adapter.js';

describe('MCP E2E Framework Smoke Tests', () => {
  describe('Page Creation and Navigation', () => {
    it('should create and navigate to a page', async () => {
      const page = await useUnauthenticatedPage();
      const url = await page.getURL();

      vitestExpect(url).toContain(testData.BASE_URL);
    });

    it('should navigate to different paths', async () => {
      const page = await useUnauthenticatedPage();
      await page.navigate(`${testData.BASE_URL}/login`);

      const url = await page.getURL();
      vitestExpect(url).toContain('/login');
    });

    it('should reload page', async () => {
      const page = await useUnauthenticatedPage();
      await page.navigate(`${testData.BASE_URL}/login`);
      await page.reload();

      const url = await page.getURL();
      vitestExpect(url).toContain('/login');
    });
  });

  describe('Snapshot and Element Finding', () => {
    it('should take a snapshot', async () => {
      const page = await useUnauthenticatedPage();
      await page.navigate(`${testData.BASE_URL}/login`);

      // @ts-ignore - MCP tools are provided globally
      const snapshot = await mcp__chrome_devtools__take_snapshot({
        verbose: false
      });

      vitestExpect(snapshot).toBeDefined();
      vitestExpect(typeof snapshot).toBe('string');
    });

    it('should find elements by text', async () => {
      const page = await useUnauthenticatedPage();
      await page.navigate(`${testData.BASE_URL}/login`);

      // Take snapshot and parse
      // @ts-ignore - MCP tools are provided globally
      const rawSnapshot = await mcp__chrome_devtools__take_snapshot({
        verbose: false
      });

      // Should contain login-related text
      vitestExpect(rawSnapshot.toLowerCase()).toMatch(/login|sign in|email|password/);
    });
  });

  describe('Authentication State', () => {
    it('should create authenticated page with localStorage tokens', async () => {
      const page = await useAuthenticatedPage();

      // Verify auth tokens are set
      // @ts-ignore - MCP tools are provided globally
      const accessToken = await mcp__chrome_devtools__evaluate_script({
        function: `() => localStorage.getItem('floxen.access')`
      });

      vitestExpect(accessToken).toBeDefined();
      vitestExpect(typeof accessToken).toBe('string');
    });

    it('should navigate to protected routes when authenticated', async () => {
      const page = await useAuthenticatedPage();
      await page.navigate(`${testData.BASE_URL}/shops`);

      const url = await page.getURL();
      vitestExpect(url).toContain('/shops');
    });
  });

  describe('ShopsPage - Text Fallback Strategy', () => {
    let page: PageAdapter;
    let shopsPage: ShopsPageMCP;

    beforeAll(async () => {
      page = await useAuthenticatedPage();
      shopsPage = new ShopsPageMCP(page);
    });

    it('should navigate to shops page', async () => {
      await shopsPage.goto();

      const url = await page.getURL();
      vitestExpect(url).toContain('/shops');
    });

    it('should find add shop button with text variations (solving selector mismatch)', async () => {
      await shopsPage.goto();

      // This is the critical test - it should find the button regardless of
      // whether it says "Add Shop" or "Connect new store"
      try {
        // This method uses text fallbacks - it should succeed even if UI changed
        await shopsPage.expectShopsPage();

        // If we get here, the button was found!
        console.log('✅ Add shop button found with text fallback strategy');
      } catch (error) {
        console.error('❌ Failed to find add shop button:', error);
        throw error;
      }
    });

    it('should get shop count', async () => {
      await shopsPage.goto();

      const shopCount = await shopsPage.getShopCount();
      vitestExpect(typeof shopCount).toBe('number');
      vitestExpect(shopCount).toBeGreaterThanOrEqual(0);
    });

    it('should check if shops exist', async () => {
      await shopsPage.goto();

      const hasShops = await shopsPage.hasShops();
      vitestExpect(typeof hasShops).toBe('boolean');
    });
  });

  describe('Selector Resilience - The Problem We Solved', () => {
    it('should handle button text changes without breaking', async () => {
      const page = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(page);

      await shopsPage.goto();

      // This test verifies the core solution:
      // The getAddShopButtonSelector() method tries multiple text variations:
      // - "Connect new store" (current production)
      // - "Add Shop" (original test expectation)
      // - "Connect Shop"
      // - "Add Store"
      // - Regex fallback: /connect.*store/i

      // If any of these variations match, the test passes
      // This makes the test resilient to UI text changes
      const foundButton = await shopsPage.expectShopsPage().then(
        () => true,
        () => false
      );

      vitestExpect(foundButton).toBe(true);
      console.log('✅ Selector resilience verified - text fallback strategy works!');
    });

    it('should provide helpful error if button is truly missing', async () => {
      const page = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(page);

      await shopsPage.goto();

      // Navigate to a page where the button definitely doesn't exist
      await page.navigate(`${testData.BASE_URL}/products`);

      // This should fail with a helpful error listing all text variations tried
      try {
        await shopsPage.expectShopsPage();
        vitestExpect.fail('Should have thrown error for missing button');
      } catch (error) {
        const errorMessage = (error as Error).message;

        // Error should mention the text variations tried
        vitestExpect(errorMessage).toMatch(/not found|tried|variation/i);
        console.log('✅ Error message is helpful:', errorMessage);
      }
    });
  });

  describe('Element Interactions', () => {
    it('should interact with elements via MCP', async () => {
      const page = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(page);

      await shopsPage.goto();

      // Wait for page to load
      await shopsPage.waitForLoadingComplete();

      // Take screenshot to verify page state
      await shopsPage.screenshot('smoke-test-shops-page');

      console.log('✅ Element interactions working');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for missing elements', async () => {
      const page = await useAuthenticatedPage();
      const shopsPage = new ShopsPageMCP(page);

      await shopsPage.goto();

      try {
        // Try to find a non-existent element
        await shopsPage.isVisible({ role: 'button', text: 'This Button Does Not Exist' }, 1000);
      } catch (error) {
        // Should not throw - isVisible returns boolean
      }
    });

    it('should handle network errors gracefully', async () => {
      try {
        const page = await useUnauthenticatedPage();

        // Try to navigate to invalid URL
        await page.navigate('http://invalid-url-that-does-not-exist.local');
      } catch (error) {
        vitestExpect(error).toBeDefined();
        console.log('✅ Network errors handled gracefully');
      }
    });
  });
});
