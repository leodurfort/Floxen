import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object with common methods shared across all pages
 */
export class BasePage {
  readonly page: Page;

  // Common selectors
  readonly loadingSpinner: Locator;
  readonly toastMessage: Locator;
  readonly errorMessage: Locator;

  // localStorage keys (from apps/web/src/store/auth.ts)
  static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'floxen.access',
    REFRESH_TOKEN: 'floxen.refresh',
    USER: 'floxen.user',
  } as const;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');
    this.toastMessage = page.locator('[role="alert"], .toast, [data-testid="toast"]');
    this.errorMessage = page.locator('[data-testid="error"], .error-message, [role="alert"]');
  }

  /**
   * Navigate to a path relative to the base URL
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for page to finish loading
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string | RegExp): Promise<void> {
    if (url) {
      await this.page.waitForURL(url);
    }
    await this.waitForLoad();
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
      await expect(locator).toBeVisible({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    const spinner = this.loadingSpinner;
    if (await this.isVisible(spinner, 1000)) {
      await expect(spinner).toBeHidden({ timeout: 30000 });
    }
  }

  /**
   * Get toast message text
   */
  async getToastMessage(): Promise<string | null> {
    try {
      await expect(this.toastMessage.first()).toBeVisible({ timeout: 5000 });
      return await this.toastMessage.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Wait for toast message to appear with specific text
   */
  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.toastMessage.first()).toBeVisible({ timeout: 5000 });
    await expect(this.toastMessage.first()).toContainText(text);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await expect(this.errorMessage.first()).toBeVisible({ timeout: 5000 });
      return await this.errorMessage.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated (has tokens in localStorage)
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getLocalStorageItem(BasePage.STORAGE_KEYS.ACCESS_TOKEN);
    return !!accessToken;
  }

  /**
   * Get item from localStorage
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set item in localStorage
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  /**
   * Remove item from localStorage
   */
  async removeLocalStorageItem(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }

  /**
   * Clear all localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get current user from localStorage
   */
  async getCurrentUser(): Promise<Record<string, unknown> | null> {
    const userJson = await this.getLocalStorageItem(BasePage.STORAGE_KEYS.USER);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  /**
   * Get access token from localStorage
   */
  async getAccessToken(): Promise<string | null> {
    return await this.getLocalStorageItem(BasePage.STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token from localStorage
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.getLocalStorageItem(BasePage.STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set auth tokens in localStorage
   */
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setLocalStorageItem(BasePage.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await this.setLocalStorageItem(BasePage.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * Clear auth tokens from localStorage
   */
  async clearAuthTokens(): Promise<void> {
    await this.removeLocalStorageItem(BasePage.STORAGE_KEYS.ACCESS_TOKEN);
    await this.removeLocalStorageItem(BasePage.STORAGE_KEYS.REFRESH_TOKEN);
    await this.removeLocalStorageItem(BasePage.STORAGE_KEYS.USER);
  }

  /**
   * Take a screenshot with timestamp
   */
  async screenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Click element and wait for navigation
   */
  async clickAndNavigate(locator: Locator, expectedUrl?: string | RegExp): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation(),
      locator.click(),
    ]);
    if (expectedUrl) {
      await this.page.waitForURL(expectedUrl);
    }
  }

  /**
   * Fill form field with validation
   */
  async fillField(locator: Locator, value: string): Promise<void> {
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if current URL matches pattern
   */
  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /**
   * Refresh the page
   */
  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }
}
