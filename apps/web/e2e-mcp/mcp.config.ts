import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

export const MCP_CONFIG = {
  // Chrome DevTools MCP server settings
  headless: process.env.HEADLESS !== 'false',

  // Browser settings
  browser: {
    defaultTimeout: 30000,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Snapshot settings
  snapshot: {
    verbose: false, // Full a11y tree details
    cacheLifetime: 5000, // Cache validity in ms
  },

  // Base URLs
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiURL: process.env.E2E_API_URL || 'http://localhost:3001',

  // Screenshot settings
  screenshots: {
    onFailure: true,
    path: './test-results/screenshots',
  },

  // Trace settings
  trace: {
    enabled: process.env.CI === 'true',
    path: './test-results/traces',
  },
} as const;
