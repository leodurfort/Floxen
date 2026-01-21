import { PageAdapter } from '../../adapters/browser.adapter.js';
import { SnapshotAdapter } from '../../adapters/snapshot.adapter.js';
import { ElementAdapter } from '../../adapters/element.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Sidebar component (MCP version)
 *
 * Handles:
 * - Navigation through main sidebar
 * - User info display
 * - Mobile menu toggle
 * - Active link detection
 */
export class SidebarComponentMCP {
  protected pageAdapter: PageAdapter;
  protected snapshotAdapter: SnapshotAdapter;
  protected elementAdapter: ElementAdapter;

  constructor(pageAdapter: PageAdapter) {
    this.pageAdapter = pageAdapter;
    this.snapshotAdapter = new SnapshotAdapter();
    this.elementAdapter = new ElementAdapter(pageAdapter, this.snapshotAdapter);
  }

  // ========== Navigation Link Selectors ==========

  /**
   * Get dashboard link selector with text fallbacks
   */
  private async getDashboardLinkSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = ['Dashboard', /dashboard/i];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'link',
        text,
      });

      if (uid) {
        return { role: 'link', text };
      }
    }

    throw new Error('Dashboard link not found');
  }

  /**
   * Get shops link selector with text fallbacks
   */
  private async getShopsLinkSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = ['Shops', 'My Shops', 'Stores', /shops?/i];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'link',
        text,
      });

      if (uid) {
        return { role: 'link', text };
      }
    }

    throw new Error('Shops link not found');
  }

  /**
   * Get analytics link selector with text fallbacks
   */
  private async getAnalyticsLinkSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = ['Analytics', 'Reports', 'Statistics', /analytics/i];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'link',
        text,
      });

      if (uid) {
        return { role: 'link', text };
      }
    }

    throw new Error('Analytics link not found');
  }

  /**
   * Get settings link selector with text fallbacks
   */
  private async getSettingsLinkSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = ['Settings', 'Preferences', 'Configuration', /settings/i];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'link',
        text,
      });

      if (uid) {
        return { role: 'link', text };
      }
    }

    throw new Error('Settings link not found');
  }

  /**
   * Get logout button selector with text fallbacks
   */
  private async getLogoutButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Logout',
      'Log out',
      'Sign out',
      'Logoff',
      /log\s*out|sign\s*out/i,
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

    throw new Error('Logout button not found');
  }

  // ========== Other Element Selectors ==========

  /**
   * Get mobile menu toggle selector
   */
  private getMenuToggleSelector(): ElementSelector {
    return {
      role: 'button',
      name: /menu|toggle/i,
    };
  }

  /**
   * Get user email selector
   */
  private getUserEmailSelector(): ElementSelector {
    return {
      text: /@/,
    };
  }

  /**
   * Get user name selector
   */
  private getUserNameSelector(): ElementSelector {
    return {
      role: 'heading',
      name: /user|name/i,
    };
  }

  // ========== Helper Methods ==========

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for URL to match pattern
   */
  private async expectUrl(pattern: RegExp, timeout = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const url = await this.getCurrentUrl();
      if (pattern.test(url)) {
        return;
      }
      await this.sleep(100);
    }

    const currentUrl = await this.getCurrentUrl();
    throw new Error(`URL did not match ${pattern} after ${timeout}ms. Current URL: ${currentUrl}`);
  }

  /**
   * Get current URL
   */
  private async getCurrentUrl(): Promise<string> {
    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__evaluate_script({
      function: `() => window.location.href`,
    });
    return result as string;
  }

  /**
   * Check if element is visible
   */
  private async isElementVisible(
    selector: ElementSelector,
    timeout = 3000
  ): Promise<boolean> {
    return await this.elementAdapter.isVisible(selector, timeout);
  }

  // ========== Navigation Actions ==========

  /**
   * Navigate to Dashboard
   */
  async gotoDashboard(): Promise<void> {
    const dashboardLink = await this.getDashboardLinkSelector();
    await this.elementAdapter.click(dashboardLink);
    await this.expectUrl(/dashboard/);
  }

  /**
   * Navigate to Shops page
   */
  async gotoShops(): Promise<void> {
    const shopsLink = await this.getShopsLinkSelector();
    await this.elementAdapter.click(shopsLink);
    await this.expectUrl(/shops/);
  }

  /**
   * Navigate to Analytics page
   */
  async gotoAnalytics(): Promise<void> {
    const analyticsLink = await this.getAnalyticsLinkSelector();
    await this.elementAdapter.click(analyticsLink);
    await this.expectUrl(/analytics/);
  }

  /**
   * Navigate to Settings page
   */
  async gotoSettings(): Promise<void> {
    const settingsLink = await this.getSettingsLinkSelector();
    await this.elementAdapter.click(settingsLink);
    await this.expectUrl(/settings/);
  }

  /**
   * Logout the user
   */
  async logout_click(): Promise<void> {
    const logoutButton = await this.getLogoutButtonSelector();
    await this.elementAdapter.click(logoutButton);

    // Wait for redirect to login page or home
    await this.expectUrl(/login|^\/$|^\/$/);
  }

  // ========== Visibility Checks ==========

  /**
   * Check if sidebar is visible
   * @returns True if sidebar navigation is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      const shopsLink = await this.getShopsLinkSelector();
      return await this.isElementVisible(shopsLink, 3000);
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
      await this.elementAdapter.click(this.getMenuToggleSelector());
      await this.sleep(500);

      // Wait for shops link to appear
      const shopsLink = await this.getShopsLinkSelector();
      await this.elementAdapter.waitForElement(shopsLink, 5000);
    }
  }

  // ========== User Info ==========

  /**
   * Get displayed user email
   * @returns User email or null
   */
  async getUserEmail(): Promise<string | null> {
    try {
      const emailVisible = await this.isElementVisible(this.getUserEmailSelector(), 3000);
      if (!emailVisible) return null;

      return await this.elementAdapter.getText(this.getUserEmailSelector());
    } catch {
      return null;
    }
  }

  /**
   * Get displayed user name
   * @returns User name or null
   */
  async getUserName(): Promise<string | null> {
    try {
      const nameVisible = await this.isElementVisible(this.getUserNameSelector(), 3000);
      if (!nameVisible) return null;

      return await this.elementAdapter.getText(this.getUserNameSelector());
    } catch {
      return null;
    }
  }

  // ========== Active Link Detection ==========

  /**
   * Verify current page is active in sidebar
   * @param linkName - Name of the link to check (dashboard, shops, analytics, settings)
   */
  async expectActiveLink(
    linkName: 'dashboard' | 'shops' | 'analytics' | 'settings'
  ): Promise<void> {
    let linkSelector: ElementSelector;

    switch (linkName) {
      case 'dashboard':
        linkSelector = await this.getDashboardLinkSelector();
        break;
      case 'shops':
        linkSelector = await this.getShopsLinkSelector();
        break;
      case 'analytics':
        linkSelector = await this.getAnalyticsLinkSelector();
        break;
      case 'settings':
        linkSelector = await this.getSettingsLinkSelector();
        break;
    }

    // Check if link has aria-current="page" or active class
    // @ts-ignore - MCP tools are provided globally
    const isActive = await mcp__chrome_devtools__evaluate_script({
      function: `(linkText) => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(l => {
          const text = l.textContent?.toLowerCase() || '';
          const searchText = typeof linkText === 'string' ? linkText.toLowerCase() : '';
          return text.includes(searchText);
        });

        if (!link) return false;

        // Check aria-current
        if (link.getAttribute('aria-current') === 'page') return true;

        // Check for active/current class
        const classList = link.className.toLowerCase();
        return classList.includes('active') || classList.includes('current');
      }`,
    });

    if (!isActive) {
      throw new Error(`Link "${linkName}" is not marked as active in sidebar`);
    }
  }
}
