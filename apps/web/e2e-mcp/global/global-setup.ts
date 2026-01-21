import { BrowserAdapter, PageAdapter } from '../adapters/index.js';
import { authenticateViaAPI, saveAuthState } from '../fixtures/auth.fixture.js';
import * as testData from '../fixtures/test-data.js';
import { injectMCPTools } from '../adapters/mcp-client.js';

/**
 * Global setup - runs once before all tests
 *
 * Creates authentication state by:
 * 0. Inject MCP tools into global scope
 * 1. Authenticating via API
 * 2. Creating a page and setting tokens in localStorage
 * 3. Saving auth state to file for test reuse
 */
export default async function globalSetup() {
  console.log('\n🚀 Starting global MCP authentication setup...\n');

  try {
    // 0. Inject MCP tools first
    console.log('🔌 Connecting to MCP server and injecting tools...');
    await injectMCPTools();
    console.log('✅ MCP tools ready\n');
    // 1. Authenticate via API
    console.log(`📧 Authenticating as ${testData.TEST_USER.email}...`);
    const authData = await authenticateViaAPI(
      testData.TEST_USER.email,
      testData.TEST_USER.password
    );
    console.log('✅ API authentication successful');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}\n`);

    // 2. Create browser and page
    console.log(`🌐 Creating browser page...`);
    const browser = new BrowserAdapter();
    const page = await browser.createPage(testData.BASE_URL);
    console.log(`✅ Page created at ${testData.BASE_URL}\n`);

    // 3. Set auth tokens in localStorage
    console.log('🔐 Setting authentication tokens in localStorage...');
    // @ts-ignore - MCP tools are provided globally
    await mcp__chrome_devtools__evaluate_script({
      function: `(user, accessToken, refreshToken, keys) => {
        localStorage.setItem(keys.USER, JSON.stringify(user));
        localStorage.setItem(keys.ACCESS_TOKEN, accessToken);
        localStorage.setItem(keys.REFRESH_TOKEN, refreshToken);
        console.log('Auth tokens set in localStorage');
      }`
    });
    console.log('✅ LocalStorage tokens set\n');

    // 4. Verify tokens were set
    console.log('🔍 Verifying localStorage...');
    // @ts-ignore
    const storedUser = await mcp__chrome_devtools__evaluate_script({
      function: `(key) => localStorage.getItem(key))`
    });
    console.log('✅ LocalStorage verified\n');

    // 5. Save auth state to file
    console.log('💾 Saving auth state for test reuse...');
    const authState = {
      user: authData.user,
      tokens: authData.tokens,
    };
    saveAuthState(authState);
    console.log('✅ Auth state saved\n');

    console.log('🎉 Global authentication setup complete!\n');

    // Return teardown function
    return async () => {
      const { cleanupMCPClient } = await import('../adapters/mcp-client.js');
      console.log('\n🧹 Cleaning up MCP client...');
      await cleanupMCPClient();
      console.log('✅ MCP client cleaned up\n');
    };
  } catch (error) {
    console.error('\n❌ Global authentication setup failed:', error);
    throw error;
  }
}
