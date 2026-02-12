# done24bot Usage Guide

Complete guide to using the done24bot browser automation HTTP API from any HTTP client.

## Prerequisites

Browser server must be running:

```bash
export DONE24BOT_SERVER="http://192.168.50.78:4200/"
export ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua"
npm start
```

Server will be available at: `http://127.0.0.1:9222`

## Basic Usage Pattern

All browser actions follow this pattern:

```bash
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "ACTION_NAME", "param1": "value1"}'
```

## Quick Reference - CDP Actions

**Complete API reference - all JSON formats are ready to copy and use with curl or any HTTP client.**

| Action | JSON Format | Response | Description |
|--------|-------------|----------|-------------|
| **navigate** | `{"action": "navigate", "url": "https://example.com"}` | `{"success": true, "url": "https://example.com/", "title": "Example Domain", "loadTime": 1234}` | Navigate to a URL |
| **navigate** | `{"action": "navigate", "url": "https://example.com", "waitUntil": "networkidle2", "timeout": 30000}` | `{"success": true, "url": "...", "title": "..."}` | Navigate with wait condition (load, domcontentloaded, networkidle0, networkidle2) and timeout |
| **back** | `{"action": "back"}` | `{"success": true, "url": "https://previous-page.com/"}` | Go back to previous page |
| **forward** | `{"action": "forward"}` | `{"success": true, "url": "..."}` | Go forward to next page |
| **reload** | `{"action": "reload"}` | `{"success": true}` | Reload current page |
| **snapshot** | `{"action": "snapshot"}` | `{"success": true, "content": "Page text...", "url": "...", "title": "...", "length": 1256}` | Get page text content |
| **html** | `{"action": "html"}` | `{"success": true, "html": "<!DOCTYPE html>...", "url": "..."}` | Get raw HTML of page |
| **elements** | `{"action": "elements"}` | `{"success": true, "count": 15, "elements": [{"tag": "a", "text": "...", "selector": "..."}]}` | List all interactive elements (a, button, input, select, textarea) |
| **elements** | `{"action": "elements", "limit": 10}` | `{"success": true, "count": 10, "elements": [...]}` | List first N interactive elements |
| **click** | `{"action": "click", "text": "Submit"}` | `{"success": true}` | Click element by text content |
| **click** | `{"action": "click", "selector": "#submit-button"}` | `{"success": true}` | Click element by CSS selector |
| **type** | `{"action": "type", "selector": "input[name=email]", "text": "user@example.com"}` | `{"success": true}` | Type into input field |
| **type** | `{"action": "type", "selector": "#search", "text": "query", "clear": true, "submit": true}` | `{"success": true}` | Clear field, type, and press Enter |
| **type** | `{"action": "type", "selector": "#input", "text": "text", "delay": 100}` | `{"success": true}` | Type with delay (ms) between keystrokes |
| **scroll** | `{"action": "scroll", "direction": "down"}` | `{"success": true}` | Scroll down 500px |
| **scroll** | `{"action": "scroll", "direction": "up"}` | `{"success": true}` | Scroll up 500px |
| **scroll** | `{"action": "scroll", "direction": "top"}` | `{"success": true}` | Scroll to top of page |
| **scroll** | `{"action": "scroll", "direction": "bottom"}` | `{"success": true}` | Scroll to bottom of page |
| **scroll** | `{"action": "scroll", "selector": "#footer"}` | `{"success": true}` | Scroll to specific element |
| **wait** | `{"action": "wait", "selector": ".results"}` | `{"success": true}` | Wait for element to appear (default 30s timeout) |
| **wait** | `{"action": "wait", "selector": ".results", "timeout": 10000}` | `{"success": true}` | Wait for element with custom timeout (ms) |
| **wait** | `{"action": "wait", "text": "Loading complete"}` | `{"success": true}` | Wait for text to appear on page |
| **wait** | `{"action": "wait", "ms": 2000}` | `{"success": true}` | Wait for specific time (milliseconds) |
| **screenshot** | `{"action": "screenshot", "path": "/tmp/page.png"}` | `{"success": true, "path": "/tmp/page.png"}` | Take viewport screenshot (PNG) |
| **screenshot** | `{"action": "screenshot", "path": "/tmp/page.png", "fullPage": true}` | `{"success": true, "path": "/tmp/page.png"}` | Take full page screenshot |
| **screenshot** | `{"action": "screenshot", "path": "/tmp/page.jpg"}` | `{"success": true, "path": "/tmp/page.jpg"}` | Take screenshot as JPEG |
| **evaluate** | `{"action": "evaluate", "script": "document.title"}` | `{"success": true, "result": "Example Domain"}` | Execute JavaScript and return result |
| **evaluate** | `{"action": "evaluate", "script": "Array.from(document.querySelectorAll('a')).map(a => a.href)"}` | `{"success": true, "result": ["https://...", "..."]}` | Execute complex JavaScript (arrays, objects) |
| **console** | `{"action": "console"}` | `{"success": true, "messages": [{"type": "log", "text": "...", "ts": 1770796364472}]}` | Get all console messages |
| **console** | `{"action": "console", "level": "error"}` | `{"success": true, "messages": [...]}` | Get console messages by level (log, error, warn, info) |
| **status** | `{"action": "status"}` | `{"success": true, "wsConnected": true, "sessionId": "...", "url": "...", "title": "..."}` | Get current browser status and page info |
| **sessionInfo** | `{"action": "sessionInfo"}` | `{"success": true, "connected": true, "wsConnected": true, "sessionId": "...", "server": "...", "wsEndpoint": "...", "addonSessionId": "***..."}` | Get detailed session and connection info |
| **newPage** | `{"action": "newPage"}` | `{"success": true, "message": "New page/tab created"}` | Create new page/tab in browser |
| **close** | `{"action": "close"}` | `{"success": true, "message": "Browser closed"}` | Close browser session |

