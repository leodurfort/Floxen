import { chromium, FullConfig } from '@playwright/test';
import { authenticateViaAPI, AUTH_FILE } from '../fixtures/auth.fixture';
import * as testData from '../fixtures/test-data';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup script
 *
 * This runs before all tests and sets up authentication state
 * by logging in via API and storing tokens in localStorage.
 */
async function globalSetup(config: FullConfig) {
  console.log('Starting global setup...');

  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    // Authenticate via API to get tokens
    console.log(`Authenticating as ${testData.TEST_USER.email}...`);
    const authData = await authenticateViaAPI(
      testData.TEST_USER.email,
      testData.TEST_USER.password
    );
    console.log('API authentication successful');

    // Get base URL from config
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

    // Create browser and set storage state
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    // Navigate to app to establish origin for localStorage
    console.log(`Navigating to ${baseURL}...`);
    await page.goto('/');

    // Set auth tokens in localStorage
    await page.evaluate(
      ({ user, accessToken, refreshToken, keys }) => {
        localStorage.setItem(keys.USER, JSON.stringify(user));
        localStorage.setItem(keys.ACCESS_TOKEN, accessToken);
        localStorage.setItem(keys.REFRESH_TOKEN, refreshToken);
      },
      {
        user: authData.user,
        accessToken: authData.tokens.accessToken,
        refreshToken: authData.tokens.refreshToken,
        keys: testData.STORAGE_KEYS,
      }
    );

    // Save storage state
    await context.storageState({ path: AUTH_FILE });
    console.log(`Auth state saved to ${AUTH_FILE}`);

    await browser.close();
    console.log('Global setup complete');
  } catch (error) {
    console.error('Global setup failed:', error);

    // Create empty auth file to prevent test failures
    const emptyState = {
      cookies: [],
      origins: [],
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(emptyState, null, 2));

    console.warn('Created empty auth state - authenticated tests may fail');
  }
}

export default globalSetup;
