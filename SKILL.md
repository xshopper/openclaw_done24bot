---
name: done24bot
description: Remote browser automation via done24bot service. Connect to a running done24bot server, control a real browser through WebSocket/CDP. Navigate pages, click elements, type text, take screenshots, extract content, and run JavaScript. Auto-discovers addon sessions from done24bot_outputs.json.
---

# done24bot Browser Automation Skill

Control a remote browser via HTTP API. Connects to your done24bot service over WebSocket using config from `done24bot_outputs.json`.

## Setup

```bash
cd {baseDir}
npm install
```

## Configuration

Set environment variables or configure in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "done24bot": {
        "env": {
          "DONE24BOT_SERVER": "https://done24bot.com",
          "ADDON_SESSION_ID": "addon-xxx"
        }
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DONE24BOT_SERVER` | Yes | - | done24bot server URL |
| `ADDON_SESSION_ID` | No | auto-discovered | Addon session ID |
| `DONE24BOT_API_KEY` | No | - | Alternative auth |
| `HTTP_PORT` | No | `9222` | Local API port |

If neither `ADDON_SESSION_ID` nor `DONE24BOT_API_KEY` is set, the client auto-discovers active addon sessions via GraphQL.

## Start

```bash
node {baseDir}/scripts/browser-server.js
```

The server starts on `http://127.0.0.1:9222` and:
1. Fetches `$DONE24BOT_SERVER/done24bot_outputs.json`
2. Extracts WebSocket endpoint from `custom.WEBSOCKET_API`
3. Connects with authentication
4. Listens for HTTP actions

## Actions

All actions via POST to `http://127.0.0.1:9222` with JSON body:

### Navigation

```bash
# Navigate to URL
curl -X POST http://127.0.0.1:9222 -d '{"action":"navigate","url":"https://example.com"}'

# Back / Forward / Reload
curl -X POST http://127.0.0.1:9222 -d '{"action":"back"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"forward"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"reload"}'
```

### Content

```bash
# Get page text
curl -X POST http://127.0.0.1:9222 -d '{"action":"snapshot"}'

# Get raw HTML
curl -X POST http://127.0.0.1:9222 -d '{"action":"html"}'

# List interactive elements
curl -X POST http://127.0.0.1:9222 -d '{"action":"elements"}'
```

### Interaction

```bash
# Click by text or selector
curl -X POST http://127.0.0.1:9222 -d '{"action":"click","text":"Submit"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"click","selector":"#btn"}'

# Type into input
curl -X POST http://127.0.0.1:9222 -d '{"action":"type","selector":"input[name=email]","text":"user@example.com"}'

# Type with clear and submit
curl -X POST http://127.0.0.1:9222 -d '{"action":"type","selector":"#search","text":"query","clear":true,"submit":true}'

# Scroll
curl -X POST http://127.0.0.1:9222 -d '{"action":"scroll","direction":"down"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"scroll","selector":"#footer"}'

# Wait for element or text
curl -X POST http://127.0.0.1:9222 -d '{"action":"wait","selector":".results"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"wait","text":"Loading complete"}'
```

### Media & Advanced

```bash
# Screenshot
curl -X POST http://127.0.0.1:9222 -d '{"action":"screenshot","path":"/tmp/page.png"}'

# Run JavaScript
curl -X POST http://127.0.0.1:9222 -d '{"action":"evaluate","script":"document.title"}'

# Console messages
curl -X POST http://127.0.0.1:9222 -d '{"action":"console"}'

# Status / Session info
curl http://127.0.0.1:9222
curl -X POST http://127.0.0.1:9222 -d '{"action":"sessionInfo"}'
```

## Action Reference

| Action | Params | Description |
|--------|--------|-------------|
| `navigate` | `url`, `waitUntil?`, `timeout?` | Load URL |
| `back` | - | Go back |
| `forward` | - | Go forward |
| `reload` | - | Reload page |
| `snapshot` | - | Get page text |
| `html` | - | Get raw HTML |
| `elements` | `limit?` | List interactive elements |
| `click` | `text?` or `selector?` | Click element |
| `type` | `selector`, `text`, `clear?`, `submit?`, `delay?` | Type into input |
| `scroll` | `direction?` or `selector?` | Scroll page |
| `wait` | `selector?`, `text?`, `ms?`, `timeout?` | Wait for condition |
| `screenshot` | `path?`, `fullPage?` | Take screenshot |
| `evaluate` | `script` | Run JavaScript |
| `console` | `level?` | Get console messages |
| `status` | - | Connection status |
| `sessionInfo` | - | Session details |
| `newPage` | - | Open new tab |
| `close` | - | Close browser |