### Quick Check: Server Status

```bash
# GET request - fastest way to check server
curl http://127.0.0.1:9222

# Response
{
  "status": "ok",
  "success": true,
  "wsConnected": true,
  "sessionId": "puppeteer-1770796364472-92ek4f80j",
  "puppeteerRunning": false,
  "url": null,
  "title": null
}
```

## Complete Workflows

### Form Submission Workflow

```bash
# 1. Navigate to form
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "navigate", "url": "https://example.com/contact"}'

# 2. Fill name field
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "type", "selector": "#name", "text": "John Doe"}'

# 3. Fill email field
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "type", "selector": "#email", "text": "john@example.com"}'

# 4. Fill message
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "type", "selector": "#message", "text": "Hello!"}'

# 5. Submit
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "click", "text": "Submit"}'

# 6. Wait for confirmation
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "wait", "text": "Thank you"}'

# 7. Take screenshot
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "screenshot", "path": "/tmp/confirmation.png"}'
```

### Web Scraping Workflow

```bash
# 1. Navigate
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "navigate", "url": "https://example.com/products"}'

# 2. Wait for content
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "wait", "selector": ".product-list"}'

# 3. Get page text
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{"action": "snapshot"}'

# 4. Extract data with JavaScript
curl -X POST http://127.0.0.1:9222 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "evaluate",
    "script": "Array.from(document.querySelectorAll(\".product\")).map(p => ({title: p.querySelector(\"h2\").textContent, price: p.querySelector(\".price\").textContent}))"
  }'
```

## Using from Other Clients

The HTTP API can be used from any programming language or HTTP client:

**Python:**
```python
import requests

response = requests.post('http://127.0.0.1:9222',
    json={'action': 'navigate', 'url': 'https://example.com'})
print(response.json())
```

**JavaScript/Node.js:**
```javascript
const response = await fetch('http://127.0.0.1:9222', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'navigate', url: 'https://example.com'})
});
const data = await response.json();
```

**Go:**
```go
body := strings.NewReader(`{"action": "navigate", "url": "https://example.com"}`)
resp, _ := http.Post("http://127.0.0.1:9222", "application/json", body)
```

**Use any action from the Quick Reference table above - just copy the JSON format.**

## Error Handling

All responses include a `success` field:

```json
{
  "success": false,
  "error": "Element not found",
  "details": "No element matching selector: #invalid"
}
```

Common errors:
- `"Missing action"` - No action specified
- `"Unknown action"` - Invalid action name
- `"Element not found"` - Selector didn't match any elements
- `"Timeout"` - Operation exceeded timeout
- `"Navigation failed"` - Page failed to load

## Tips & Best Practices

1. **Wait for Elements** - Always wait for dynamic content:
   ```bash
   # Good
   curl -X POST ... -d '{"action": "wait", "selector": ".results"}'
   curl -X POST ... -d '{"action": "click", "selector": ".results button"}'

   # Bad (might fail if content not loaded)
   curl -X POST ... -d '{"action": "click", "selector": ".results button"}'
   ```

2. **Use Specific Selectors** - Prefer IDs and specific classes:
   ```bash
   # Good
   {"selector": "#submit-button"}
   {"selector": "button[type=submit]"}

   # Bad
   {"selector": "button"}
   ```

3. **Handle Timeouts** - Set appropriate timeouts for slow pages:
   ```bash
   {
     "action": "navigate",
     "url": "https://slow-site.com",
     "timeout": 60000
   }
   ```

4. **Check Response Success** - Always verify the `success` field

5. **Use Screenshots for Debugging** - Take screenshots to debug issues:
   ```bash
   curl -X POST ... -d '{"action": "screenshot", "path": "/tmp/debug.png"}'
   ```

## See Also

- [INSTALL.md](INSTALL.md) - Installation guide
- [SKILL.md](SKILL.md) - Complete API reference
- [scripts/README.md](scripts/README.md) - Scripts documentation
