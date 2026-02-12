#!/usr/bin/env node

/**
 * Test script for openclaw_done24bot HTTP API
 */

const http = require('http');

const HTTP_PORT = process.env.HTTP_PORT || 9222;
const HOST = process.env.HOST || '127.0.0.1';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: HOST,
      port: HTTP_PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body, parseError: e.message });
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Connection failed: ${err.message}\nMake sure browser-server is running on http://${HOST}:${HTTP_PORT}`));
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('openclaw_done24bot API Test');
  console.log('='.repeat(50));
  console.log(`Target: http://${HOST}:${HTTP_PORT}\n`);

  try {
    // Test 1: GET status
    console.log('Test 1: GET /');
    const getStatus = await makeRequest('GET', '/');
    console.log(`  Status: ${getStatus.statusCode}`);
    console.log(`  Response: ${JSON.stringify(getStatus.data, null, 2)}`);
    console.log(`  ${getStatus.statusCode === 200 ? 'PASS' : 'FAIL'}\n`);

    // Test 2: POST status
    console.log('Test 2: POST status');
    const postStatus = await makeRequest('POST', '/', { action: 'status' });
    console.log(`  Status: ${postStatus.statusCode}`);
    console.log(`  Response: ${JSON.stringify(postStatus.data, null, 2)}`);
    console.log(`  ${postStatus.data?.success !== false ? 'PASS' : 'FAIL'}\n`);

    // Test 3: POST sessionInfo
    console.log('Test 3: POST sessionInfo');
    const sessionInfo = await makeRequest('POST', '/', { action: 'sessionInfo' });
    console.log(`  Status: ${sessionInfo.statusCode}`);
    console.log(`  Response: ${JSON.stringify(sessionInfo.data, null, 2)}`);
    console.log(`  ${sessionInfo.data?.success ? 'PASS' : 'FAIL'}\n`);

    const allPassed =
      getStatus.statusCode === 200 &&
      postStatus.data?.success !== false &&
      sessionInfo.data?.success === true;

    console.log('='.repeat(50));
    console.log(allPassed ? 'All tests PASSED' : 'Some tests FAILED');
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error('TEST ERROR:', err.message);
    console.error('\nMake sure browser-server is running: npm start');
    process.exit(1);
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node scripts/test-browser-api.js

Environment:
  HTTP_PORT  Port (default: 9222)
  HOST       Host (default: 127.0.0.1)
`);
  process.exit(0);
}

runTests();
