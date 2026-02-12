#!/usr/bin/env node

/**
 * done24bot Browser Client
 * Connects to remote done24bot service via WebSocket
 * Auto-fetches config from DONE24BOT_SERVER/amplify_outputs.json
 */

const http = require('http');
const https = require('https');
const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const PuppeteerActions = require('./puppeteer-actions');

const DONE24BOT_SERVER = process.env.DONE24BOT_SERVER || '';
const HTTP_PORT = process.env.HTTP_PORT || 9222;
const DONE24BOT_API_KEY = process.env.DONE24BOT_API_KEY || ''; // Optional: can be used as ?apiKey parameter
const ADDON_SESSION_ID = process.env.ADDON_SESSION_ID || ''; // Optional: can be used as ?addonSessionId parameter (preferred)

let BROWSER_WS_ENDPOINT = '';
let API_KEY = DONE24BOT_API_KEY; // Start with env var
let ws = null; // Raw WebSocket connection
let SESSION_ID = null;
let SESSION_CONNECTED = false;
let browser = null; // Puppeteer browser instance

// Puppeteer actions handler
const actions = new PuppeteerActions();

/**
 * Fetch and parse amplify_outputs.json from DONE24BOT_SERVER
 */
async function loadAmplifyConfig() {
  if (!DONE24BOT_SERVER) {
    console.error('❌ DONE24BOT_SERVER not set');
    console.error('   Set it: export DONE24BOT_SERVER="http://192.168.50.78:4200/"');
    process.exit(1);
  }

  const configUrl = DONE24BOT_SERVER.replace(/\/$/, '') + '/amplify_outputs.json';

  try {
    console.log(`→ Fetching configuration from ${configUrl}...`);
    
    const config = await new Promise((resolve, reject) => {
      const protocol = configUrl.startsWith('https') ? https : http;
      protocol.get(configUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON: ' + e.message));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });

    // Extract WebSocket endpoint from amplify_outputs.json
    // Look for: custom.WEBSOCKET_API.endpoint + custom.WEBSOCKET_API.stageName
    if (!config.custom?.WEBSOCKET_API?.endpoint) {
      throw new Error('No custom.WEBSOCKET_API.endpoint found in amplify_outputs.json');
    }

    const endpoint = config.custom.WEBSOCKET_API.endpoint;
    const stageName = config.custom.WEBSOCKET_API.stageName || 'prod';
    
    // Format: wss://... + /stageName
    // Replace local.done24bot.com with actual IP if needed
    let wsEndpoint = endpoint.replace(/\/$/, '') + '/' + stageName;
    if (wsEndpoint.includes('local.done24bot.com')) {
      const serverHost = new URL(DONE24BOT_SERVER).hostname;
      wsEndpoint = wsEndpoint.replace('local.done24bot.com', serverHost);
    }
    BROWSER_WS_ENDPOINT = wsEndpoint;

    // Extract API key from config (if not already set via env var)
    if (!API_KEY && config.custom?.done24bot?.apiKey) {
      API_KEY = config.custom.done24bot.apiKey;
    }

    console.log('✓ Configuration loaded successfully');
    console.log(`  Server: ${DONE24BOT_SERVER}`);
    console.log(`  WebSocket: ${BROWSER_WS_ENDPOINT}`);

    // Show authentication method
    if (ADDON_SESSION_ID) {
      console.log(`  Auth: addonSessionId=***${ADDON_SESSION_ID.slice(-6)} (from ADDON_SESSION_ID env var)`);
    } else if (API_KEY) {
      const source = DONE24BOT_API_KEY ? '(from DONE24BOT_API_KEY env var)' : '(from amplify_outputs.json)';
      console.log(`  Auth: apiKey=***${API_KEY.slice(-6)} ${source}`);
    } else {
      console.log(`  Auth: (none - public access)`);
    }

  } catch (err) {
    console.error(`❌ Failed to load configuration: ${err.message}`);
    console.error(`\nMake sure:`);
    console.error(`  1. DONE24BOT_SERVER is set: ${DONE24BOT_SERVER}`);
    console.error(`  2. Server is accessible at: ${DONE24BOT_SERVER}`);
    console.error(`  3. amplify_outputs.json exists at: ${configUrl}`);
    console.error(`  4. JSON contains: custom.WEBSOCKET_API.endpoint`);
    process.exit(1);
  }
}

async function connectRawWebSocket() {
  return new Promise((resolve, reject) => {
    if (!BROWSER_WS_ENDPOINT) {
      reject(new Error('No WebSocket endpoint configured'));
      return;
    }

    // Build WebSocket URL with query parameters
    // Authentication is flexible: can use either apiKey or addonSessionId parameter
    // Priority: ADDON_SESSION_ID -> DONE24BOT_API_KEY
    let wsUrl = BROWSER_WS_ENDPOINT;
    const params = [];

    if (ADDON_SESSION_ID) {
      // Prefer addonSessionId parameter if set
      params.push(`addonSessionId=${ADDON_SESSION_ID}`);
    } else if (API_KEY) {
      // Fallback to apiKey parameter
      params.push(`apiKey=${API_KEY}`);
    }

    if (params.length > 0) {
      wsUrl += (BROWSER_WS_ENDPOINT.includes('?') ? '&' : '?') + params.join('&');
    }

    console.log(`→ Connecting via WebSocket: ${wsUrl.split('?')[0]}${params.length > 0 ? '?' + params.map(p => p.split('=')[0] + '=***').join('&') : ''}`);

    ws = new WebSocket(wsUrl);
    SESSION_CONNECTED = false;

    ws.on('open', () => {
      console.log('✓ WebSocket connection opened');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle session-connected message
        if (message.messageType === 'session-connected') {
          SESSION_ID = message.sessionId;
          SESSION_CONNECTED = true;
          console.log('✓ Session connected:', message.sessionId);
          if (message.addonSessionId) {
            console.log('  Addon Session:', message.addonSessionId);
          }
          resolve(ws);
        }
        // Log other incoming messages (except ping/pong)
        else if (message.messageType !== 'ping' && message.messageType !== 'pong') {
          console.log('← Received:', message.messageType || 'message');
          if (message.messageType === 'error') {
            console.error('  Error:', message.error, message.details || '');
          }
        }
      } catch (err) {
        console.log('← Received (non-JSON):', data.toString().slice(0, 200));
      }
    });

    ws.on('error', (err) => {
      console.error('✗ WebSocket connection error:', err.message);
      console.error('   Error details:', {
        code: err.code,
        errno: err.errno,
        syscall: err.syscall
      });
      reject(err);
    });

    ws.on('close', (code, reason) => {
      console.log('\n⚠️  WebSocket connection closed');
      console.log('   Close code:', code);
      console.log('   Close reason:', reason ? reason.toString() : '(no reason provided)');
      console.log('   Timestamp:', new Date().toISOString());
      console.log('   Previous session ID:', SESSION_ID || '(none)');
      console.log('   Connection was active:', SESSION_CONNECTED ? 'Yes' : 'No');

      SESSION_CONNECTED = false;
      SESSION_ID = null;
      ws = null;

      console.log('   → WebSocket state reset\n');
    });

    // Timeout after 10 seconds for connection
    setTimeout(() => {
      if (ws?.readyState === WebSocket.CONNECTING) {
        reject(new Error('WebSocket connection timeout'));
        ws?.close();
      } else if (!SESSION_CONNECTED) {
        reject(new Error('Session connection timeout - no session-connected message received'));
        ws?.close();
      }
    }, 10000);
  });
}

async function ensureBrowser() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('→ Connecting to done24bot service...');

    try {
      ws = await connectRawWebSocket();

      // Try to wrap with Puppeteer if possible
      try {
        // Puppeteer's connect expects a CDP endpoint
        // Use the raw WS connection for CDP communication
        browser = await puppeteer.connect({
          browserWSEndpoint: BROWSER_WS_ENDPOINT,
          protocolTimeout: 10000, // Increased timeout
        });

        // Initialize Puppeteer actions with browser
        await actions.initialize(browser);

        console.log('✓ Connected to done24bot service');
      } catch (puppeteerErr) {
        // If Puppeteer connection fails, we still have raw WS
        console.log('\n⚠️  Puppeteer connection failed');
        console.error('   Error:', puppeteerErr.message);
        console.error('   WebSocket endpoint:', BROWSER_WS_ENDPOINT);
        console.log('   → Using raw WebSocket mode');
        console.log('✓ Raw WebSocket connection established\n');
      }
    } catch (err) {
      console.error('✗ Failed to connect:', err.message);
      throw err;
    }
  }

  return { browser, page: actions.page, ws };
}

