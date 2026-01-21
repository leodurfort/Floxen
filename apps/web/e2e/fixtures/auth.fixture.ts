import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/auth/login.page';
import { ShopsPage } from '../page-objects/shops/shops.page';
import * as testData from './test-data';

// Storage state file path
export const AUTH_FILE = 'playwright/.auth/user.json';

/**
 * Authentication response from API
 */
interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    surname: string | null;
    subscriptionTier: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Authenticate via API to get tokens programmatically
 */
export async function authenticateViaAPI(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${testData.API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    user: data.user,
    tokens: data.tokens,
  };
}

/**
 * Extended fixtures for authentication
 */
type AuthFixtures = {
  loginPage: LoginPage;
  shopsPage: ShopsPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }: { page: Page }, use: (r: LoginPage) => Promise<void>) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  shopsPage: async ({ page }: { page: Page }, use: (r: ShopsPage) => Promise<void>) => {
    const shopsPage = new ShopsPage(page);
    await use(shopsPage);
  },
});

export { expect } from '@playwright/test';
