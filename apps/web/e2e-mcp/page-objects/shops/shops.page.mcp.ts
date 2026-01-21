import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Shops page object (MCP version)
 *
 * Handles:
 * - Shop listing and empty state
 * - Adding new shops
 * - Shop connection modal
 * - WooCommerce OAuth flow
 */
export class ShopsPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to shops page
   */
  async goto(): Promise<void> {
    await super.goto('/shops');
  }

  // ========== Shop List ==========

  /**
   * Get count of shops
   * @returns Number of shops
   */
  async getShopCount(): Promise<number> {
    await this.waitForLoadingComplete();
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    // Find all shop cards by role
    const shopCards = this.snapshotAdapter.findElements(snapshot, {
      role: 'article',
    });

    return shopCards.length;
  }

  /**
   * Check if any shops exist
   * @returns True if shops exist
   */
  async hasShops(): Promise<boolean> {
    return (await this.getShopCount()) > 0;
  }

  // ========== Add Shop Button ==========

  /**
   * Get selector for "Add Shop" button with text fallbacks
   * This handles the UI text variations that caused test failures
   * @returns Element selector
   */
  private async getAddShopButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    // Try multiple text variations to handle UI changes
    const textVariations = [
      'Connect new store',  // Current production text
      'Add Shop',           // Original expected text
      'Connect Shop',       // Alternative text
      'Add Store',          // Another alternative
      /connect.*store/i,    // Regex fallback
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

    throw new Error(
      'Add shop button not found with any known text variation.\n' +
      'Tried: ' + textVariations.map(t => t.toString()).join(', ')
    );
  }

  /**
   * Click the add shop button
   * Uses .first() equivalent by finding the button
   */
  async clickAddShop(): Promise<void> {
    const selector = await this.getAddShopButtonSelector();
    await this.elementAdapter.click(selector);

    // Wait for connection modal to appear
    await expect({ role: 'dialog' }, this.elementAdapter).toBeVisible({ timeout: 5000 });
  }

  // ========== WooCommerce Connection ==========

  /**
   * Start WooCommerce connection flow
   * @param storeUrl - WooCommerce store URL
   */
  async startWooCommerceConnection(storeUrl: string): Promise<void> {
    await this.clickAddShop();

    // Check if platform selection exists
    const wcButtonVisible = await this.isVisible({
      role: 'button',
      text: /woocommerce/i,
    }, 2000);

    if (wcButtonVisible) {
      await this.elementAdapter.click({ role: 'button', text: /woocommerce/i });
    }

    // Fill store URL
    await expect({
      role: 'textbox',
      name: /url|store/i,
    }, this.elementAdapter).toBeVisible({ timeout: 5000 });

    await this.elementAdapter.fill({ role: 'textbox', name: /url|store/i }, storeUrl);

    // Click connect/continue button
    await this.elementAdapter.click({ role: 'button', text: /connect|continue/i });
  }

  /**
   * Close connection modal
   */
  async closeConnectionModal(): Promise<void> {
    const cancelSelectors = [
      { role: 'button', text: /cancel/i },
      { role: 'button', name: /close/i },
      { role: 'button', text: /×/i },
    ];

    for (const selector of cancelSelectors) {
      if (await this.isVisible(selector, 1000)) {
        await this.elementAdapter.click(selector);
        return;
      }
    }
  }

  // ========== Shop Card Operations ==========

  /**
   * Get shop card selector by ID
   * @param shopId - Shop ID
   * @returns Element selector
   */
  getShopCardById(shopId: string): ElementSelector {
    return {
      role: 'article',
      attribute: { key: 'data-shop-id', value: shopId },
    };
  }

  /**
   * Open a specific shop
   * @param shopId - Shop ID
   */
  async openShop(shopId: string): Promise<void> {
    const selector = this.getShopCardById(shopId);
    await this.elementAdapter.click(selector);
    await this.expectUrl(/shop|products/);
  }

  /**
   * Get shop status text
   * @param shopId - Shop ID
   * @returns Status text
   */
  async getShopStatus(shopId: string): Promise<string | null> {
    const statusSelector: ElementSelector = {
      role: 'status',
    };
    return await this.elementAdapter.getText(statusSelector);
  }

  // ========== Assertions ==========

  /**
   * Assert we're on the shops page
   */
  async expectShopsPage(): Promise<void> {
    const selector = await this.getAddShopButtonSelector();
    await expect(selector, this.elementAdapter, this.pageAdapter).toBeVisible();
  }

  /**
   * Assert a specific shop is visible
   * @param shopId - Shop ID
   */
  async expectShopVisible(shopId: string): Promise<void> {
    const selector = this.getShopCardById(shopId);
    await expect(selector, this.elementAdapter).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert empty state is shown
   */
  async expectEmptyState(): Promise<void> {
    const emptyStateSelectors = [
      { text: /no stores/i },
      { text: /no shops/i },
      { text: /connect your first/i },
      { text: /get started/i },
    ];

    for (const selector of emptyStateSelectors) {
      if (await this.isVisible(selector, 2000)) {
        return; // Found empty state
      }
    }

    throw new Error('Empty state not found');
  }
}
