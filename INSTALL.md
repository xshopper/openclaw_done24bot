# done24bot Installation & Quick Start

## Installation (2 minutes)

### 1. Install Dependencies

```bash
cd ~/.openclaw/workspace/skills/done24bot

# Skip Chromium download (we use remote done24bot service)
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### 2. Set Server URL and Authentication

**Option A: Using ADDON_SESSION_ID (recommended)**
```bash
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
```

**Option B: Using DONE24BOT_API_KEY**
```bash
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export DONE24BOT_API_KEY="addon-1770732525816-wqcmdh1ua"
```

### 3. Start the Client

```bash
npm start
```

**Expected Output:**
```
🌐 Browser server listening on http://127.0.0.1:9222

→ Fetching configuration from http://192.168.50.78:4200/amplify_outputs.json...
✓ Configuration loaded successfully
  Server: http://192.168.50.78:4200/
  WebSocket: ws://192.168.50.78:10223/ws/prod
  Auth: addonSessionId=***mdh1ua (from ADDON_SESSION_ID env var)
→ Connecting to done24bot service...
→ Connecting via WebSocket: ws://192.168.50.78:10223/ws/prod?addonSessionId=***
✓ WebSocket connection opened
✓ Session connected: puppeteer-1770796364472-92ek4f80j
  Addon Session: addon-1770732525816-wqcmdh1ua

✓ Ready for browser actions on http://127.0.0.1:9222
```

### 4. Test the Connection

In another terminal:

```bash
# Server status
curl http://127.0.0.1:9222

# Navigate
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "navigate", "url": "https://example.com"}'

# Get content
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "snapshot"}'
```

## Configuration

### Minimal Setup

Set server URL and authentication:

```bash
# Option A: With ADDON_SESSION_ID (recommended)
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
npm start

# Option B: With DONE24BOT_API_KEY
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export DONE24BOT_API_KEY="addon-1770732525816-wqcmdh1ua"
npm start
```

The client automatically:
1. Fetches `amplify_outputs.json` from the server
2. Extracts WebSocket endpoint from JSON
3. Connects with authentication (`?addonSessionId=` or `?apiKey=`)
4. Waits for session-connected message
5. Starts HTTP listener on 127.0.0.1:9222

### Persistent Configuration (.env.local)

Create `.env.local` (not committed to git):

```bash
# .env.local
DONE24BOT_SERVER=http://192.168.50.78:4200/

# Authentication (choose one)
ADDON_SESSION_ID=addon-1770732525816-wqcmdh1ua
# OR
# DONE24BOT_API_KEY=addon-1770732525816-wqcmdh1ua

# Optional
# HTTP_PORT=9222
```

Load and run:

```bash
set -a && source .env.local && set +a
npm start
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DONE24BOT_SERVER` | Yes | (none) | Base URL of done24bot server (with trailing slash) |
| `ADDON_SESSION_ID` | One required | (none) | Addon session ID (passed as `?addonSessionId=`) |
| `DONE24BOT_API_KEY` | One required | (none) | Alternative auth (passed as `?apiKey=`) |
| `HTTP_PORT` | No | `9222` | Local HTTP server port |

**Note:** Use either `ADDON_SESSION_ID` (recommended) or `DONE24BOT_API_KEY`. If both are set, `ADDON_SESSION_ID` takes priority.

## Common Installation Issues

### "Cannot find module 'puppeteer'"

Install Puppeteer:

```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### "DONE24BOT_SERVER not set"

Set both server and authentication:

```bash
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
npm start
```

### "Failed to load configuration"

1. **Check server is running:**
   ```bash
   curl http://192.168.50.78:4200/amplify_outputs.json | jq .
   ```

2. **Check JSON structure:**
   Should contain `custom.WEBSOCKET_API.endpoint`

3. **Check network access:**
   ```bash
   ping 192.168.50.78
   ```

## Post-Installation

✓ Dependencies installed
✓ Configuration ready (server + authentication)
✓ Server is listening on http://127.0.0.1:9222
✓ WebSocket connected with session ID
✓ Ready for browser actions

**You're ready to use it!**

**Next Steps:**
- See [USAGE.md](USAGE.md) for browser automation examples
- See [SKILL.md](SKILL.md) for full API documentation

## Uninstall

```bash
rm -rf ~/.openclaw/workspace/skills/done24bot
```

Or just remove node_modules to reinstall:

```bash
rm -rf node_modules package-lock.json
PUPPETEER_SKIP_DOWNLOAD=true npm install
```
