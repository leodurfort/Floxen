import type { SnapshotElement, CachedSnapshot, ElementSelector } from './types.js';
import { MCP_CONFIG } from '../mcp.config.js';

/**
 * Adapter for managing page snapshots from Chrome DevTools MCP
 *
 * Handles:
 * - Taking and parsing a11y tree snapshots
 * - Smart caching with dirty tracking
 * - Element finding with flexible selectors
 */
export class SnapshotAdapter {
  private cache = new Map<number, CachedSnapshot>();

  /**
   * Take a snapshot of the page's a11y tree
   * @param pageId - Page ID to snapshot
   * @param force - Force refresh even if cache is valid
   * @returns Parsed snapshot element tree
   */
  async takeSnapshot(pageId: number, force = false): Promise<SnapshotElement> {
    const cached = this.cache.get(pageId);

    // Use cache if fresh and not dirty
    if (!force && cached && !cached.dirty) {
      const age = Date.now() - cached.timestamp;
      if (age < MCP_CONFIG.snapshot.cacheLifetime) {
        return cached.snapshot;
      }
    }

    // Take fresh snapshot via MCP
    const rawSnapshot = await this.takeSnapshotViaMCP();
    const snapshot = this.parseSnapshot(rawSnapshot);

    this.cache.set(pageId, {
      snapshot,
      timestamp: Date.now(),
      dirty: false,
    });

    return snapshot;
  }

  /**
   * Mark a page's snapshot as dirty (needs refresh)
   */
  markDirty(pageId: number): void {
    const cached = this.cache.get(pageId);
    if (cached) {
      cached.dirty = true;
    }
  }

  /**
   * Check if snapshot is cached
   */
  hasCache(pageId: number): boolean {
    return this.cache.has(pageId);
  }

  /**
   * Get cached snapshot (may be dirty)
   */
  getCache(pageId: number): SnapshotElement {
    const cached = this.cache.get(pageId);
    if (!cached) {
      throw new Error(`No cached snapshot for page ${pageId}`);
    }
    return cached.snapshot;
  }

  /**
   * Clear cache for a page
   */
  clearCache(pageId: number): void {
    this.cache.delete(pageId);
  }

  /**
   * Find first element matching selector
   * @param snapshot - Root snapshot element
   * @param selector - Element selector criteria
   * @returns UID of matching element, or null if not found
   */
  findElement(snapshot: SnapshotElement, selector: ElementSelector): string | null {
    // Breadth-first search through a11y tree
    const queue: SnapshotElement[] = [snapshot];

    while (queue.length > 0) {
      const node = queue.shift()!;

      if (this.matchesSelector(node, selector)) {
        return node.uid;
      }

      // Add children to queue
      if (node.children) {
        queue.push(...node.children);
      }
    }

    return null;
  }

  /**
   * Find all elements matching selector
   * @param snapshot - Root snapshot element
   * @param selector - Element selector criteria
   * @returns Array of UIDs of matching elements
   */
  findElements(snapshot: SnapshotElement, selector: ElementSelector): string[] {
    const uids: string[] = [];
    const queue: SnapshotElement[] = [snapshot];

    while (queue.length > 0) {
      const node = queue.shift()!;

      if (this.matchesSelector(node, selector)) {
        uids.push(node.uid);
      }

      if (node.children) {
        queue.push(...node.children);
      }
    }

    return uids;
  }

  /**
   * Check if an element matches the selector criteria
   */
  private matchesSelector(element: SnapshotElement, selector: ElementSelector): boolean {
    // Match by role
    if (selector.role && element.role !== selector.role) {
      return false;
    }

    // Match by text (string or regex)
    if (selector.text) {
      const textMatches = this.matchesText(element, selector.text);
      if (!textMatches) return false;
    }

    // Match by name (accessible name)
    if (selector.name) {
      const nameMatches = this.matchesName(element, selector.name);
      if (!nameMatches) return false;
    }

    // Match by attribute
    if (selector.attribute && element.attributes) {
      const { key, value } = selector.attribute;
      if (element.attributes[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if element's text/name matches the pattern
   */
  private matchesText(element: SnapshotElement, pattern: string | RegExp): boolean {
    const textContent = element.text || element.name || '';

    if (typeof pattern === 'string') {
      return textContent.includes(pattern);
    } else {
      return pattern.test(textContent);
    }
  }

  /**
   * Check if element's name matches the pattern
   */
  private matchesName(element: SnapshotElement, pattern: string | RegExp): boolean {
    if (!element.name) return false;

    if (typeof pattern === 'string') {
      return element.name === pattern || element.name.includes(pattern);
    } else {
      return pattern.test(element.name);
    }
  }

  /**
   * Parse raw snapshot output from MCP into structured tree
   */
  private parseSnapshot(rawSnapshot: string): SnapshotElement {
    // Chrome DevTools MCP returns snapshot as text
    // Parse it into structured tree
    // This is a simplified parser - real implementation would need to handle the full format

    const lines = rawSnapshot.split('\n').filter(line => line.trim());
    const root: SnapshotElement = {
      uid: 'root',
      role: 'root',
      name: 'page',
      children: [],
    };

    const stack: Array<{ element: SnapshotElement; level: number }> = [{ element: root, level: -1 }];

    for (const line of lines) {
      // Calculate indentation level
      const leadingSpaces = line.length - line.trimStart().length;
      const level = Math.floor(leadingSpaces / 2);

      // Parse element info from line
      // Format: uid role "name" [text]
      const parsed = this.parseSnapshotLine(line.trim());
      if (!parsed) continue;

      // Pop stack until we find parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      // Add as child of current parent
      const parent = stack[stack.length - 1].element;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(parsed);

      // Push onto stack
      stack.push({ element: parsed, level });
    }

    return root;
  }

  /**
   * Parse a single line from snapshot output
   */
  private parseSnapshotLine(line: string): SnapshotElement | null {
    // Simple regex to extract uid, role, and text
    // Real format: "uid role "name" text"
    const match = line.match(/^(\S+)\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(.+))?$/);
    if (!match) return null;

    const [, uid, role, name, text] = match;

    return {
      uid,
      role,
      name: name || undefined,
      text: text || undefined,
      children: [],
    };
  }

  /**
   * Debug helper: format snapshot tree for logging
   */
  debugSnapshot(snapshot: SnapshotElement, depth = 0, maxDepth = 3): string {
    const indent = '  '.repeat(depth);
    let result = `${indent}${snapshot.role} "${snapshot.name || snapshot.text || ''}"\n`;

    if (depth < maxDepth && snapshot.children) {
      for (const child of snapshot.children) {
        result += this.debugSnapshot(child, depth + 1, maxDepth);
      }
    }

    return result;
  }

  /**
   * Take snapshot via Chrome DevTools MCP
   * @private
   */
  private async takeSnapshotViaMCP(): Promise<string> {
    // Call actual Chrome DevTools MCP tool
    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__take_snapshot({
      verbose: MCP_CONFIG.snapshot.verbose
    });
    return result;
  }
}
