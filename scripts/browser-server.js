#!/usr/bin/env node

/**
 * openclaw_done24bot Browser Client
 * Connects to remote done24bot service via WebSocket
 * Auto-fetches config from DONE24BOT_SERVER/done24bot_outputs.json
 */

const http = require('http');
const puppeteer = require('puppeteer-core');
const PuppeteerActions = require('./puppeteer-actions');

const DONE24BOT_SERVER = process.env.DONE24BOT_SERVER || '';
const HTTP_PORT = parseInt(process.env.HTTP_PORT, 10) || 9222;
const DONE24BOT_API_KEY = process.env.DONE24BOT_API_KEY || '';

// Mutable - can be set via env or auto-discovered
let addonSessionId = process.env.ADDON_SESSION_ID || '';
let apiKey = DONE24BOT_API_KEY;

let BROWSER_WS_ENDPOINT = '';
let browser = null;
let reconnectTimer = null;
let reconnectDelay = 5000;
const RECONNECT_MAX_DELAY = 60000;
let config = null;

const actions = new PuppeteerActions();

/**
 * Fetch and parse done24bot_outputs.json from DONE24BOT_SERVER
 */
async function loadConfig() {
  if (!DONE24BOT_SERVER) {
    console.error('DONE24BOT_SERVER not set');
    console.error('   Set it: export DONE24BOT_SERVER="https://done24bot.com"');
    process.exit(1);
  }

  const configUrl = DONE24BOT_SERVER.replace(/\/$/, '') + '/done24bot_outputs.json';

  try {
    console.log(`Fetching configuration from ${configUrl}...`);

    const response = await fetch(configUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    config = await response.json();

    if (!config.custom?.WEBSOCKET_API?.endpoint) {
      throw new Error('No custom.WEBSOCKET_API.endpoint found in done24bot_outputs.json');
    }

    const endpoint = config.custom.WEBSOCKET_API.endpoint;
    const stageName = config.custom.WEBSOCKET_API.stageName || '';

    let wsEndpoint = endpoint.replace(/\/$/, '');
    if (stageName) {
      wsEndpoint += '/' + stageName;
    }

    BROWSER_WS_ENDPOINT = wsEndpoint;

    // Extract API key from config data section (for auto-discovery fallback)
    if (!apiKey && config.data?.api_key) {
      apiKey = config.data.api_key;
    }

    console.log('Configuration loaded');
    console.log(`  Server: ${DONE24BOT_SERVER}`);
    console.log(`  WebSocket: ${BROWSER_WS_ENDPOINT}`);

    if (addonSessionId) {
      console.log(`  Auth: addonSessionId=***${addonSessionId.slice(-6)}`);
    } else if (apiKey) {
      console.log(`  Auth: apiKey=***${apiKey.slice(-6)}`);
    } else {
      console.log(`  Auth: (none - will auto-discover)`);
    }

    return config;
  } catch (err) {
    console.error(`Failed to load configuration: ${err.message}`);
    console.error(`\nMake sure:`);
    console.error(`  1. DONE24BOT_SERVER is set: ${DONE24BOT_SERVER}`);
    console.error(`  2. Server is accessible`);
    console.error(`  3. done24bot_outputs.json exists at: ${configUrl}`);
    console.error(`  4. JSON contains: custom.WEBSOCKET_API.endpoint`);
    process.exit(1);
  }
}

/**
 * Auto-discover addon session ID via GraphQL API
 */
async function discoverAddonSession() {
  const graphqlUrl = config.data?.url;
  const graphqlKey = config.data?.api_key;

  if (!graphqlUrl || !graphqlKey) {
    throw new Error('No API URL/key found in config. Pass ADDON_SESSION_ID manually.');
  }

  console.log('Querying active addon sessions...');
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': graphqlKey },
    body: JSON.stringify({
      query: `query { listSessions(filter: { isActive: { eq: true }, id: { beginsWith: "addon-" } }) { items { id } } }`
    })
  });

  const gqlData = await response.json();
  const sessions = gqlData.data?.listSessions?.items || [];

  if (sessions.length === 0) throw new Error('No active addon sessions found');

  console.log(`Found ${sessions.length} active addon session(s): ${sessions.map(s => s.id).join(', ')}`);
  return sessions[0].id;
}

/**
 * Build the full authenticated WebSocket URL
 */
function buildBrowserWSEndpoint() {
  let wsUrl = BROWSER_WS_ENDPOINT;

  if (addonSessionId) {
    wsUrl += (wsUrl.includes('?') ? '&' : '?') + `addonSessionId=${addonSessionId}`;
  } else if (apiKey) {
    wsUrl += (wsUrl.includes('?') ? '&' : '?') + `apiKey=${apiKey}`;
  }

  return wsUrl;
}

