/**
 * Manual Test Runner for Claude Code
 *
 * This script demonstrates how to execute tests manually using MCP tools.
 * It's designed to be used by Claude Code in manual execution mode.
 *
 * Usage: Claude will use this as a template when executing tests manually.
 */

import { BrowserAdapter, PageAdapter } from '../adapters/index.js';
import * as testData from '../fixtures/test-data.js';
import { authenticateViaAPI, loadAuthState } from '../fixtures/auth.fixture.js';

/**
 * Manual Test Execution Template
 *
 * This shows the pattern for executing any test manually via Claude Code.
 */
export async function manualTestTemplate() {
  console.log('📋 Manual Test Execution Template\n');
  console.log('This is a template showing how to execute tests manually.\n');
  console.log('Steps:');
  console.log('1. Setup browser and authentication');
  console.log('2. Create page objects');
  console.log('3. Execute test steps');
  console.log('4. Verify results');
  console.log('5. Cleanup\n');
}

/**
 * Example: Execute Login Test Manually
 *
 * Demonstrates manual execution of a single test from login.spec.ts
 */
export async function exampleLoginTest() {
  console.log('🧪 Example: Login Test (Manual Execution)\n');

  try {
    // Step 1: Setup
    console.log('1️⃣ Setting up browser...');
    // In manual execution, Claude will use MCP tools directly:
    // - mcp__chrome_devtools__new_page()
    // - mcp__chrome_devtools__navigate_page()
    // etc.

    console.log('2️⃣ Creating page objects...');
    // Import and instantiate page objects:
    // const loginPage = new LoginPageMCP(page);

    console.log('3️⃣ Executing test steps...');
    // await loginPage.goto();
    // await loginPage.fillEmail('test@example.com');
    // await loginPage.fillPassword('password');
    // await loginPage.clickSignIn();

    console.log('4️⃣ Verifying results...');
    // await loginPage.expectDashboard();

    console.log('✅ Test completed successfully\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test Execution Patterns
 *
 * Common patterns for manual test execution
 */
export const MANUAL_EXECUTION_PATTERNS = {

  /**
   * Pattern 1: Simple Test (No Auth Required)
   * Example: Public page tests, login form validation
   */
  simpleTest: `
    // 1. Create page
    const page = await mcp__chrome_devtools__new_page({
      url: process.env.E2E_BASE_URL + '/login'
    });

    // 2. Take snapshot to see page structure
    const snapshot = await mcp__chrome_devtools__take_snapshot({});

    // 3. Interact with elements
    await mcp__chrome_devtools__fill({
      uid: 'email-input-uid',
      value: 'test@example.com'
    });

    // 4. Verify results
    const result = await mcp__chrome_devtools__evaluate_script({
      function: '() => document.querySelector(".error-message")?.textContent'
    });
  `,

  /**
   * Pattern 2: Authenticated Test
   * Example: Tests requiring logged-in user
   */
  authenticatedTest: `
    // 1. Get auth state
    const authState = await loadAuthState();

    // 2. Create page
    const page = await mcp__chrome_devtools__new_page({
      url: process.env.E2E_BASE_URL
    });

    // 3. Set auth tokens
    await mcp__chrome_devtools__evaluate_script({
      function: \`(tokens) => {
        localStorage.setItem('floxen.access', tokens.access);
        localStorage.setItem('floxen.refresh', tokens.refresh);
        localStorage.setItem('floxen.user', JSON.stringify(tokens.user));
      }\`,
      args: [{ access: authState.tokens.access, refresh: authState.tokens.refresh, user: authState.user }]
    });

    // 4. Navigate to protected page
    await mcp__chrome_devtools__navigate_page({
      type: 'url',
      url: process.env.E2E_BASE_URL + '/shops'
    });

    // 5. Execute test steps...
  `,

  /**
   * Pattern 3: Multi-Step Flow
   * Example: Shop connection, registration with email verification
   */
  multiStepFlow: `
    // 1. Step 1: Navigate to starting point
    await mcp__chrome_devtools__navigate_page({
      type: 'url',
      url: process.env.E2E_BASE_URL + '/shops'
    });

    // 2. Step 2: Find and click element with text fallback
    const snapshot1 = await mcp__chrome_devtools__take_snapshot({});
    const addShopButton = findElementByText(snapshot1, [
      "Connect new store",
      "Add Shop",
      "Connect Shop"
    ], { role: "button" });
    await mcp__chrome_devtools__click({ uid: addShopButton });

    // 3. Step 3: Fill form
    const snapshot2 = await mcp__chrome_devtools__take_snapshot({});
    const urlInput = findElementByText(snapshot2, ["Store URL", "URL"], { role: "textbox" });
    await mcp__chrome_devtools__fill({
      uid: urlInput,
      value: 'https://example.com'
    });

    // 4. Step 4: Submit and verify
    const submitButton = findElementByText(snapshot2, ["Connect", "Continue"], { role: "button" });
    await mcp__chrome_devtools__click({ uid: submitButton });

    // 5. Step 5: Wait for result
    await mcp__chrome_devtools__wait_for({ text: "Shop connected successfully" });
  `,

  /**
   * Pattern 4: Using Page Objects
   * Example: Using migrated page objects for cleaner test code
   */
  usingPageObjects: `
    // 1. Import page objects
    import { LoginPageMCP } from '../page-objects/auth/login.page.mcp.js';
    import { ShopsPageMCP } from '../page-objects/shops/shops.page.mcp.js';

    // 2. Create page adapter (wraps MCP tools)
    const browserAdapter = new BrowserAdapter();
    const pageAdapter = await browserAdapter.createPage(process.env.E2E_BASE_URL);

    // 3. Use page objects
    const loginPage = new LoginPageMCP(pageAdapter);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password');

    // 4. Navigate to another page
    const shopsPage = new ShopsPageMCP(pageAdapter);
    await shopsPage.goto();
    await shopsPage.clickAddShop();
  `
};

/**
 * Test Execution Helpers
 */
export const EXECUTION_HELPERS = {

  /**
   * Find element by text with fallbacks
   */
  findElementByText: `
    function findElementByText(
      snapshot: any,
      textVariations: string[],
      options: { role?: string } = {}
    ): string | null {
      // Parse snapshot and find element matching any text variation
      // Return uid if found, null otherwise

      for (const text of textVariations) {
        // Search through snapshot.children recursively
        const result = searchNode(snapshot, text, options.role);
        if (result) return result;
      }

      return null;
    }

    function searchNode(node: any, text: string, role?: string): string | null {
      // Check current node
      if (role && node.role !== role) {
        // Skip if role doesn't match
      } else if (node.name?.includes(text) || node.value?.includes(text)) {
        return node.uid;
      }

      // Search children
      if (node.children) {
        for (const child of node.children) {
          const result = searchNode(child, text, role);
          if (result) return result;
        }
      }

      return null;
    }
  `,

  /**
   * Wait for element with polling
   */
  waitForElement: `
    async function waitForElement(
      text: string,
      timeout: number = 5000
    ): Promise<boolean> {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const snapshot = await mcp__chrome_devtools__take_snapshot({});
        const found = findElementByText(snapshot, [text]);

        if (found) return true;

        // Wait 100ms before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return false;
    }
  `,

  /**
   * Take screenshot on failure
   */
  screenshotOnFailure: `
    async function executeWithScreenshot(
      testName: string,
      testFn: () => Promise<void>
    ): Promise<void> {
      try {
        await testFn();
        console.log(\`✅ \${testName} passed\`);
      } catch (error) {
        console.error(\`❌ \${testName} failed:\`, error);

        // Take screenshot
        const filename = \`failure-\${testName.replace(/\\s+/g, '-')}.png\`;
        await mcp__chrome_devtools__take_screenshot({
          filePath: \`./screenshots/\${filename}\`
        });
        console.log(\`📸 Screenshot saved: \${filename}\`);

        throw error;
      }
    }
  `
};

/**
 * Quick Start Examples
 *
 * Copy-paste examples for common test scenarios
 */
export const QUICK_START_EXAMPLES = {

  /**
   * Example 1: Test Login Page Loads
   */
  testLoginPageLoads: `
    // Create page and navigate to login
    const page = await mcp__chrome_devtools__new_page({
      url: process.env.E2E_BASE_URL + '/login'
    });

    // Verify login form is visible
    await mcp__chrome_devtools__wait_for({ text: "Sign In" });

    console.log('✅ Login page loaded successfully');
  `,

  /**
   * Example 2: Test Login with Valid Credentials
   */
  testValidLogin: `
    // 1. Navigate to login
    const page = await mcp__chrome_devtools__new_page({
      url: process.env.E2E_BASE_URL + '/login'
    });

    // 2. Take snapshot to find elements
    const snapshot = await mcp__chrome_devtools__take_snapshot({});

    // 3. Find email input (you'll need the uid from snapshot)
    await mcp__chrome_devtools__fill({
      uid: 'email-input-uid-from-snapshot',
      value: 'test@example.com'
    });

    // 4. Find password input
    await mcp__chrome_devtools__fill({
      uid: 'password-input-uid-from-snapshot',
      value: 'password123'
    });

    // 5. Click sign in button
    await mcp__chrome_devtools__click({
      uid: 'signin-button-uid-from-snapshot'
    });

    // 6. Wait for redirect to dashboard
    await mcp__chrome_devtools__wait_for({ text: "Dashboard" });

    console.log('✅ Login successful');
  `,

  /**
   * Example 3: Test Shop Page Button Text
   */
  testShopPageButton: `
    // 1. Setup auth
    const authState = await loadAuthState();

    // 2. Create page
    const page = await mcp__chrome_devtools__new_page({
      url: process.env.E2E_BASE_URL
    });

    // 3. Set auth tokens
    await mcp__chrome_devtools__evaluate_script({
      function: \`(tokens) => {
        localStorage.setItem('floxen.access', tokens.access);
        localStorage.setItem('floxen.refresh', tokens.refresh);
        localStorage.setItem('floxen.user', JSON.stringify(tokens.user));
      }\`,
      args: [authState.tokens]
    });

    // 4. Navigate to shops
    await mcp__chrome_devtools__navigate_page({
      type: 'url',
      url: process.env.E2E_BASE_URL + '/shops'
    });

    // 5. Take snapshot
    const snapshot = await mcp__chrome_devtools__take_snapshot({});

    // 6. Search for button with text variations
    const buttonTexts = ["Connect new store", "Add Shop", "Connect Shop"];
    let buttonFound = null;

    for (const text of buttonTexts) {
      // Search snapshot for button with this text
      // (you'll implement findElementByText helper)
      const uid = findElementByText(snapshot, text, 'button');
      if (uid) {
        buttonFound = text;
        console.log(\`✅ Found button with text: "\${text}"\`);
        break;
      }
    }

    if (!buttonFound) {
      console.log('❌ Button not found with any expected text');
    }
  `
};

/**
 * Usage Instructions
 */
console.log(`
╔════════════════════════════════════════════════════════════════╗
║            Manual Test Runner for Claude Code                 ║
╚════════════════════════════════════════════════════════════════╝

This file provides templates and examples for manual test execution.

📖 Documentation: See MANUAL-EXECUTION.md for complete guide

🚀 Quick Start:
   1. Request a test: "Claude, run the login test"
   2. Claude will use these patterns to execute
   3. Results will be displayed with pass/fail status

💡 Examples:
   - "Run smoke tests"
   - "Test the shop connection flow"
   - "Verify the login page loads correctly"

🔧 Patterns Available:
   - Simple Test (no auth)
   - Authenticated Test
   - Multi-Step Flow
   - Using Page Objects

📚 See MANUAL_EXECUTION_PATTERNS for code examples

`);

export default {
  manualTestTemplate,
  exampleLoginTest,
  MANUAL_EXECUTION_PATTERNS,
  EXECUTION_HELPERS,
  QUICK_START_EXAMPLES
};
