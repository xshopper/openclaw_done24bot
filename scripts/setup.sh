#!/bin/bash
# Setup script for done24bot client

set -e

echo "=== done24bot Setup ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install Node.js 14+ first."
  exit 1
fi

echo "✓ Node.js $(node --version)"

# Check/install Puppeteer
if [ ! -d "node_modules/puppeteer" ]; then
  echo ""
  echo "→ Installing Puppeteer (skipping Chromium download)..."
  PUPPETEER_SKIP_DOWNLOAD=true npm install
  echo "✓ Puppeteer installed (Chromium download skipped)"
fi

# Test connection
echo ""
echo "→ Test connection? (requires done24bot running)"
read -p "Continue [y/N]? " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Load .env.local if it exists
  if [ -f .env.local ]; then
    echo "→ Loading .env.local configuration..."
    set -a && source .env.local && set +a
  fi

  # Check authentication
  if [ -z "$ADDON_SESSION_ID" ] && [ -z "$DONE24BOT_API_KEY" ]; then
    echo "⚠️  Warning: No authentication set (ADDON_SESSION_ID or DONE24BOT_API_KEY)"
    echo "   Set in .env.local or environment variables"
  fi

  # Use HTTP_PORT or default to 9222
  TEST_PORT=${HTTP_PORT:-9222}

  echo "→ Starting browser client..."
  node scripts/browser-server.js &
  CLIENT_PID=$!

  sleep 3

  echo "→ Testing connection..."
  if curl -s http://127.0.0.1:$TEST_PORT | grep -q "success"; then
    echo "✓ Connection successful!"
    echo ""
    echo "Browser client is running on http://127.0.0.1:$TEST_PORT"
    echo "PID: $CLIENT_PID"
    echo ""
    echo "To stop: kill $CLIENT_PID"
  else
    echo "✗ Connection failed - check server URL and authentication"
    kill $CLIENT_PID 2>/dev/null || true
    exit 1
  fi
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "To start the client:"
echo ""
echo "1. Configure authentication in .env.local:"
echo "   DONE24BOT_SERVER=http://192.168.50.78:4200/"
echo "   ADDON_SESSION_ID=addon-1770732525816-wqcmdh1ua"
echo ""
echo "2. Start the client:"
echo "   set -a && source .env.local && set +a"
echo "   npm start"
echo ""
echo "Or use environment variables directly:"
echo "   export DONE24BOT_SERVER=\"http://192.168.50.78:4200/\""
echo "   export ADDON_SESSION_ID=\"addon-1770732525816-wqcmdh1ua\""
echo "   npm start"
