#!/bin/bash
# Setup script for openclaw_done24bot

set -e

echo "=== openclaw_done24bot Setup ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Install Node.js 18+ first."
  exit 1
fi

echo "Node.js $(node --version)"

# Install dependencies
if [ ! -d "node_modules/puppeteer-core" ]; then
  echo ""
  echo "Installing dependencies..."
  npm install
  echo "Dependencies installed"
fi

# Test connection
echo ""
echo "Test connection? (requires done24bot running)"
read -p "Continue [y/N]? " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -f .env.local ]; then
    echo "Loading .env.local..."
    set -a && source .env.local && set +a
  fi

  TEST_PORT=${HTTP_PORT:-9222}

  echo "Starting browser client..."
  node scripts/browser-server.js &
  CLIENT_PID=$!

  sleep 3

  echo "Testing connection..."
  if curl -s http://127.0.0.1:$TEST_PORT | grep -q "success"; then
    echo "Connection successful!"
    echo "Running on http://127.0.0.1:$TEST_PORT (PID: $CLIENT_PID)"
    echo "To stop: kill $CLIENT_PID"
  else
    echo "Connection failed"
    kill $CLIENT_PID 2>/dev/null || true
    exit 1
  fi
fi

echo ""
echo "Setup complete!"
echo ""
echo "Quick start:"
echo "  export DONE24BOT_SERVER=\"https://done24bot.com\""
echo "  export ADDON_SESSION_ID=\"addon-xxx\""
echo "  npm start"
