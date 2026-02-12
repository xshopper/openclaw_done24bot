# done24bot Browser Client

Remote browser automation client for done24bot service.

## Architecture

The browser client is split into two modules for clean separation of concerns:

**Server Layer (`browser-server.js`):**
- HTTP server for REST API
- WebSocket connection management
- Session authentication and tracking
- Request routing and coordination

**Automation Layer (`puppeteer-actions.js`):**
- Puppeteer wrapper functions
- Browser automation actions (CDP)
- Console message tracking
- Page lifecycle management

This architecture provides:
- ✅ Clean separation between server and automation logic
- ✅ Easier testing and maintenance
- ✅ Reusable Puppeteer action wrappers
- ✅ Single responsibility per module

## Main Scripts

### browser-server.js
Main browser client that connects to done24bot service and provides HTTP API.

**Usage:**
```bash
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
node scripts/browser-server.js
```

Or use npm:
```bash
npm start
```

**Features:**
- Auto-fetches configuration from `amplify_outputs.json`
- Connects to WebSocket with session authentication
- Provides HTTP API on port 9222 (configurable)
- Tracks session ID and connection state

### puppeteer-actions.js
Puppeteer wrapper module providing browser automation functions.

**Exports:**
- `PuppeteerActions` class with methods for all CDP actions
- Navigation: `navigate()`, `back()`, `forward()`, `reload()`
- Content: `snapshot()`, `html()`, `elements()`
- Interaction: `click()`, `type()`, `scroll()`, `wait()`
- Media: `screenshot()`
- Advanced: `evaluate()`, `console()`, `status()`, `sessionInfo()`
- Browser: `newPage()`, `close()`

**Usage:**
```javascript
const PuppeteerActions = require('./puppeteer-actions');
const actions = new PuppeteerActions();
await actions.initialize(browser);
const result = await actions.navigate({ url: 'https://example.com' });
```

### setup.sh
Interactive setup script for installing dependencies and testing connection.

**Usage:**
```bash
./scripts/setup.sh
```

## Test Scripts

### test-browser-api.js
Tests the browser-server.js HTTP API endpoints.

**Prerequisites:**
- browser-server.js must be running

**Usage:**
```bash
# Start browser-server first (in another terminal)
DONE24BOT_SERVER="http://192.168.50.78:4200/" \
ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua" \
npm start

# Then run the test
node scripts/test-browser-api.js
```

**Custom port:**
```bash
HTTP_PORT=9223 node scripts/test-browser-api.js
```

**What it tests:**
1. GET / - Server status endpoint
2. POST status - Browser status action
3. POST sessionInfo - Session information action

**Output:**
```
Browser Information:
  Connected: Yes
  WebSocket: Connected
  Session ID: puppeteer-1770797279788-dooat1rp4
  Server: http://192.168.50.78:4200/
  WebSocket Endpoint: ws://192.168.50.78:10223/ws/prod
  Addon Session ID: ***mdh1ua
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DONE24BOT_SERVER` | Yes | (none) | Server base URL with trailing slash |
| `ADDON_SESSION_ID` | One required | (none) | Addon session ID (recommended) |
| `DONE24BOT_API_KEY` | One required | (none) | Alternative authentication |
| `HTTP_PORT` | No | 9222 | Local HTTP server port |

## Quick Start

1. **Install dependencies:**
   ```bash
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   ```

2. **Start browser-server:**
   ```bash
   export DONE24BOT_SERVER="http://192.168.50.78:4200/"
   export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
   npm start
   ```

3. **Test the API:**
   ```bash
   # In another terminal
   node scripts/test-browser-api.js
   ```

4. **Use the API:**
   ```bash
   # Get status
   curl http://127.0.0.1:9222

   # Get session info
   curl -X POST http://127.0.0.1:9222 \
     -H "Content-Type: application/json" \
     -d '{"action": "sessionInfo"}'
   ```

## Troubleshooting

**Connection refused:**
- Make sure browser-server.js is running
- Check the port with `HTTP_PORT` environment variable

**Authentication failed:**
- Verify `ADDON_SESSION_ID` or `DONE24BOT_API_KEY` is set
- Check server is accessible: `curl http://192.168.50.78:4200/amplify_outputs.json`


See [../INSTALL.md](../INSTALL.md) for full installation guide.
See [../SKILL.md](../SKILL.md) for complete API documentation.
See [../USAGE.md](../USAGE.md) for browser automation functionalities.
