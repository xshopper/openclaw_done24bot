# done24bot MCP Server

**Created:** 2026-02-15  
**Status:** Installed and configured

---

## Overview

MCP (Model Context Protocol) server that exposes done24bot browser automation capabilities as standardized tools that can be used by AI assistants and other MCP clients.

## Installation

✅ **Installed at:** `/home/gbacs/.openclaw/workspace/skills/done24bot/mcp-server.js`  
✅ **Configured in:** `/home/gbacs/.openclaw/workspace/config/mcporter.json`  
✅ **API Endpoint:** http://127.0.0.1:9223

## Available Tools

The MCP server exposes 10 browser automation tools:

### Navigation
- **navigate** - Navigate to a URL
- **status** - Get browser connection status

### Content Extraction
- **snapshot** - Get page text content
- **html** - Get raw HTML
- **elements** - List interactive elements

### Interaction
- **click** - Click an element
- **type** - Type into input field
- **wait** - Wait for element or condition

### Advanced
- **screenshot** - Capture page screenshot
- **evaluate** - Execute JavaScript

---

## Usage

### List Available Tools

```bash
mcporter list done24bot
```

### Call a Tool

```bash
# Navigate to a URL
mcporter call done24bot.navigate url=https://example.com

# Get page content
mcporter call done24bot.snapshot

# Click an element
mcporter call 'done24bot.click(text: "Submit")'

# Type into a field
mcporter call 'done24bot.type(selector: "#email", text: "user@example.com")'

# Take screenshot
mcporter call 'done24bot.screenshot(path: "/tmp/page.png")'

# Execute JavaScript
mcporter call 'done24bot.evaluate(script: "document.title")'

# Check connection status
mcporter call done24bot.status
```

### Function Syntax Examples

```bash
# Simple parameter
mcporter call done24bot.navigate(url: "https://google.com")

# Multiple parameters
mcporter call 'done24bot.type(selector: "input[name=q]", text: "OpenClaw", submit: true)'

# With JSON args
mcporter call done24bot.click --args '{"selector":"#submit-btn"}'
```

---

## Configuration

**File:** `/home/gbacs/.openclaw/workspace/config/mcporter.json`

```json
{
  "mcpServers": {
    "done24bot": {
      "command": "node",
      "args": [
        "/home/gbacs/.openclaw/workspace/skills/done24bot/mcp-server.js"
      ],
      "env": {
        "DONE24BOT_API": "http://127.0.0.1:9223"
      }
    }
  }
}
```

### Environment Variables

- **DONE24BOT_API** - done24bot HTTP API endpoint (default: http://127.0.0.1:9223)

---

## Prerequisites

**done24bot browser server must be running:**

```bash
# Check if running
curl http://127.0.0.1:9223

# Start if needed (see done24bot SKILL.md)
node ~/.openclaw/workspace/skills/done24bot/scripts/browser-server.js
```

---

## Integration with OpenClaw

The MCP server can be used:

1. **Via mcporter CLI** - Direct command-line tool calls
2. **Via MCP clients** - Any tool that supports the Model Context Protocol
3. **Via AI assistants** - Exposed as callable tools in AI conversations

### Use in AI Conversations

When the MCP server is running, AI assistants can call browser automation tools like:

```
"Navigate to https://example.com and extract the page content"
→ calls done24bot.navigate + done24bot.snapshot

"Click the Submit button on the form"
→ calls done24bot.click

"Take a screenshot of the current page"
→ calls done24bot.screenshot
```

---

## Testing

### Test Connection

```bash
# Check MCP server is configured
mcporter list done24bot

# Test status tool
mcporter call done24bot.status
```

### Full Test Sequence

```bash
# 1. Start done24bot server (if not running)
# node ~/.openclaw/workspace/skills/done24bot/scripts/browser-server.js &

# 2. Navigate to a page
mcporter call done24bot.navigate url=https://example.com

# 3. Get page content
mcporter call done24bot.snapshot

# 4. List interactive elements
mcporter call done24bot.elements limit:10

# 5. Take screenshot
mcporter call 'done24bot.screenshot(path: "/tmp/test.png")'
```

---

## Troubleshooting

### "done24bot API error: connect ECONNREFUSED"

**Cause:** done24bot browser server is not running  
**Fix:** Start the browser server:

```bash
node ~/.openclaw/workspace/skills/done24bot/scripts/browser-server.js
```

### "Unknown method"

**Cause:** MCP protocol mismatch  
**Fix:** Ensure mcporter version 0.7+ is installed:

```bash
mcporter --version  # should be 0.7.3+
```

### Tools Not Showing

**Cause:** Server not properly configured  
**Fix:** Check configuration:

```bash
mcporter config get done24bot
```

---

## Architecture

```
┌─────────────────┐
│  MCP Client     │ (mcporter, AI assistant, etc.)
│  (JSON-RPC)     │
└────────┬────────┘
         │ stdio
         ↓
┌─────────────────┐
│  mcp-server.js  │ (MCP Protocol Handler)
│  (Node.js)      │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  done24bot API  │ (Browser Control)
│  :9223          │
└────────┬────────┘
         │ WebSocket/CDP
         ↓
┌─────────────────┐
│  Browser        │ (Chrome/Brave)
│  (Remote)       │
└─────────────────┘
```

---

## Related Files

- **MCP Server:** `/home/gbacs/.openclaw/workspace/skills/done24bot/mcp-server.js`
- **Config:** `/home/gbacs/.openclaw/workspace/config/mcporter.json`
- **done24bot Skill:** `/home/gbacs/.openclaw/workspace/skills/done24bot/SKILL.md`
- **Browser Server:** `/home/gbacs/.openclaw/workspace/skills/done24bot/scripts/browser-server.js`

---

## Version History

**1.0.0** (2026-02-15)
- Initial MCP server implementation
- 10 browser automation tools
- Stdio transport
- done24bot HTTP API integration

---

**Created:** 2026-02-15  
**Status:** ✅ Installed and working  
**MCP Version:** 2024-11-05  
**mcporter Version:** 0.7.3
