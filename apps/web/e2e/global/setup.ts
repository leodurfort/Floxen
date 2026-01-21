import { test as setup, chromium } from '@playwright/test';
import { authenticateViaAPI, AUTH_FILE } from '../fixtures/auth.fixture';
import * as testData from '../fixtures/test-data';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup test
 *
 * This runs before all tests and sets up authentication state
 * by logging in via API and storing tokens in localStorage.
 */
setup('authenticate user', async ({ baseURL }) => {
  console.log('Starting authentication setup...');

  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log(`Created auth directory: ${authDir}`);
  }

  try {
    // Authenticate via API to get tokens
    console.log(`Authenticating as ${testData.TEST_USER.email}...`);
    const authData = await authenticateViaAPI(
      testData.TEST_USER.email,
      testData.TEST_USER.password
    );
    console.log('✓ API authentication successful');
    console.log(`  User ID: ${authData.user.id}`);
    console.log(`  Email: ${authData.user.email}`);

    // Use baseURL from config or fallback
    const appURL = baseURL || testData.BASE_URL || 'http://localhost:3000';

    // Create browser and set storage state
    console.log(`Launching browser...`);
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL: appURL });
    const page = await context.newPage();

    // Navigate to app to establish origin for localStorage
    console.log(`Navigating to ${appURL}...`);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Set auth tokens in localStorage
    console.log('Setting authentication tokens in localStorage...');
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

    // Verify localStorage was set
    const storedUser = await page.evaluate(
      (key) => localStorage.getItem(key),
      testData.STORAGE_KEYS.USER
    );
    console.log('✓ LocalStorage set successfully');

    // Save storage state
    await context.storageState({ path: AUTH_FILE });
    console.log(`✓ Auth state saved to ${AUTH_FILE}`);

    await browser.close();
    console.log('✓ Authentication setup complete');
  } catch (error) {
    console.error('✗ Authentication setup failed:', error);
    throw error; // Fail the setup test so dependent tests are skipped
  }
});
