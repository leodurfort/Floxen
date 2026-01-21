import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Shops list page object
 * Handles shop listing, connection initiation, and shop management
 */
export class ShopsPage extends BasePage {
  // Shop list
  readonly shopsList: Locator;
  readonly shopCards: Locator;
  readonly emptyState: Locator;

  // Add shop
  readonly addShopButton: Locator;
  readonly connectWooCommerceButton: Locator;

  // Connection modal
  readonly connectionModal: Locator;
  readonly storeUrlInput: Locator;
  readonly connectButton: Locator;
  readonly cancelButton: Locator;

  // Shop card elements
  readonly shopName: Locator;
  readonly shopStatus: Locator;
  readonly shopSyncButton: Locator;
  readonly shopSettingsButton: Locator;
  readonly shopProductCount: Locator;

  // Filters and search
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    super(page);

    // Shop list
    this.shopsList = page.locator(
      '[data-testid="shops-list"], ' + '.shops-list, ' + '.shop-grid'
    );
    this.shopCards = page.locator(
      '[data-testid="shop-card"], ' + '.shop-card, ' + '.shop-item'
    );
    this.emptyState = page.locator(
      '[data-testid="empty-shops"], ' +
        '.empty-state, ' +
        'text=No shops connected'
    );

    // Add shop
    this.addShopButton = page.locator(
      '[data-testid="add-shop"], ' +
        'button:has-text("Add Shop"), ' +
        'button:has-text("Connect Shop"), ' +
        'button:has-text("Add Store"), ' +
        'button:has-text("Connect new store")'
    );
    this.connectWooCommerceButton = page.locator(
      '[data-testid="connect-woocommerce"], ' +
        'button:has-text("WooCommerce"), ' +
        '[data-platform="woocommerce"]'
    );

    // Connection modal
    this.connectionModal = page.locator(
      '[data-testid="connection-modal"], ' +
        '[role="dialog"], ' +
        '.modal'
    );
    this.storeUrlInput = page.locator(
      'input[name="storeUrl"], ' +
        'input[placeholder*="store" i], ' +
        'input[type="url"], ' +
        '[data-testid="store-url-input"]'
    );
    this.connectButton = page.locator(
      '[data-testid="connect-button"], ' +
        'button[type="submit"]:has-text("Connect"), ' +
        'button:has-text("Continue")'
    );
    this.cancelButton = page.locator(
      '[data-testid="cancel-button"], ' +
        'button:has-text("Cancel"), ' +
        'button[aria-label="Close"]'
    );

    // Shop card elements (use methods to select specific shop)
    this.shopName = page.locator('.shop-name, [data-testid="shop-name"]');
    this.shopStatus = page.locator('.shop-status, [data-testid="shop-status"]');
    this.shopSyncButton = page.locator(
      'button:has-text("Sync"), ' + '[data-testid="sync-button"]'
    );
    this.shopSettingsButton = page.locator(
      'button:has-text("Settings"), ' +
        '[data-testid="shop-settings"], ' +
        '[aria-label*="settings" i]'
    );
    this.shopProductCount = page.locator(
      '.product-count, ' + '[data-testid="product-count"]'
    );

    // Filters
    this.searchInput = page.locator(
      'input[placeholder*="search" i], ' + '[data-testid="search-shops"]'
    );
    this.statusFilter = page.locator(
      'select[name="status"], ' + '[data-testid="status-filter"]'
    );
  }

  /**
   * Navigate to shops page
   */
  async goto(): Promise<void> {
    await super.goto('/shops');
    await this.waitForLoad();
  }

  /**
   * Get number of connected shops
   */
  async getShopCount(): Promise<number> {
    await this.waitForLoadingComplete();
    return await this.shopCards.count();
  }

  /**
   * Check if any shops are connected
   */
  async hasShops(): Promise<boolean> {
    return (await this.getShopCount()) > 0;
  }

  /**
   * Click add shop button to open connection modal
   */
  async clickAddShop(): Promise<void> {
    await this.addShopButton.first().click();
    await expect(this.connectionModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Start WooCommerce connection flow
   */
  async startWooCommerceConnection(storeUrl: string): Promise<void> {
    await this.clickAddShop();

    // If there's a platform selection, click WooCommerce
    if (await this.connectWooCommerceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.connectWooCommerceButton.click();
    }

    // Enter store URL
    await expect(this.storeUrlInput).toBeVisible({ timeout: 5000 });
    await this.fillField(this.storeUrlInput, storeUrl);
    await this.connectButton.click();
  }

  /**
   * Get shop card by index
   */
  getShopCardByIndex(index: number): Locator {
    return this.shopCards.nth(index);
  }

  /**
   * Get shop card by name
   */
  getShopCardByName(name: string): Locator {
    return this.page.locator(
      `[data-testid="shop-card"]:has-text("${name}"), ` +
        `.shop-card:has-text("${name}")`
    );
  }

  /**
   * Get shop card by ID
   */
  getShopCardById(shopId: string): Locator {
    return this.page.locator(
      `[data-shop-id="${shopId}"], ` + `[href*="${shopId}"]`
    );
  }

  /**
   * Click on a shop to view details/products
   */
  async openShop(shopId: string): Promise<void> {
    const shopCard = this.getShopCardById(shopId);
    await shopCard.click();
    await this.page.waitForURL(/.*shop.*|.*products.*/);
  }

  /**
   * Trigger sync for a specific shop
   */
  async syncShop(shopId: string): Promise<void> {
    const shopCard = this.getShopCardById(shopId);
    const syncButton = shopCard.locator('button:has-text("Sync"), [data-testid="sync-button"]');
    await syncButton.click();
  }

  /**
   * Open shop settings
   */
  async openShopSettings(shopId: string): Promise<void> {
    const shopCard = this.getShopCardById(shopId);
    const settingsButton = shopCard.locator(
      'button:has-text("Settings"), [data-testid="shop-settings"]'
    );
    await settingsButton.click();
  }

  /**
   * Search for shops
   */
  async searchShops(query: string): Promise<void> {
    await this.fillField(this.searchInput, query);
  }

  /**
   * Filter shops by status
   */
  async filterByStatus(status: 'all' | 'active' | 'syncing' | 'error'): Promise<void> {
    await this.statusFilter.selectOption(status);
  }

  /**
   * Close connection modal
   */
  async closeConnectionModal(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.connectionModal).toBeHidden();
  }

  /**
   * Verify on shops page
   */
  async expectShopsPage(): Promise<void> {
    await expect(this.addShopButton.first()).toBeVisible();
  }

  /**
   * Verify shop is visible
   */
  async expectShopVisible(shopId: string): Promise<void> {
    const shopCard = this.getShopCardById(shopId);
    await expect(shopCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify empty state
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Get shop status text
   */
  async getShopStatus(shopId: string): Promise<string | null> {
    const shopCard = this.getShopCardById(shopId);
    const status = shopCard.locator('.shop-status, [data-testid="shop-status"]');
    try {
      return await status.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get shop product count
   */
  async getShopProductCount(shopId: string): Promise<number> {
    const shopCard = this.getShopCardById(shopId);
    const countElement = shopCard.locator('.product-count, [data-testid="product-count"]');
    const text = await countElement.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}
