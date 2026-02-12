# done24bot - OpenClaw Browser Automation Skill

Remote browser automation skill for [OpenClaw](https://docs.openclaw.ai). Connects to a done24bot service via WebSocket and exposes browser control through an HTTP API.

## How It Works

```
1. Fetches done24bot_outputs.json from DONE24BOT_SERVER
2. Extracts WebSocket endpoint (custom.WEBSOCKET_API)
3. Auto-discovers addon sessions via GraphQL (or uses provided ID)
4. Connects via WebSocket with authentication
5. Wraps Puppeteer over the connection
6. Serves HTTP API on 127.0.0.1:9222
```

## Quick Start

```bash
npm install

export DONE24BOT_SERVER="http://local.done24bot.com:4200"
export ADDON_SESSION_ID="addon-xxx"  # optional, auto-discovered if omitted
npm start
```

Then in another terminal:

```bash
curl -X POST http://127.0.0.1:9222 -d '{"action":"navigate","url":"https://example.com"}'
curl -X POST http://127.0.0.1:9222 -d '{"action":"snapshot"}'
```

## OpenClaw Skill Installation

Copy to your OpenClaw skills directory:

```bash
cp -r . ~/.openclaw/skills/done24bot
cd ~/.openclaw/skills/done24bot && npm install
```

Configure in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "done24bot": {
        "env": {
          "DONE24BOT_SERVER": "http://local.done24bot.com:4200"
        }
      }
    }
  }
}
```

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | OpenClaw skill definition and API reference |
| `scripts/browser-server.js` | HTTP server + WebSocket client |
| `scripts/puppeteer-actions.js` | Puppeteer automation wrapper (18 actions) |
| `scripts/test-browser-api.js` | API test script |
| `scripts/setup.sh` | Setup helper |

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DONE24BOT_SERVER` | Yes | - | done24bot server URL |
| `ADDON_SESSION_ID` | No | auto-discovered | Addon session ID |
| `DONE24BOT_API_KEY` | No | - | Alternative auth |
| `HTTP_PORT` | No | `9222` | Local API port |

## Requirements

- Node.js 18+
- Network access to done24bot server
- `done24bot_outputs.json` available at server URL
