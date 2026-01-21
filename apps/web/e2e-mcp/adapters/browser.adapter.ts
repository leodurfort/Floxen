import type { PageInfo } from './types.js';
import { MCP_CONFIG } from '../mcp.config.js';

/**
 * Adapter for browser and page management via Chrome DevTools MCP
 */
export class BrowserAdapter {
  private currentPageId: number | null = null;

  /**
   * Create a new page and navigate to URL
   * @param url - URL to navigate to
   * @returns PageAdapter for the new page
   */
  async createPage(url: string): Promise<PageAdapter> {
    // Note: Chrome DevTools MCP doesn't have a direct "create page" method
    // Instead, we use new_page which creates and navigates
    const page = await PageAdapter.create(url);
    this.currentPageId = page.pageId;
    return page;
  }

  /**
   * List all open pages
   * @returns Array of page information
   */
  async listPages(): Promise<PageInfo[]> {
    // @ts-ignore - MCP tools are provided globally
    const pages = await mcp__chrome_devtools__list_pages();
    return pages.map((p: any, index: number) => ({
      pageId: index,
      url: p.url || '',
      title: p.title || '',
    }));
  }

  /**
   * Close a specific page
   * @param pageId - ID of page to close
   */
  async closePage(pageId: number): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__close_page({ pageId });
    if (this.currentPageId === pageId) {
      this.currentPageId = null;
    }
  }

  /**
   * Select a page to make it active
   * @param pageId - ID of page to select
   * @param bringToFront - Whether to focus the page
   */
  async selectPage(pageId: number, bringToFront = false): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__select_page({ pageId, bringToFront });
    this.currentPageId = pageId;
  }

  /**
   * Get the currently active page ID
   */
  getCurrentPageId(): number | null {
    return this.currentPageId;
  }
}

/**
 * Adapter for individual page operations
 */
export class PageAdapter {
  private navigationCallbacks: Array<() => void> = [];

  constructor(public readonly pageId: number) {}

  /**
   * Create a new page
   * @param url - URL to navigate to
   * @returns PageAdapter instance
   */
  static async create(url: string): Promise<PageAdapter> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__new_page({
      url,
      timeout: MCP_CONFIG.browser.navigationTimeout
    });

    // Get list of pages to find the newly created page ID
    // @ts-ignore
    const pages = await mcp__chrome_devtools__list_pages();
    const pageId = pages.length - 1; // Last page is the newly created one

    return new PageAdapter(pageId);
  }

  /**
   * Register a callback to be called on navigation events
   * @param callback - Function to call on navigation
   */
  onNavigation(callback: () => void): void {
    this.navigationCallbacks.push(callback);
  }

  /**
   * Trigger navigation callbacks
   * @private
   */
  private triggerNavigationCallbacks(): void {
    this.navigationCallbacks.forEach(cb => cb());
  }

  /**
   * Navigate to a URL
   * @param url - URL to navigate to
   * @param options - Navigation options
   */
  async navigate(url: string, options: { ignoreCache?: boolean; timeout?: number } = {}): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__navigate_page({
      type: 'url',
      url,
      ignoreCache: options.ignoreCache,
      timeout: options.timeout || MCP_CONFIG.browser.navigationTimeout
    });

    // FIX BUG-001: Trigger callbacks to invalidate snapshot cache
    this.triggerNavigationCallbacks();
  }

  /**
   * Reload the current page
   * @param ignoreCache - Whether to ignore cache
   */
  async reload(ignoreCache = false): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__navigate_page({
      type: 'reload',
      ignoreCache
    });

    // FIX BUG-001: Trigger callbacks to invalidate snapshot cache
    this.triggerNavigationCallbacks();
  }

  /**
   * Go back in navigation history
   */
  async goBack(): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__navigate_page({ type: 'back' });

    // FIX BUG-001: Trigger callbacks to invalidate snapshot cache
    this.triggerNavigationCallbacks();
  }

  /**
   * Go forward in navigation history
   */
  async goForward(): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__navigate_page({ type: 'forward' });

    // FIX BUG-001: Trigger callbacks to invalidate snapshot cache
    this.triggerNavigationCallbacks();
  }

  /**
   * Get the current page URL
   * @returns Current URL
   */
  async getURL(): Promise<string> {
    // @ts-ignore - MCP tools are provided globally
    const pages = await mcp__chrome_devtools__list_pages();
    return pages[this.pageId]?.url || '';
  }

  /**
   * Close this page
   */
  async close(): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__close_page({ pageId: this.pageId });
  }

  /**
   * Wait for specified time
   * @param ms - Milliseconds to wait
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resize the page viewport
   * @param width - Width in pixels
   * @param height - Height in pixels
   */
  async resize(width: number, height: number): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__resize_page({ width, height });
  }

  /**
   * Take a screenshot
   * @param filePath - Path to save screenshot
   * @param options - Screenshot options
   */
  async screenshot(filePath: string, options: { format?: 'png' | 'jpeg' | 'webp'; quality?: number } = {}): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__take_screenshot({
      filePath,
      format: options.format || 'png',
      quality: options.quality
    });
  }
}
