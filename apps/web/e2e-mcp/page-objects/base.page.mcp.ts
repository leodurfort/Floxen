import { PageAdapter } from '../adapters/browser.adapter.js';
import { ElementAdapter } from '../adapters/element.adapter.js';
import { SnapshotAdapter } from '../adapters/snapshot.adapter.js';
import { expect } from '../adapters/assertion.adapter.js';
import type { ElementSelector } from '../adapters/types.js';
import { MCP_CONFIG } from '../mcp.config.js';

/**
 * Base page object for all MCP-based page objects
 *
 * Provides common functionality:
 * - Navigation and page loading
 * - Element visibility checking
 * - localStorage operations
 * - Authentication helpers
 * - Toast/error message handling
 * - Screenshots and URL helpers
 */
export class BasePageMCP {
  protected pageAdapter: PageAdapter;
  protected elementAdapter: ElementAdapter;
  protected snapshotAdapter: SnapshotAdapter;

  // Storage keys (same as original)
  static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'floxen.access',
    REFRESH_TOKEN: 'floxen.refresh',
    USER: 'floxen.user',
  } as const;

  constructor(pageAdapter: PageAdapter) {
    this.pageAdapter = pageAdapter;
    this.snapshotAdapter = new SnapshotAdapter();
    this.elementAdapter = new ElementAdapter(pageAdapter.pageId, this.snapshotAdapter);

    // FIX BUG-001: Register navigation callback to auto-invalidate snapshot cache
    // When navigation occurs (navigate, reload, back, forward), mark snapshot as dirty
    this.pageAdapter.onNavigation(() => {
      this.snapshotAdapter.markDirty(pageAdapter.pageId);
    });
  }

  // ========== Navigation ==========

  /**
   * Navigate to a path
   * @param path - Path to navigate to (will be prefixed with baseURL)
   */
  async goto(path: string): Promise<void> {
    const url = `${MCP_CONFIG.baseURL}${path}`;
    await this.pageAdapter.navigate(url);
    await this.waitForLoad();
  }

  /**
   * Wait for page to finish loading
   */
  async waitForLoad(): Promise<void> {
    // Wait for network to be idle (no requests in last 500ms)
    await this.waitForNetworkIdle();
    // Also wait for any loading spinners to disappear
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for network to be idle
   * @param timeout - Maximum time to wait
   * @private
   */
  private async waitForNetworkIdle(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    let lastRequestTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // @ts-ignore - MCP tools are provided globally
      const requests = await mcp__chrome_devtools__list_network_requests({
        pageIdx: 0,
        pageSize: 10
      });

      if (requests && requests.length > 0) {
        lastRequestTime = Date.now();
      }

      // Network idle if no requests for 500ms
      if (Date.now() - lastRequestTime >= 500) {
        return;
      }

      await this.sleep(100);
    }

    throw new Error(`Network did not become idle within ${timeout}ms`);
  }

  /**
   * Refresh the current page
   */
  async refresh(): Promise<void> {
    await this.pageAdapter.reload();
    await this.waitForLoad();
  }

  // ========== Element Visibility ==========

  /**
   * Check if an element is visible
   * @param selector - Element selector
   * @param timeout - Maximum time to wait
   * @returns True if visible, false otherwise
   */
  async isVisible(selector: ElementSelector, timeout = 5000): Promise<boolean> {
    try {
      await expect(selector, this.elementAdapter, this.pageAdapter).toBeVisible({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    const spinnerSelectors = [
      { role: 'status', text: /loading/i },
      { role: 'status', text: /spinner/i },
      { text: /loading/i },
    ];

    // Try each spinner selector
    for (const selector of spinnerSelectors) {
      if (await this.isVisible(selector, 1000)) {
        await expect(selector, this.elementAdapter).toBeHidden({ timeout: 30000 });
        return;
      }
    }
  }

  // ========== Toast Messages ==========

  /**
   * Get toast/alert message
   * @returns Toast message text or null
   */
  async getToastMessage(): Promise<string | null> {
    try {
      const toastSelector: ElementSelector = { role: 'alert' };
      await expect(toastSelector, this.elementAdapter).toBeVisible({ timeout: 5000 });
      return await this.elementAdapter.getText(toastSelector);
    } catch {
      return null;
    }
  }

  /**
   * Assert toast message is visible with specific text
   * @param text - Expected toast text
   */
  async expectToast(text: string | RegExp): Promise<void> {
    const toastSelector: ElementSelector = { role: 'alert' };
    await expect(toastSelector, this.elementAdapter).toBeVisible({ timeout: 5000 });
    await expect(toastSelector, this.elementAdapter).toContainText(text);
  }

  /**
   * Get error message from page
   * @returns Error message or null
   */
  async getErrorMessage(): Promise<string | null> {
    const errorSelectors = [
      { role: 'alert', text: /error/i },
      { text: /error/i },
      { text: /failed/i },
    ];

    for (const selector of errorSelectors) {
      if (await this.isVisible(selector, 1000)) {
        return await this.elementAdapter.getText(selector);
      }
    }

    return null;
  }

  // ========== localStorage Operations ==========

  /**
   * Get item from localStorage
   * @param key - localStorage key
   * @returns Value or null
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__evaluate_script({
      function: `(key) => localStorage.getItem(key)`,
      args: [{ uid: 'key-param' }] // Pass key as parameter
    });
    return result as string | null;
  }

  /**
   * Set item in localStorage
   * @param key - localStorage key
   * @param value - Value to set
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(key, value) => localStorage.setItem(key, value)`
    });
  }

  /**
   * Clear all localStorage
   */
  async clearLocalStorage(): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `() => localStorage.clear()`
    });
  }

  // ========== Authentication Helpers ==========

  /**
   * Check if user is authenticated
   * @returns True if access token exists
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getLocalStorageItem(BasePageMCP.STORAGE_KEYS.ACCESS_TOKEN);
    return !!accessToken;
  }

  /**
   * Get access token from localStorage
   */
  async getAccessToken(): Promise<string | null> {
    return await this.getLocalStorageItem(BasePageMCP.STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token from localStorage
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.getLocalStorageItem(BasePageMCP.STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get current user from localStorage
   */
  async getCurrentUser(): Promise<any> {
    const userJson = await this.getLocalStorageItem(BasePageMCP.STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Set authentication tokens in localStorage
   * @param accessToken - Access token
   * @param refreshToken - Refresh token
   */
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setLocalStorageItem(BasePageMCP.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await this.setLocalStorageItem(BasePageMCP.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * Clear all auth tokens
   */
  async clearAuthTokens(): Promise<void> {
    await this.clearLocalStorage();
  }

  // ========== Screenshots ==========

  /**
   * Take a screenshot
   * @param name - Screenshot name
   */
  async screenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${MCP_CONFIG.screenshots.path}/${name}-${timestamp}.png`;
    await this.pageAdapter.screenshot(filePath);
  }

  // ========== URL Helpers ==========

  /**
   * Get current page URL
   * @returns Current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.pageAdapter.getURL();
  }

  /**
   * Assert current URL matches pattern
   * @param pattern - URL pattern (string or regex)
   */
  async expectUrl(pattern: string | RegExp): Promise<void> {
    const url = await this.getCurrentUrl();
    const matches = typeof pattern === 'string'
      ? url.includes(pattern)
      : pattern.test(url);

    if (!matches) {
      throw new Error(`URL "${url}" does not match pattern "${pattern}"`);
    }
  }

  // ========== Utilities ==========

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to wait
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Click and wait for navigation
   * @param selector - Element to click
   */
  async clickAndNavigate(selector: ElementSelector): Promise<void> {
    await this.elementAdapter.click(selector);
    await this.waitForLoad();
  }

  /**
   * Fill a field (with clear first)
   * @param selector - Field selector
   * @param value - Value to fill
   */
  async fillField(selector: ElementSelector, value: string): Promise<void> {
    await this.elementAdapter.fill(selector, value);
  }
}
