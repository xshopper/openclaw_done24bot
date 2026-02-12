---
name: done24bot
description: Remote browser automation client for done24bot service. Connect to your done24bot server, auto-fetch WebSocket config from amplify_outputs.json, and automate web interactions via HTTP API. Supports flexible authentication via DONE24BOT_API_KEY or ADDON_SESSION_ID. Use for web scraping, form filling, UI testing, screenshots, and JavaScript evaluation. Required: DONE24BOT_SERVER + (DONE24BOT_API_KEY or ADDON_SESSION_ID).
---

# done24bot - Browser Automation Client

Control a remote done24bot service via HTTP API. Automatic configuration from amplify_outputs.json.

## Quick Start (30 seconds)

### 1. Install Dependencies

```bash
cd ~/.openclaw/workspace/skills/done24bot

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

**Expected output:**
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

### 4. Test

In another terminal:

```bash
# Check status
curl http://127.0.0.1:9222

# Navigate to website
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "navigate", "url": "https://example.com"}'

# Get page content
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "snapshot"}'
```

## Configuration

### Required

- **`DONE24BOT_SERVER`** - Base URL of your done24bot server (with trailing slash)
  ```bash
  export DONE24BOT_SERVER="http://192.168.50.78:4200/"
  ```

### Authentication (Choose One)

- **`ADDON_SESSION_ID`** - Addon session ID (recommended, passed as `?addonSessionId=` parameter)
  ```bash
  export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
  ```

- **`DONE24BOT_API_KEY`** - API key (alternative, passed as `?apiKey=` parameter)
  ```bash
  export DONE24BOT_API_KEY="addon-1770732525816-wqcmdh1ua"
  ```

**Note:** Both parameters work with addon session IDs. Use `ADDON_SESSION_ID` for clarity, or `DONE24BOT_API_KEY` for backward compatibility. If both are set, `ADDON_SESSION_ID` takes priority.

### Optional

- **`HTTP_PORT`** - Local HTTP server port (default: `9222`)
  ```bash
  export HTTP_PORT=9222
  ```

## How It Works

```
1. Client starts
2. Reads DONE24BOT_SERVER and authentication (ADDON_SESSION_ID or DONE24BOT_API_KEY)
3. Fetches $DONE24BOT_SERVER/amplify_outputs.json
4. Extracts WebSocket endpoint from:
   custom.WEBSOCKET_API.endpoint + "/" + custom.WEBSOCKET_API.stageName
5. Connects to WebSocket with authentication parameter:
   - If ADDON_SESSION_ID set: ws://...?addonSessionId=addon-xxxxx
   - If DONE24BOT_API_KEY set: ws://...?apiKey=addon-xxxxx
6. Waits for "session-connected" message from server
7. Tracks session ID and connection state
8. Listens for HTTP requests on 127.0.0.1:$HTTP_PORT
9. Proxies browser actions through HTTP → WebSocket
```

## Supported Actions

### Navigation

- **`navigate`** - Load a URL
- **`back`** - Go back
- **`forward`** - Go forward
- **`reload`** - Reload page

### Content Extraction

- **`snapshot`** - Get page text
- **`html`** - Get raw HTML
- **`elements`** - List interactive elements

### Interaction

- **`click`** - Click element
- **`type`** - Type into input
- **`scroll`** - Scroll page
- **`wait`** - Wait for element/text

### Media

- **`screenshot`** - Capture page

### Advanced

- **`evaluate`** - Run JavaScript
- **`console`** - Get console messages
- **`status`** - Server status (includes WebSocket connection state and session ID)
- **`sessionInfo`** - Detailed session information (connection state, session IDs, endpoints)
- **`close`** - Close browser

## Examples

### Navigate and Extract

```bash
# Navigate
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "navigate", "url": "https://example.com"}'

# Get content
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "snapshot"}'
```

### Fill Form

```bash
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "type", "selector": "input[name=email]", "text": "user@example.com"}'

curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "click", "text": "Submit"}'
```

### Take Screenshot

```bash
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "screenshot", "path": "/tmp/page.png", "fullPage": true}'
```

### Check Session Info

```bash
# Get detailed session information
curl -X POST http://127.0.0.1:9222 \
  -d '{"action": "sessionInfo"}'

# Response includes:
# - connected: WebSocket connection state
# - sessionId: Session ID from server
# - wsEndpoint: WebSocket endpoint
# - addonSessionId: Masked addon session ID
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DONE24BOT_SERVER` | Yes | (none) | Server base URL (with trailing slash) |
| `ADDON_SESSION_ID` | One required | (none) | Addon session ID (passed as `?addonSessionId=`) |
| `DONE24BOT_API_KEY` | One required | (none) | Alternative auth (passed as `?apiKey=`) |
| `HTTP_PORT` | No | `9222` | Local HTTP server port |

### Example Configuration

```bash
# Connect with API Key
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export DONE24BOT_API_KEY="your-api-key-here"

# Connect with SessionId
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"

# With custom port
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export DONE24BOT_API_KEY="your-api-key-here"
export HTTP_PORT=9223
```

### Persistent Configuration (.env.local)

```bash
# .env.local
DONE24BOT_SERVER=http://192.168.50.78:4200/
DONE24BOT_API_KEY=your-api-key-here
HTTP_PORT=9222
```

Load and start:

```bash
set -a && source .env.local && set +a
npm start
```

## Requirements

- Node.js 14+
- Puppeteer (installed via npm, Chromium skipped)
- Network access to done24bot server
- amplify_outputs.json available at: `$DONE24BOT_SERVER/amplify_outputs.json`

## Troubleshooting

**Connection failed?**

1. Check DONE24BOT_SERVER is set:
   ```bash
   echo $DONE24BOT_SERVER
   ```

2. Test if server is accessible:
   ```bash
   curl $DONE24BOT_SERVER/amplify_outputs.json | jq .
   ```

3. Verify JSON structure has `custom.WEBSOCKET_API.endpoint`

See `references/TROUBLESHOOTING.md` for more help.

## See Also

- **Usage Guide**: [USAGE.md](USAGE.md) - Complete browser automation examples
- **Installation**: [INSTALL.md](INSTALL.md) - Installation guide
- **Scripts**: [scripts/README.md](scripts/README.md) - Scripts documentation
- **Architecture**: `references/ARCHITECTURE.md`
- **Examples**: `references/EXAMPLES.md`
- **Amplify Config**: `references/AMPLIFY_CONFIG.md`
- **Troubleshooting**: `references/TROUBLESHOOTING.md`
