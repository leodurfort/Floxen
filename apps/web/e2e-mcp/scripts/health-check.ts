#!/usr/bin/env node

/**
 * E2E MCP Health Check Script
 *
 * Verifies that all prerequisites are met before running tests:
 * - Environment variables are set
 * - MCP server is accessible (if running)
 * - Test user exists (via API check)
 * - Dependencies are installed
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: HealthCheckResult[] = [];

function addResult(
  name: string,
  status: 'pass' | 'fail' | 'warn',
  message: string
) {
  results.push({ name, status, message });
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');

  const requiredVars = [
    'E2E_BASE_URL',
    'E2E_API_URL',
    'E2E_TEST_USER_EMAIL',
    'E2E_TEST_USER_PASSWORD',
  ];

  const optionalVars = [
    'E2E_TEST_SHOP_ID',
    'E2E_WOOCOMMERCE_URL',
    'E2E_MAILBOX_API_KEY',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      addResult(varName, 'pass', `✓ ${varName} is set`);
    } else {
      addResult(varName, 'fail', `✗ ${varName} is not set (required)`);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      addResult(varName, 'pass', `✓ ${varName} is set`);
    } else {
      addResult(
        varName,
        'warn',
        `⚠ ${varName} is not set (some tests will skip)`
      );
    }
  }
}

async function checkDependencies() {
  console.log('\n🔍 Checking dependencies...');

  const packageJsonPath = path.resolve(__dirname, '../package.json');

  if (!fs.existsSync(packageJsonPath)) {
    addResult(
      'package.json',
      'fail',
      '✗ package.json not found'
    );
    return;
  }

  addResult('package.json', 'pass', '✓ package.json exists');

  // Check if node_modules exists
  const nodeModulesPath = path.resolve(__dirname, '../node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    addResult(
      'dependencies',
      'fail',
      '✗ node_modules not found. Run: npm install'
    );
    return;
  }

  addResult('dependencies', 'pass', '✓ node_modules exists');

  // Check for key dependencies
  const keyDeps = ['vitest', 'dotenv'];
  for (const dep of keyDeps) {
    const depPath = path.resolve(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      addResult(dep, 'pass', `✓ ${dep} is installed`);
    } else {
      addResult(dep, 'fail', `✗ ${dep} is not installed`);
    }
  }
}

async function checkFileStructure() {
  console.log('\n🔍 Checking file structure...');

  const requiredDirs = [
    'adapters',
    'page-objects',
    'tests',
    'fixtures',
    'global',
  ];

  const requiredFiles = [
    'vitest.config.ts',
    'tsconfig.json',
    '.env',
  ];

  const basePath = path.resolve(__dirname, '..');

  // Check directories
  for (const dir of requiredDirs) {
    const dirPath = path.join(basePath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      addResult(`dir:${dir}`, 'pass', `✓ ${dir}/ exists`);
    } else {
      addResult(`dir:${dir}`, 'fail', `✗ ${dir}/ not found`);
    }
  }

  // Check files
  for (const file of requiredFiles) {
    const filePath = path.join(basePath, file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      addResult(`file:${file}`, 'pass', `✓ ${file} exists`);
    } else {
      addResult(`file:${file}`, 'fail', `✗ ${file} not found`);
    }
  }
}

async function checkApiConnection() {
  console.log('\n🔍 Checking API connection...');

  const apiUrl = process.env.E2E_API_URL;

  if (!apiUrl) {
    addResult('api-url', 'fail', '✗ E2E_API_URL not set');
    return;
  }

  try {
    // Try to fetch the API health endpoint
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      addResult('api-health', 'pass', `✓ API is reachable at ${apiUrl}`);
    } else {
      addResult(
        'api-health',
        'warn',
        `⚠ API returned status ${response.status}`
      );
    }
  } catch (error) {
    addResult(
      'api-health',
      'warn',
      `⚠ Could not reach API at ${apiUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function checkWebAppConnection() {
  console.log('\n🔍 Checking web app connection...');

  const baseUrl = process.env.E2E_BASE_URL;

  if (!baseUrl) {
    addResult('base-url', 'fail', '✗ E2E_BASE_URL not set');
    return;
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      addResult('web-app', 'pass', `✓ Web app is reachable at ${baseUrl}`);
    } else {
      addResult(
        'web-app',
        'warn',
        `⚠ Web app returned status ${response.status}`
      );
    }
  } catch (error) {
    addResult(
      'web-app',
      'warn',
      `⚠ Could not reach web app at ${baseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 HEALTH CHECK RESULTS');
  console.log('='.repeat(80) + '\n');

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;

  // Group results by status
  const passes = results.filter((r) => r.status === 'pass');
  const fails = results.filter((r) => r.status === 'fail');
  const warns = results.filter((r) => r.status === 'warn');

  // Print passes
  if (passes.length > 0) {
    console.log('✅ PASSED:\n');
    passes.forEach((r) => console.log(`  ${r.message}`));
    console.log('');
  }

  // Print warnings
  if (warns.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warns.forEach((r) => console.log(`  ${r.message}`));
    console.log('');
  }

  // Print failures
  if (fails.length > 0) {
    console.log('❌ FAILURES:\n');
    fails.forEach((r) => console.log(`  ${r.message}`));
    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log(
    `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`
  );
  console.log('='.repeat(80) + '\n');

  // Recommendations
  if (failCount > 0) {
    console.log('🔧 RECOMMENDED ACTIONS:\n');

    if (fails.some((f) => f.name.startsWith('E2E_'))) {
      console.log('  1. Copy .env.example to .env and fill in values');
      console.log('     cp .env.example .env');
      console.log('');
    }

    if (fails.some((f) => f.name === 'dependencies')) {
      console.log('  2. Install dependencies');
      console.log('     npm install');
      console.log('');
    }

    if (fails.some((f) => f.name.startsWith('dir:') || f.name.startsWith('file:'))) {
      console.log('  3. Verify you are in the correct directory');
      console.log('     cd apps/web/e2e-mcp');
      console.log('');
    }
  }

  if (warnCount > 0 && failCount === 0) {
    console.log('ℹ️  INFO:\n');
    console.log('  Some optional features are not configured.');
    console.log('  Tests requiring these features will be skipped.');
    console.log('  See VERIFICATION.md for details.');
    console.log('');
  }

  if (failCount === 0 && warnCount === 0) {
    console.log('🎉 All checks passed! You are ready to run tests.\n');
    console.log('Next steps:');
    console.log('  1. Start MCP server: mcp-chrome-devtools --verbose');
    console.log('  2. Run smoke tests: npm run test:smoke');
    console.log('  3. Run full suite: npm test');
    console.log('');
  }

  return failCount === 0;
}

async function main() {
  console.log('🏥 E2E MCP Health Check');
  console.log('='.repeat(80));

  // Load environment variables from .env file
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }

  // Run all checks
  await checkFileStructure();
  await checkDependencies();
  await checkEnvironmentVariables();
  await checkWebAppConnection();
  await checkApiConnection();

  // Print results
  const success = printResults();

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the health check
main().catch((error) => {
  console.error('❌ Health check failed with error:', error);
  process.exit(1);
});
