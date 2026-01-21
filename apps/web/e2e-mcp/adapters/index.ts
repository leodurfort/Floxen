/**
 * Chrome DevTools MCP Adapters
 *
 * NOTE: These adapters contain placeholder MCP calls that need to be
 * replaced with actual mcp__chrome_devtools__* function calls at runtime.
 *
 * The MCP tools are provided globally and should be called directly:
 * - mcp__chrome_devtools__take_snapshot()
 * - mcp__chrome_devtools__click({ uid })
 * - mcp__chrome_devtools__fill({ uid, value })
 * - etc.
 */

export * from './types.js';
export * from './browser.adapter.js';
export * from './snapshot.adapter.js';
export * from './element.adapter.js';
export * from './assertion.adapter.js';
export { expect } from './assertion.adapter.js';
