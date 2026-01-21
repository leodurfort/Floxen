import { cleanupMCPClient } from '../adapters/mcp-client.js';

/**
 * Global teardown - runs once after all tests
 *
 * Cleans up MCP server connection
 */
export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up MCP client...');

  try {
    await cleanupMCPClient();
    console.log('✅ MCP client cleaned up\n');
  } catch (error) {
    console.error('⚠️  MCP cleanup warning:', error);
  }
}
