#!/usr/bin/env node

/**
 * Test script for browser-server.js HTTP API
 * Connects to running browser-server and retrieves browser information
 */

const http = require('http');

const HTTP_PORT = process.env.HTTP_PORT || 9222;
const HOST = process.env.HOST || '127.0.0.1';

/**
 * Make HTTP request to browser-server
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: HTTP_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Connection failed: ${err.message}\nMake sure browser-server is running on http://${HOST}:${HTTP_PORT}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(70));
  console.log('Browser Server API Test');
  console.log('='.repeat(70));
  console.log(`Target: http://${HOST}:${HTTP_PORT}\n`);

  try {
    // Test 1: GET status
    console.log('Test 1: GET / (Server Status)');
    console.log('-'.repeat(70));
    const getStatus = await makeRequest('GET', '/');
    console.log(`Status Code: ${getStatus.statusCode}`);
    console.log('Response:', JSON.stringify(getStatus.data, null, 2));
    console.log(`Result: ${getStatus.statusCode === 200 ? '✓ PASS' : '✗ FAIL'}\n`);

    // Test 2: POST status
    console.log('Test 2: POST status action');
    console.log('-'.repeat(70));
    const postStatus = await makeRequest('POST', '/', { action: 'status' });
    console.log(`Status Code: ${postStatus.statusCode}`);
    console.log('Response:', JSON.stringify(postStatus.data, null, 2));
    console.log(`Result: ${postStatus.data?.success !== false ? '✓ PASS' : '✗ FAIL'}\n`);

    // Test 3: POST sessionInfo
    console.log('Test 3: POST sessionInfo action');
    console.log('-'.repeat(70));
    const sessionInfo = await makeRequest('POST', '/', { action: 'sessionInfo' });
    console.log(`Status Code: ${sessionInfo.statusCode}`);
    console.log('Response:', JSON.stringify(sessionInfo.data, null, 2));
    console.log(`Result: ${sessionInfo.data?.success ? '✓ PASS' : '✗ FAIL'}\n`);

    // Summary
    console.log('='.repeat(70));
    console.log('Test Summary');
    console.log('='.repeat(70));

    const allPassed =
      getStatus.statusCode === 200 &&
      postStatus.data?.success !== false &&
      sessionInfo.data?.success === true;

    if (allPassed) {
      console.log('✓ All tests PASSED');

      // Display browser information
      if (sessionInfo.data) {
        console.log('\nBrowser Information:');
        console.log(`  Connected: ${sessionInfo.data.connected ? 'Yes' : 'No'}`);
        console.log(`  WebSocket: ${sessionInfo.data.wsConnected ? 'Connected' : 'Disconnected'}`);
        console.log(`  Session ID: ${sessionInfo.data.sessionId || 'N/A'}`);
        console.log(`  Server: ${sessionInfo.data.server || 'N/A'}`);
        console.log(`  WebSocket Endpoint: ${sessionInfo.data.wsEndpoint || 'N/A'}`);
        console.log(`  Addon Session ID: ${sessionInfo.data.addonSessionId || 'N/A'}`);

        if (postStatus.data) {
          console.log(`  Current URL: ${postStatus.data.url || 'None (no page loaded)'}`);
          console.log(`  Page Title: ${postStatus.data.title || 'N/A'}`);
        }
      }
    } else {
      console.log('✗ Some tests FAILED');
    }

    console.log('='.repeat(70));
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.log('\n' + '='.repeat(70));
    console.error('✗ TEST ERROR');
    console.log('='.repeat(70));
    console.error(err.message);
    console.error('\nTroubleshooting:');
    console.error(`  1. Is browser-server running? Start it with: npm start`);
    console.error(`  2. Is it on the expected port? Check: http://${HOST}:${HTTP_PORT}`);
    console.error(`  3. Environment: HTTP_PORT=${HTTP_PORT}`);
    process.exit(1);
  }
}

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-browser-api.js [options]

Tests the browser-server.js HTTP API

Options:
  --help, -h     Show this help message

Environment Variables:
  HTTP_PORT      Port where browser-server is running (default: 9222)
  HOST           Host where browser-server is running (default: 127.0.0.1)

Examples:
  # Test default port
  node scripts/test-browser-api.js

  # Test custom port
  HTTP_PORT=9223 node scripts/test-browser-api.js

Make sure browser-server.js is running before running this test:
  DONE24BOT_SERVER="http://192.168.50.78:4200/" \\
  ADDON_SESSION_ID="addon-1770732525816-wqcmdh1ua" \\
  npm start
`);
  process.exit(0);
}

runTests();
