import { Page, Locator, expect } from '@playwright/test';

/**
 * Sidebar component page object
 * Handles navigation through the main sidebar
 */
export class SidebarComponent {
  readonly page: Page;

  // Navigation links
  readonly dashboard: Locator;
  readonly shops: Locator;
  readonly analytics: Locator;
  readonly settings: Locator;
  readonly logout: Locator;

  // User info
  readonly userEmail: Locator;
  readonly userName: Locator;

  // Mobile menu toggle
  readonly menuToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation links - using data-testid or common patterns
    this.dashboard = page.locator(
      '[data-testid="nav-dashboard"], ' +
        'a[href="/dashboard"], ' +
        'nav a:has-text("Dashboard")'
    );
    this.shops = page.locator(
      '[data-testid="nav-shops"], ' +
        'a[href="/shops"], ' +
        'nav a:has-text("Shops"), ' +
        'nav a:has-text("My Shops")'
    );
    this.analytics = page.locator(
      '[data-testid="nav-analytics"], ' +
        'a[href="/analytics"], ' +
        'nav a:has-text("Analytics")'
    );
    this.settings = page.locator(
      '[data-testid="nav-settings"], ' +
        'a[href="/settings"], ' +
        'nav a:has-text("Settings")'
    );
    this.logout = page.locator(
      '[data-testid="logout"], ' +
        'button:has-text("Logout"), ' +
        'button:has-text("Log out"), ' +
        'button:has-text("Sign out")'
    );

    // User info in sidebar
    this.userEmail = page.locator('[data-testid="user-email"], .user-email');
    this.userName = page.locator('[data-testid="user-name"], .user-name');

    // Mobile menu
    this.menuToggle = page.locator(
      '[data-testid="menu-toggle"], ' +
        'button[aria-label*="menu"], ' +
        '.hamburger-menu'
    );
  }

  /**
   * Navigate to Dashboard
   */
  async gotoDashboard(): Promise<void> {
    await this.dashboard.click();
    await this.page.waitForURL(/.*dashboard.*/);
  }

  /**
   * Navigate to Shops page
   */
  async gotoShops(): Promise<void> {
    await this.shops.click();
    await this.page.waitForURL(/.*shops.*/);
  }

  /**
   * Navigate to Analytics page
   */
  async gotoAnalytics(): Promise<void> {
    await this.analytics.click();
    await this.page.waitForURL(/.*analytics.*/);
  }

  /**
   * Navigate to Settings page
   */
  async gotoSettings(): Promise<void> {
    await this.settings.click();
    await this.page.waitForURL(/.*settings.*/);
  }

  /**
   * Logout the user
   */
  async logout_click(): Promise<void> {
    await this.logout.click();
    // Wait for redirect to login page
    await this.page.waitForURL(/.*login.*|.*\/$/);
  }

  /**
   * Check if sidebar is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      // Check if any nav link is visible
      await expect(this.shops.first()).toBeVisible({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open mobile menu if collapsed
   */
  async openMobileMenu(): Promise<void> {
    const isMenuVisible = await this.isVisible();
    if (!isMenuVisible) {
      await this.menuToggle.click();
      await expect(this.shops.first()).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Get displayed user email
   */
  async getUserEmail(): Promise<string | null> {
    try {
      await expect(this.userEmail).toBeVisible({ timeout: 3000 });
      return await this.userEmail.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get displayed user name
   */
  async getUserName(): Promise<string | null> {
    try {
      await expect(this.userName).toBeVisible({ timeout: 3000 });
      return await this.userName.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Verify current page is active in sidebar
   */
  async expectActiveLink(linkName: 'dashboard' | 'shops' | 'analytics' | 'settings'): Promise<void> {
    const linkMap = {
      dashboard: this.dashboard,
      shops: this.shops,
      analytics: this.analytics,
      settings: this.settings,
    };

    const link = linkMap[linkName];
    await expect(link.first()).toHaveAttribute('aria-current', 'page').catch(() => {
      // Fallback: check for active class
      return expect(link.first()).toHaveClass(/active|current/);
    });
  }
}
