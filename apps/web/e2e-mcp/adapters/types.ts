/**
 * Core types for Chrome DevTools MCP adapters
 */

/**
 * Element selector for finding elements in snapshot
 */
export interface ElementSelector {
  /** Match by accessible text content */
  text?: string | RegExp;
  /** Match by ARIA role */
  role?: string;
  /** Match by accessible name */
  name?: string | RegExp;
  /** Match by attribute */
  attribute?: { key: string; value: string };
}

/**
 * Snapshot element from a11y tree
 */
export interface SnapshotElement {
  /** Unique identifier for this element */
  uid: string;
  /** ARIA role */
  role: string;
  /** Accessible name */
  name?: string;
  /** Text content */
  text?: string;
  /** Child elements */
  children?: SnapshotElement[];
  /** Element attributes */
  attributes?: Record<string, string>;
}

/**
 * Cached snapshot with metadata
 */
export interface CachedSnapshot {
  snapshot: SnapshotElement;
  timestamp: number;
  dirty: boolean;
}

/**
 * Page information
 */
export interface PageInfo {
  pageId: number;
  url: string;
  title: string;
}

/**
 * MCP tool options
 */
export interface MCPOptions {
  timeout?: number;
}

/**
 * Assertion options
 */
export interface AssertionOptions {
  timeout?: number;
  interval?: number;
}
