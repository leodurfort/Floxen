/**
 * MCP Client Adapter
 *
 * Connects to Chrome DevTools MCP server and provides MCP tools
 * to the test environment.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface MCPMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: any;
  id?: number;
  result?: any;
  error?: any;
}

class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start Chrome DevTools MCP server
      this.process = spawn('npx', [
        '-y',
        '@modelcontextprotocol/server-chrome-devtools'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create MCP server process'));
        return;
      }

      let buffer = '';
      this.process.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message: MCPMessage = JSON.parse(line);
              this.handleMessage(message);
            } catch (e) {
              // Ignore non-JSON output (server logs)
            }
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[MCP Server Error]', data.toString());
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      // Wait for server to be ready
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'MCP error'));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  async call(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP server not connected'));
        return;
      }

      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });

      const message: MCPMessage = {
        jsonrpc: '2.0',
        method,
        params,
        id,
      };

      this.process.stdin.write(JSON.stringify(message) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error(`MCP call timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// Global MCP client instance
let globalMCPClient: MCPClient | null = null;

/**
 * Get or create the global MCP client
 */
export async function getMCPClient(): Promise<MCPClient> {
  if (!globalMCPClient) {
    globalMCPClient = new MCPClient();
    await globalMCPClient.connect();
  }
  return globalMCPClient;
}

/**
 * Inject MCP tools into global scope for tests
 */
export async function injectMCPTools(): Promise<void> {
  const client = await getMCPClient();

  // Inject all Chrome DevTools MCP tools into global scope
  (global as any).mcp__chrome_devtools__new_page = async (params: any) => {
    return await client.call('chrome-devtools/new-page', params);
  };

  (global as any).mcp__chrome_devtools__list_pages = async () => {
    return await client.call('chrome-devtools/list-pages');
  };

  (global as any).mcp__chrome_devtools__select_page = async (params: any) => {
    return await client.call('chrome-devtools/select-page', params);
  };

  (global as any).mcp__chrome_devtools__close_page = async (params: any) => {
    return await client.call('chrome-devtools/close-page', params);
  };

  (global as any).mcp__chrome_devtools__navigate_page = async (params: any) => {
    return await client.call('chrome-devtools/navigate-page', params);
  };

  (global as any).mcp__chrome_devtools__take_snapshot = async (params: any) => {
    return await client.call('chrome-devtools/take-snapshot', params);
  };

  (global as any).mcp__chrome_devtools__click = async (params: any) => {
    return await client.call('chrome-devtools/click', params);
  };

  (global as any).mcp__chrome_devtools__fill = async (params: any) => {
    return await client.call('chrome-devtools/fill', params);
  };

  (global as any).mcp__chrome_devtools__hover = async (params: any) => {
    return await client.call('chrome-devtools/hover', params);
  };

  (global as any).mcp__chrome_devtools__press_key = async (params: any) => {
    return await client.call('chrome-devtools/press-key', params);
  };

  (global as any).mcp__chrome_devtools__wait_for = async (params: any) => {
    return await client.call('chrome-devtools/wait-for', params);
  };

  (global as any).mcp__chrome_devtools__evaluate_script = async (params: any) => {
    return await client.call('chrome-devtools/evaluate-script', params);
  };

  (global as any).mcp__chrome_devtools__take_screenshot = async (params: any) => {
    return await client.call('chrome-devtools/take-screenshot', params);
  };

  console.log('✅ MCP tools injected into global scope');
}

/**
 * Clean up MCP client
 */
export async function cleanupMCPClient(): Promise<void> {
  if (globalMCPClient) {
    await globalMCPClient.disconnect();
    globalMCPClient = null;
  }
}
