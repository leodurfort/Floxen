import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Global setup/teardown
    globalSetup: './global/global-setup.ts',
    setupFiles: './global/setup.ts',

    // Run tests sequentially (like Playwright's fullyParallel: false)
    sequence: { sequential: true },

    // Timeouts
    testTimeout: 60000,
    hookTimeout: 30000,

    // Environment
    environment: 'node',

    // Reporters
    reporters: ['default', 'html', 'json'],
    outputFile: {
      json: './test-results.json',
      html: './test-report/index.html',
    },

    // Include patterns
    include: ['tests/**/*.spec.ts'],

    // Retry failed tests
    retry: process.env.CI ? 2 : 0,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@adapters': path.resolve(__dirname, './adapters'),
      '@page-objects': path.resolve(__dirname, './page-objects'),
      '@fixtures': path.resolve(__dirname, './fixtures'),
      '@helpers': path.resolve(__dirname, './helpers'),
    },
  },
});
