#!/usr/bin/env node
/**
 * MCP Server for done24bot Browser Automation
 * Exposes browser automation capabilities as MCP tools
 */

const http = require('http');

const DONE24BOT_API = process.env.DONE24BOT_API || 'http://127.0.0.1:9223';

// MCP Server Implementation
class Done24BotMCPServer {
  constructor() {
    this.tools = this.defineTools();
  }

  defineTools() {
    return [
      {
        name: 'navigate',
        description: 'Navigate to a URL in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to navigate to'
            },
            waitUntil: {
              type: 'string',
              enum: ['load', 'domcontentloaded', 'networkidle'],
              description: 'When to consider navigation complete'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'snapshot',
        description: 'Get the current page text content',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'html',
        description: 'Get the raw HTML of the current page',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'click',
        description: 'Click an element on the page',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text content of element to click'
            },
            selector: {
              type: 'string',
              description: 'CSS selector of element to click'
            }
          }
        }
      },
      {
        name: 'type',
        description: 'Type text into an input field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector of input element'
            },
            text: {
              type: 'string',
              description: 'Text to type'
            },
            clear: {
              type: 'boolean',
              description: 'Clear field before typing'
            },
            submit: {
              type: 'boolean',
              description: 'Press Enter after typing'
            }
          },
          required: ['selector', 'text']
        }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to save screenshot'
            },
            fullPage: {
              type: 'boolean',
              description: 'Capture full page'
            }
          }
        }
      },
      {
        name: 'elements',
        description: 'List interactive elements on the page',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of elements to return'
            }
          }
        }
      },
      {
        name: 'wait',
        description: 'Wait for an element or condition',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector to wait for'
            },
            text: {
              type: 'string',
              description: 'Text content to wait for'
            },
            ms: {
              type: 'number',
              description: 'Milliseconds to wait'
            }
          }
        }
      },
      {
        name: 'evaluate',
        description: 'Execute JavaScript in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'JavaScript code to execute'
            }
          },
          required: ['script']
        }
      },
      {
        name: 'status',
        description: 'Get browser connection status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async callTool(name, args) {
    const action = name;
    const payload = { action, ...args };

    return new Promise((resolve, reject) => {
      const url = new URL(DONE24BOT_API);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve({ text: data });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`done24bot API error: ${error.message}`));
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  async handleListTools() {
    return {
      tools: this.tools
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args } = params;
    
    try {
      const result = await this.callTool(name, args || {});
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async handleRequest(method, params) {
    switch (method) {
      case 'tools/list':
        return this.handleListTools();
      case 'tools/call':
        return this.handleCallTool(params);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}

// Stdio MCP Server
async function main() {
  const server = new Done24BotMCPServer();
  
  process.stdin.setEncoding('utf8');
  
  let buffer = '';
  
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const request = JSON.parse(line);
        const { jsonrpc, id, method, params } = request;
        
        if (method === 'initialize') {
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'done24bot',
                version: '1.0.0'
              }
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (method === 'notifications/initialized') {
          // No response needed for notification
        } else {
          const result = await server.handleRequest(method, params);
          const response = {
            jsonrpc: '2.0',
            id,
            result
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (error) {
        const response = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: error.message
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  });
  
  process.stdin.on('end', () => {
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}

module.exports = { Done24BotMCPServer };