async function handleAction(action, params) {
  // Ensure browser is connected
  await ensureBrowser();

  // Build session info for status and sessionInfo actions
  const sessionInfo = {
    connected: SESSION_CONNECTED,
    wsConnected: ws?.readyState === WebSocket.OPEN,
    sessionId: SESSION_ID,
    server: DONE24BOT_SERVER,
    wsEndpoint: BROWSER_WS_ENDPOINT,
    hasApiKey: !!API_KEY,
    hasAddonSessionId: !!ADDON_SESSION_ID,
    addonSessionId: ADDON_SESSION_ID ? `***${ADDON_SESSION_ID.slice(-6)}` : null
  };

  // Execute action using PuppeteerActions
  return await actions.execute(action, params, sessionInfo);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'GET') {
    try {
      const status = await handleAction('status', {});
      const response = JSON.stringify({ status: 'ok', ...status });
      res.writeHead(200);
      res.end(response);
    } catch (err) {
      console.error('GET error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let action = '(unknown)';
    try {
      const parsed = JSON.parse(body || '{}');
      action = parsed.action || '(missing)';
      const params = { ...parsed };
      delete params.action;

      if (!parsed.action) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing action' }));
        return;
      }

      const result = await handleAction(action, params);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('\n✗ Action failed:', action);
      console.error('   Error:', err.message);
      console.error('   WebSocket connected:', ws?.readyState === WebSocket.OPEN ? 'Yes' : 'No');
      console.error('   Browser connected:', browser?.isConnected() ? 'Yes' : 'No');
      console.error('   Session active:', SESSION_CONNECTED ? 'Yes' : 'No');
      console.error('   Timestamp:', new Date().toISOString());

      // Check if error is due to disconnection
      if (err.message.includes('disconnected') || err.message.includes('closed') ||
          err.message.includes('Target closed') || err.message.includes('Session closed')) {
        console.error('   → Error appears to be due to disconnection\n');
      } else {
        console.error('');
      }

      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
});

// Find available port (try current port, then increment)
let currentPort = HTTP_PORT;

async function startServer() {
  server.listen(currentPort, '127.0.0.1', async () => {
    console.log(`\n🌐 Browser server listening on http://127.0.0.1:${currentPort}\n`);
    
    if (currentPort !== HTTP_PORT) {
      console.log(`ℹ️  Original port ${HTTP_PORT} was in use, using ${currentPort} instead\n`);
    }
    
    // Load configuration
    await loadAmplifyConfig();
    
    // Ensure browser is connected
    await ensureBrowser();
    
    console.log(`\n✓ Ready for browser actions on http://127.0.0.1:${currentPort}\n`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${currentPort} is in use, trying ${currentPort + 1}...`);
      currentPort++;
      server.close();
      // Try next port
      startServer();
    } else {
      console.error('✗ Server error:', err.message);
      process.exit(1);
    }
  });
}

startServer();

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  if (actions.browser) await actions.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (actions.browser) await actions.close();
  process.exit(0);
});
