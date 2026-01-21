import { BrowserAdapter, PageAdapter } from '../adapters/index.js';
import * as testData from './test-data.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTH_FILE = path.resolve(__dirname, '../.auth/user.json');

/**
 * Auth data structure returned from API
 */
export interface AuthData {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    onboardingComplete: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Authenticate via API
 * @param email - User email
 * @param password - User password
 * @returns Authentication data
 */
export async function authenticateViaAPI(
  email: string,
  password: string
): Promise<AuthData> {
  const apiUrl = testData.API_URL;

  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data as AuthData;
}

/**
 * Saved auth state
 */
export interface AuthState {
  user: AuthData['user'];
  tokens: AuthData['tokens'];
}

/**
 * Load auth state from file
 * @returns Auth state
 */
export function loadAuthState(): AuthState {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Auth state not found at ${AUTH_FILE}. Run global setup first.`);
  }

  const content = fs.readFileSync(AUTH_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save auth state to file
 * @param authState - Auth state to save
 */
export function saveAuthState(authState: AuthState): void {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  fs.writeFileSync(AUTH_FILE, JSON.stringify(authState, null, 2));
}

// Singleton browser adapter
let browserAdapter: BrowserAdapter | null = null;

/**
 * Get or create browser adapter
 */
async function getBrowserAdapter(): Promise<BrowserAdapter> {
  if (!browserAdapter) {
    browserAdapter = new BrowserAdapter();
  }
  return browserAdapter;
}

/**
 * Create a page with pre-loaded authentication state
 * @returns PageAdapter with auth tokens in localStorage
 */
export async function useAuthenticatedPage(): Promise<PageAdapter> {
  const browser = await getBrowserAdapter();
  const authState = loadAuthState();

  // Create new page
  const page = await browser.createPage(testData.BASE_URL);

  // Set auth tokens in localStorage
  // @ts-ignore - MCP tools are provided globally
  await mcp__chrome_devtools__evaluate_script({
    function: `(user, accessToken, refreshToken, keys) => {
      localStorage.setItem(keys.USER, JSON.stringify(user));
      localStorage.setItem(keys.ACCESS_TOKEN, accessToken);
      localStorage.setItem(keys.REFRESH_TOKEN, refreshToken);
    }`
  });

  return page;
}

/**
 * Create a page without authentication (for auth flow tests)
 * @returns Fresh PageAdapter
 */
export async function useUnauthenticatedPage(): Promise<PageAdapter> {
  const browser = await getBrowserAdapter();
  return await browser.createPage(testData.BASE_URL);
}
