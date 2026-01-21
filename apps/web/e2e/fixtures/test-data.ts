/**
 * Test data constants and helpers for E2E tests
 */

// Test user credentials (loaded from environment)
export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'e2e-test@floxen.io',
  password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
  firstName: 'E2E',
  surname: 'TestUser',
};

// Secondary user for isolation tests
export const TEST_USER_2 = {
  email: process.env.E2E_TEST_USER_2_EMAIL || 'e2e-test-2@floxen.io',
  password: process.env.E2E_TEST_USER_2_PASSWORD || 'TestPassword456!',
  firstName: 'Second',
  surname: 'TestUser',
};

// WooCommerce test store configuration
export const TEST_WOOCOMMERCE_STORE = {
  url: process.env.E2E_WOOCOMMERCE_URL || 'https://test-store.woocommerce.com',
  name: 'E2E Test Store',
};

// WooCommerce URL shorthand
export const WOOCOMMERCE_URL = process.env.E2E_WOOCOMMERCE_URL || '';

// Pre-connected shop ID for tests that need an existing shop
export const TEST_SHOP_ID = process.env.E2E_TEST_SHOP_ID || '';

// Base URL for the web app
export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// API URL for direct API calls
export const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

// Generate unique email for registration tests
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `e2e-${timestamp}-${random}@test-floxen.io`;
}

// Test verification codes
export const TEST_VERIFICATION_CODE = '123456';

// Password constants
export const VALID_PASSWORD = 'SecurePass123!';
export const WEAK_PASSWORD = '12345';
export const INVALID_PASSWORD = 'wrongpassword';

// Timeout constants
export const TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 15000,
  LONG: 30000,
  OAUTH: 60000,
};

// Storage keys (must match the web app)
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'floxen.access',
  REFRESH_TOKEN: 'floxen.refresh',
  USER: 'floxen.user',
};
