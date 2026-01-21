import type { ElementSelector } from './types.js';
import { SnapshotAdapter } from './snapshot.adapter.js';
import { MCP_CONFIG } from '../mcp.config.js';

/**
 * Adapter for element interactions via Chrome DevTools MCP
 *
 * Handles:
 * - Finding elements by selector
 * - Interacting with elements (click, fill, etc.)
 * - Smart snapshot refresh after state changes
 */
export class ElementAdapter {
  private needsRefresh = false;

  constructor(
    private pageId: number,
    private snapshotAdapter: SnapshotAdapter
  ) {}

  /**
   * Click an element
   * @param selector - Element selector
   * @param options - Click options
   */
  async click(selector: ElementSelector, options: { dblClick?: boolean } = {}): Promise<void> {
    try {
      const uid = await this.findElementUID(selector);

      // @ts-ignore - MCP tools are provided globally
      await mcp__chrome_devtools__click({ uid, dblClick: options.dblClick });

      this.markDirty();
    } catch (error) {
      throw new Error(
        `Failed to click element: ${JSON.stringify(selector)}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fill an input element with text
   * @param selector - Element selector
   * @param value - Text to fill
   */
  async fill(selector: ElementSelector, value: string): Promise<void> {
    try {
      const uid = await this.findElementUID(selector);

      // @ts-ignore - MCP tools are provided globally
      await mcp__chrome_devtools__fill({ uid, value });

      this.markDirty();
    } catch (error) {
      throw new Error(
        `Failed to fill element: ${JSON.stringify(selector)}\n` +
        `Value: "${value}"\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fill multiple form elements at once
   * @param fields - Array of {selector, value} pairs
   */
  async fillForm(fields: Array<{ selector: ElementSelector; value: string }>): Promise<void> {
    // Find all UIDs first
    const elements = await Promise.all(
      fields.map(async ({ selector, value }) => ({
        uid: await this.findElementUID(selector),
        value,
      }))
    );

    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__fill_form({ elements });

    this.markDirty();
  }

  /**
   * Get text content of an element
   * @param selector - Element selector
   * @returns Text content or null if not found
   */
  async getText(selector: ElementSelector): Promise<string | null> {
    try {
      const snapshot = await this.getSnapshot();
      const uid = this.snapshotAdapter.findElement(snapshot, selector);

      if (!uid) return null;

      // Find element in snapshot and return its text
      const element = this.findElementInSnapshot(snapshot, uid);
      return element?.text || element?.name || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an element is visible (exists in snapshot)
   * @param selector - Element selector
   * @returns True if element is visible
   */
  async isVisible(selector: ElementSelector): Promise<boolean> {
    try {
      const snapshot = await this.getSnapshot();
      const uid = this.snapshotAdapter.findElement(snapshot, selector);
      return uid !== null;
    } catch {
      return false;
    }
  }

  /**
   * Wait for an element to appear
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async waitForElement(selector: ElementSelector, timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.isVisible(selector)) {
        return;
      }
      await this.sleep(100);
    }

    throw new Error(
      `Element not found after ${timeout}ms: ${JSON.stringify(selector)}`
    );
  }

  /**
   * Hover over an element
   * @param selector - Element selector
   */
  async hover(selector: ElementSelector): Promise<void> {
    const uid = await this.findElementUID(selector);
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__hover({ uid });
  }

  /**
   * Press a key or key combination
   * @param key - Key to press (e.g., "Enter", "Control+A")
   */
  async pressKey(key: string): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__press_key({ key });
    this.markDirty();
  }

  /**
   * Wait for text to appear on the page
   * @param text - Text to wait for
   * @param timeout - Timeout in milliseconds
   */
  async waitForText(text: string, timeout = 5000): Promise<void> {
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__wait_for({ text, timeout });
  }

  /**
   * Upload a file
   * @param selector - File input selector
   * @param filePath - Path to file to upload
   */
  async uploadFile(selector: ElementSelector, filePath: string): Promise<void> {
    const uid = await this.findElementUID(selector);
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__upload_file({ uid, filePath });
    this.markDirty();
  }

  /**
   * Drag one element onto another
   * @param fromSelector - Element to drag
   * @param toSelector - Element to drop onto
   */
  async drag(fromSelector: ElementSelector, toSelector: ElementSelector): Promise<void> {
    const fromUid = await this.findElementUID(fromSelector);
    const toUid = await this.findElementUID(toSelector);
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__drag({ from_uid: fromUid, to_uid: toUid });
    this.markDirty();
  }

  /**
   * Find element UID from selector
   * @private
   */
  private async findElementUID(selector: ElementSelector): Promise<string> {
    const snapshot = await this.getSnapshot();
    const uid = this.snapshotAdapter.findElement(snapshot, selector);

    if (!uid) {
      throw new Error(
        `Element not found: ${JSON.stringify(selector, null, 2)}\n` +
        `Available elements:\n${this.snapshotAdapter.debugSnapshot(snapshot)}`
      );
    }

    return uid;
  }

  /**
   * Get snapshot (from cache or fresh)
   * @private
   */
  private async getSnapshot() {
    if (this.needsRefresh || !this.snapshotAdapter.hasCache(this.pageId)) {
      this.needsRefresh = false;
      return await this.snapshotAdapter.takeSnapshot(this.pageId, true);
    }
    return this.snapshotAdapter.getCache(this.pageId);
  }

  /**
   * Mark snapshot as dirty (needs refresh)
   * @private
   */
  private markDirty(): void {
    this.needsRefresh = true;
    this.snapshotAdapter.markDirty(this.pageId);
  }

  /**
   * Find an element in snapshot by UID
   * @private
   */
  private findElementInSnapshot(snapshot: any, uid: string): any {
    if (snapshot.uid === uid) return snapshot;

    if (snapshot.children) {
      for (const child of snapshot.children) {
        const found = this.findElementInSnapshot(child, uid);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
