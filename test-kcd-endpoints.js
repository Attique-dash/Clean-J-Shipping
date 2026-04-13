#!/usr/bin/env node
/**
 * Test script to verify all KCD API endpoints are working
 */

const API_BASE_URL = 'https://cleanjshipping.vercel.app';
const API_TOKEN = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';
const AUTH_HEADER = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq'; // Raw token for Authorization header

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, body = null, authType = 'header') {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${name}`, 'cyan');
  log(`${method} ${url}`, 'blue');
  log(`Auth Type: ${authType}`, 'yellow');
  log(`${'='.repeat(60)}`, 'cyan');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Handle different auth types
    if (authType === 'header') {
      headers['x-api-key'] = API_TOKEN;
    } else if (authType === 'auth') {
      headers['Authorization'] = AUTH_HEADER;
    } else if (authType === 'xkcd') {
      headers['x-kcd-api-key'] = API_TOKEN;
    }

    const requestBody = body ? { ...body } : null;
    // KCD uses "APIToken" field in body
    if (authType === 'body' && requestBody) {
      requestBody.APIToken = API_TOKEN;
    } else if (authType === 'token' && requestBody) {
      requestBody.token = API_TOKEN;
    }

    const options = {
      method,
      headers,
    };

    if (requestBody) {
      options.body = JSON.stringify(requestBody);
    }

    log(`Request headers: ${JSON.stringify({ ...headers, 'x-api-key': headers['x-api-key'] ? '[REDACTED]' : 'MISSING' })}`, 'yellow');
    if (requestBody) {
      log(`Request body (token redacted): ${JSON.stringify({ ...requestBody, token: requestBody.token ? '[REDACTED]' : undefined })}`, 'yellow');
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    log(`\nResponse Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red');
    log(`Response: ${JSON.stringify(responseData, null, 2)}`, response.ok ? 'green' : 'red');

    return {
      success: response.ok,
      status: response.status,
      data: responseData
    };

  } catch (error) {
    log(`\nError: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('KCD API ENDPOINTS TEST', 'cyan');
  log('API Base URL: ' + API_BASE_URL, 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  const results = [];

  // Test 1: Get Customers (Header Token)
  results.push({
    name: 'Get Customers (Header Token)',
    result: await testEndpoint(
      'Get Customers (Header Token)',
      'GET',
      `${API_BASE_URL}/api/kcd/customers`,
      null,
      true
    )
  });

  // Test 2: Get Customers (Body Token - simulated)
  results.push({
    name: 'Get Customers (Query Token)',
    result: await testEndpoint(
      'Get Customers (Query Token)',
      'GET',
      `${API_BASE_URL}/api/kcd/customers?apiKey=${API_TOKEN}`,
      null,
      false
    )
  });

  // Test 3: Add Package (Header Token)
  const testTrackingNumber = `TEST-${Date.now()}`;
  results.push({
    name: 'Add Package (Header Token)',
    result: await testEndpoint(
      'Add Package (Header Token)',
      'POST',
      `${API_BASE_URL}/api/kcd/packages/add`,
      {
        trackingNumber: testTrackingNumber,
        customerMailbox: 'CLEAN-0007',
        weight: 2.5,
        shipper: 'Test Shipper',
        description: 'Test package from endpoint test'
      },
      true
    )
  });

  // Test 4: Add Package (Body Token)
  results.push({
    name: 'Add Package (Body Token)',
    result: await testEndpoint(
      'Add Package (Body Token)',
      'POST',
      `${API_BASE_URL}/api/kcd/packages/add`,
      {
        token: API_TOKEN,
        trackingNumber: `TEST-BODY-${Date.now()}`,
        customerMailbox: 'CLEAN-0007',
        weight: 1.5,
        shipper: 'Test Shipper Body',
        description: 'Test package with token in body'
      },
      false
    )
  });

  // Test 5: Update Package
  results.push({
    name: 'Update Package',
    result: await testEndpoint(
      'Update Package',
      'POST',
      `${API_BASE_URL}/api/kcd/packages/${testTrackingNumber}`,
      {
        weight: 3.0,
        status: 'processing',
        description: 'Updated via test'
      },
      true
    )
  });

  // Test 6: Update Manifest
  results.push({
    name: 'Update Manifest',
    result: await testEndpoint(
      'Update Manifest',
      'POST',
      `${API_BASE_URL}/api/kcd/packages/${testTrackingNumber}/manifest`,
      {
        manifestId: 'MANIFEST-001',
        batchNumber: 'BATCH-001',
        shipmentMode: 'air',
        currentLocation: 'Florida Warehouse'
      },
      true
    )
  });

  // Test 7: Delete Package
  results.push({
    name: 'Delete Package',
    result: await testEndpoint(
      'Delete Package',
      'POST',
      `${API_BASE_URL}/api/kcd/packages/${testTrackingNumber}/delete`,
      {},
      true
    )
  });

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');

  let passed = 0;
  let failed = 0;

  for (const { name, result } of results) {
    if (result.success) {
      log(`✅ ${name}: PASSED`, 'green');
      passed++;
    } else {
      log(`❌ ${name}: FAILED`, 'red');
      if (result.error) {
        log(`   Error: ${result.error}`, 'red');
      } else if (result.data) {
        log(`   Status: ${result.status}`, 'red');
        log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...`, 'red');
      }
      failed++;
    }
  }

  log('\n' + '='.repeat(60), 'cyan');
  log(`Results: ${passed} passed, ${failed} failed`, failed === 0 ? 'green' : 'yellow');
  log('='.repeat(60), 'cyan');

  return failed === 0;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
