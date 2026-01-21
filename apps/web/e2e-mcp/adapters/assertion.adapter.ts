import type { ElementSelector, AssertionOptions } from './types.js';
import { ElementAdapter } from './element.adapter.js';
import { PageAdapter } from './browser.adapter.js';

/**
 * Custom assertion library for Chrome DevTools MCP
 *
 * Provides Playwright-like expect() API with polling and retry logic
 */
export class MCPExpect {
  private defaultTimeout = 5000;
  private defaultInterval = 100;

  constructor(
    private selector: ElementSelector,
    private elementAdapter: ElementAdapter,
    private pageAdapter?: PageAdapter
  ) {}

  /**
   * Assert element is visible
   * @param options - Assertion options
   */
  async toBeVisible(options: AssertionOptions = {}): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;
    const interval = options.interval || this.defaultInterval;
    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < timeout) {
      try {
        const visible = await this.elementAdapter.isVisible(this.selector);
        if (visible) return; // Success!
      } catch (error) {
        lastError = error as Error;
      }

      await this.sleep(interval);
    }

    throw new Error(
      `Element not visible after ${timeout}ms: ${JSON.stringify(this.selector)}\n` +
      (lastError ? `Last error: ${lastError.message}` : '')
    );
  }

  /**
   * Assert element is hidden/not visible
   * @param options - Assertion options
   */
  async toBeHidden(options: AssertionOptions = {}): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;
    const interval = options.interval || this.defaultInterval;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const visible = await this.elementAdapter.isVisible(this.selector);
      if (!visible) return; // Success!

      await this.sleep(interval);
    }

    throw new Error(
      `Element still visible after ${timeout}ms: ${JSON.stringify(this.selector)}`
    );
  }

  /**
   * Assert element has specific text
   * @param text - Expected text (string or regex)
   * @param options - Assertion options
   */
  async toHaveText(text: string | RegExp, options: AssertionOptions = {}): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;
    const interval = options.interval || this.defaultInterval;
    const startTime = Date.now();
    let actualText: string | null = null;

    while (Date.now() - startTime < timeout) {
      actualText = await this.elementAdapter.getText(this.selector);

      if (actualText !== null) {
        const matches = typeof text === 'string'
          ? actualText === text
          : text.test(actualText);

        if (matches) return; // Success!
      }

      await this.sleep(interval);
    }

    throw new Error(
      `Element text does not match after ${timeout}ms\n` +
      `Selector: ${JSON.stringify(this.selector)}\n` +
      `Expected: ${text}\n` +
      `Actual: ${actualText}`
    );
  }

  /**
   * Assert element contains text
   * @param text - Expected text (string or regex)
   * @param options - Assertion options
   */
  async toContainText(text: string | RegExp, options: AssertionOptions = {}): Promise<void> {
    const timeout = options.timeout || this.defaultTimeout;
    const interval = options.interval || this.defaultInterval;
    const startTime = Date.now();
    let actualText: string | null = null;

    while (Date.now() - startTime < timeout) {
      actualText = await this.elementAdapter.getText(this.selector);

      if (actualText !== null) {
        const contains = typeof text === 'string'
          ? actualText.includes(text)
          : text.test(actualText);

        if (contains) return; // Success!
      }

      await this.sleep(interval);
    }

    throw new Error(
      `Element text does not contain expected text after ${timeout}ms\n` +
      `Selector: ${JSON.stringify(this.selector)}\n` +
      `Expected to contain: ${text}\n` +
      `Actual: ${actualText}`
    );
  }

  /**
   * Assert page URL matches pattern
   * @param pattern - URL pattern (string or regex)
   * @param options - Assertion options
   */
  async toHaveURL(pattern: string | RegExp, options: AssertionOptions = {}): Promise<void> {
    if (!this.pageAdapter) {
      throw new Error('toHaveURL requires pageAdapter');
    }

    const timeout = options.timeout || this.defaultTimeout;
    const interval = options.interval || this.defaultInterval;
    const startTime = Date.now();
    let actualURL: string | null = null;

    while (Date.now() - startTime < timeout) {
      actualURL = await this.pageAdapter.getURL();

      const matches = typeof pattern === 'string'
        ? actualURL.includes(pattern)
        : pattern.test(actualURL);

      if (matches) return; // Success!

      await this.sleep(interval);
    }

    throw new Error(
      `URL does not match after ${timeout}ms\n` +
      `Expected: ${pattern}\n` +
      `Actual: ${actualURL}`
    );
  }

  /**
   * Assert element count matches expected
   * @param count - Expected count
   * @param options - Assertion options
   */
  async toHaveCount(count: number, options: AssertionOptions = {}): Promise<void> {
    throw new Error('toHaveCount not yet implemented');
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create an expectation for an element
 * @param selector - Element selector
 * @param elementAdapter - Element adapter instance
 * @param pageAdapter - Optional page adapter for URL assertions
 * @returns MCPExpect instance
 */
export function expect(
  selector: ElementSelector,
  elementAdapter: ElementAdapter,
  pageAdapter?: PageAdapter
): MCPExpect {
  return new MCPExpect(selector, elementAdapter, pageAdapter);
}