/**
 * Connect Puppeteer directly to done24bot via authenticated WebSocket
 */
async function connectBrowser() {
  const browserWSEndpoint = buildBrowserWSEndpoint();
  const maskedUrl = browserWSEndpoint.replace(/=(addon-[^&]+|[^&]{6,})/, '=***');
  console.log(`Connecting Puppeteer to: ${maskedUrl}`);

  browser = await puppeteer.connect({
    browserWSEndpoint,
    protocolTimeout: 30000,
  });

  // Single disconnected handler - only on the server side
  // (puppeteer-actions.js no longer registers its own)
  browser.on('disconnected', () => {
    console.log('Browser disconnected');
    browser = null;
    actions.browser = null;
    actions.page = null;
    scheduleReconnect();
  });

  await actions.initialize(browser);

  const version = await browser.version();
  console.log(`Connected - browser version: ${version}`);

  // Reset backoff on successful connection
  reconnectDelay = 5000;

  return browser;
}

/**
 * Schedule automatic reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (reconnectTimer) return;

  console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectBrowser();
      console.log('Reconnected successfully');
    } catch (err) {
      console.error('Reconnect failed:', err.message);
      // Exponential backoff: double delay up to max
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY);
      scheduleReconnect();
    }
  }, reconnectDelay);
}

/**
 * Ensure browser is connected, reconnect if needed
 */
async function ensureBrowser() {
  if (!browser || !browser.isConnected()) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    await connectBrowser();
  }

  return { browser, page: actions.page };
}

/**
 * Get current status without triggering reconnect
 */
function getStatus() {
  return {
    success: true,
    connected: browser?.isConnected() || false,
    wsConnected: browser?.isConnected() || false,
    sessionId: addonSessionId || null,
    puppeteerRunning: browser?.isConnected() || false,
    url: actions.page?.url() || null,
    title: null, // skip async title call for status
    server: DONE24BOT_SERVER,
    wsEndpoint: BROWSER_WS_ENDPOINT,
  };
}

async function handleAction(action, params) {
  await ensureBrowser();

  const sessionInfo = {
    connected: browser?.isConnected() || false,
    wsConnected: browser?.isConnected() || false,
    sessionId: addonSessionId || null,
    server: DONE24BOT_SERVER,
    wsEndpoint: BROWSER_WS_ENDPOINT,
    hasApiKey: !!apiKey,
    hasAddonSessionId: !!addonSessionId,
    addonSessionId: addonSessionId ? `***${addonSessionId.slice(-6)}` : null
  };

  return await actions.execute(action, params, sessionInfo);
}

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // GET status - no reconnect, just report current state
  if (req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', ...getStatus() }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  let exceeded = false;

  req.on('data', chunk => {
    body += chunk;
    if (body.length > MAX_BODY_SIZE) {
      exceeded = true;
      req.destroy();
    }
  });

  req.on('end', async () => {
    if (exceeded) {
      res.writeHead(413);
      res.end(JSON.stringify({ success: false, error: 'Request body too large' }));
      return;
    }

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
      console.error('Action failed:', action, err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
});

let currentPort = HTTP_PORT;

async function startServer() {
  server.listen(currentPort, '127.0.0.1', async () => {
    console.log(`\nBrowser server listening on http://127.0.0.1:${currentPort}\n`);

    if (currentPort !== HTTP_PORT) {
      console.log(`Original port ${HTTP_PORT} was in use, using ${currentPort} instead\n`);
    }

    // Load configuration
    await loadConfig();

    // Auto-discover addon session if no auth provided
    if (!addonSessionId && !DONE24BOT_API_KEY) {
      try {
        addonSessionId = await discoverAddonSession();
        console.log(`Using discovered addon session: ${addonSessionId}`);
      } catch (err) {
        console.error('Auto-discovery failed:', err.message);
        console.error('Set ADDON_SESSION_ID or DONE24BOT_API_KEY manually');
        process.exit(1);
      }
    }

    // Connect browser
    try {
      await connectBrowser();
      console.log(`\nReady for browser actions on http://127.0.0.1:${currentPort}\n`);
    } catch (err) {
      console.error('Initial connection failed:', err.message);
      console.error('Will retry on first request');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
      currentPort++;
      server.close();
      startServer();
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
}

startServer();

async function shutdown() {
  console.log('Shutting down...');
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (browser) browser.disconnect();
  server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
