/**
 * Utility to verify Chrome DevTools MCP tools are available
 */

export async function verifyMCPTools(): Promise<void> {
  const requiredTools = [
    'mcp__chrome_devtools__take_snapshot',
    'mcp__chrome_devtools__new_page',
    'mcp__chrome_devtools__navigate_page',
    'mcp__chrome_devtools__list_pages',
    'mcp__chrome_devtools__click',
    'mcp__chrome_devtools__fill',
    'mcp__chrome_devtools__evaluate_script',
  ];

  const missingTools: string[] = [];

  for (const tool of requiredTools) {
    // @ts-ignore - MCP tools are provided globally
    if (typeof globalThis[tool] !== 'function') {
      missingTools.push(tool);
    }
  }

  if (missingTools.length > 0) {
    throw new Error(
      `Missing Chrome DevTools MCP tools:\n${missingTools.join('\n')}\n\n` +
      'Make sure Chrome DevTools MCP server is running and configured correctly.'
    );
  }

  console.log('✅ All required MCP tools are available');
}

/**
 * Get MCP tool availability status
 */
export function getMCPToolStatus(): Record<string, boolean> {
  const tools = [
    'mcp__chrome_devtools__take_snapshot',
    'mcp__chrome_devtools__new_page',
    'mcp__chrome_devtools__navigate_page',
    'mcp__chrome_devtools__list_pages',
    'mcp__chrome_devtools__select_page',
    'mcp__chrome_devtools__close_page',
    'mcp__chrome_devtools__resize_page',
    'mcp__chrome_devtools__click',
    'mcp__chrome_devtools__fill',
    'mcp__chrome_devtools__fill_form',
    'mcp__chrome_devtools__hover',
    'mcp__chrome_devtools__press_key',
    'mcp__chrome_devtools__drag',
    'mcp__chrome_devtools__upload_file',
    'mcp__chrome_devtools__wait_for',
    'mcp__chrome_devtools__evaluate_script',
    'mcp__chrome_devtools__handle_dialog',
    'mcp__chrome_devtools__list_network_requests',
    'mcp__chrome_devtools__get_network_request',
    'mcp__chrome_devtools__list_console_messages',
    'mcp__chrome_devtools__get_console_message',
  ];

  const status: Record<string, boolean> = {};

  for (const tool of tools) {
    // @ts-ignore - MCP tools are provided globally
    status[tool] = typeof globalThis[tool] === 'function';
  }

  return status;
}

/**
 * Print MCP tool status to console
 */
export function printMCPToolStatus(): void {
  const status = getMCPToolStatus();
  const available = Object.values(status).filter(Boolean).length;
  const total = Object.keys(status).length;

  console.log(`\n📊 Chrome DevTools MCP Tool Status: ${available}/${total} available\n`);

  for (const [tool, isAvailable] of Object.entries(status)) {
    const icon = isAvailable ? '✅' : '❌';
    console.log(`${icon} ${tool}`);
  }

  console.log('');
}
