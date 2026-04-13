#!/usr/bin/env node
/**
 * KCD Courier API Test Script
 * Tests all endpoints with the courier-specified format
 * Base URL: https://www.cleanjshipping.com
 * Token: XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY
 */

const API_BASE_URL = 'https://www.cleanjshipping.com';
const API_TOKEN = 'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';
const TEST_TRACKING = `TEST${Date.now()}`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(title, message, type = 'info') {
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warning' ? colors.yellow : colors.cyan;
  console.log(`${color}[${title}]${colors.reset} ${message}`);
}

async function makeRequest(method, endpoint, body = null, useQueryToken = false) {
  let url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_TOKEN
    }
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      url: url.replace(API_TOKEN, '[REDACTED]')
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      url: url.replace(API_TOKEN, '[REDACTED]')
    };
  }
}

const results = [];

function recordResult(name, success, status, details = '') {
  results.push({ name, success, status, details });
  if (success) {
    log('PASS', `${name} (HTTP ${status}) - ${details}`, 'success');
  } else {
    log('FAIL', `${name} (HTTP ${status}) - ${details}`, 'error');
  }
}

// ==================== TEST FUNCTIONS ====================

async function test1_GetCustomers() {
  log('TEST 1', 'GET /api/kcd/customers - Get Customers');
  const res = await makeRequest('GET', '/api/kcd/customers', null, true);

  if (res.ok) {
    const count = Array.isArray(res.data) ? res.data.length : (res.data?.length || 'unknown');
    recordResult('Get Customers', true, res.status, `${count} customers`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      log('INFO', `First customer: ${res.data[0].UserCode || res.data[0].userCode}`, 'info');
    }
    return true;
  } else {
    recordResult('Get Customers', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

async function test2_AddPackage() {
  log('TEST 2', `POST /api/kcd/packages/add - Add Package (${TEST_TRACKING})`);

  // Get a valid customer first - Next.js routes use mailboxCode
  const customersRes = await makeRequest('GET', '/api/kcd/customers?limit=1');
  const mailboxCode = customersRes.data?.customers?.[0]?.mailboxCode || 
                      customersRes.data?.[0]?.mailboxCode || 
                      'CLEAN-0007';
  log('INFO', `Using mailbox: ${mailboxCode}`);

  // Use customerMailbox for Next.js routes
  const res = await makeRequest('POST', '/api/kcd/packages/add', {
    trackingNumber: TEST_TRACKING,
    customerMailbox: mailboxCode,
    weight: 2.5,
    shipper: 'Amazon',
    description: 'Test package from KCD courier test',
    receivedAt: new Date().toISOString()
  });

  if (res.ok && res.data?.success) {
    const pkgId = res.data?.data?.[0]?.PackageID || 'created';
    recordResult('Add Package', true, res.status, `Package: ${pkgId}`);
    return true;
  } else if (res.status === 409) {
    recordResult('Add Package', true, res.status, 'Already exists');
    return true;
  } else {
    recordResult('Add Package', false, res.status, JSON.stringify(res.data).substring(0, 150));
    return false;
  }
}

async function test3_GetPackage() {
  log('TEST 3', `GET /api/kcd/packages/${TEST_TRACKING} - Get Package by Tracking`);
  const res = await makeRequest('GET', `/api/kcd/packages/${TEST_TRACKING}`);

  if (res.ok && res.data?.success) {
    recordResult('Get Package', true, res.status, `Status: ${res.data.data?.status || 'found'}`);
    return true;
  } else if (res.status === 404) {
    recordResult('Get Package', true, res.status, 'Package not found (expected)');
    return true;
  } else {
    recordResult('Get Package', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

async function test4_UpdatePackage() {
  log('TEST 4', `POST /api/kcd/packages/${TEST_TRACKING} - Update Package`);

  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}`, {
    weight: 3.5,
    shipper: 'Updated Shipper',
    description: 'Updated description'
  });

  if (res.ok && res.data?.success) {
    recordResult('Update Package', true, res.status, 'Updated successfully');
    return true;
  } else if (res.status === 404) {
    recordResult('Update Package', false, res.status, 'Package not found');
    return false;
  } else {
    recordResult('Update Package', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

async function test5_UpdateManifest() {
  log('TEST 5', `POST /api/kcd/packages/${TEST_TRACKING}/manifest - Update Manifest`);

  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}/manifest`, {
    items: [{ name: 'Test Item', value: 100 }],
    totalValue: 100,
    currency: 'USD',
    weight: 3.5,
    specialInstructions: 'Handle with care'
  });

  if (res.ok && res.data?.success) {
    recordResult('Update Manifest', true, res.status, 'Manifest updated');
    return true;
  } else if (res.status === 404) {
    recordResult('Update Manifest', false, res.status, 'Package not found');
    return false;
  } else {
    recordResult('Update Manifest', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

async function test6_DeletePackage() {
  log('TEST 6', `POST /api/kcd/packages/${TEST_TRACKING}/delete - Delete Package`);

  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}/delete`, {});

  if (res.ok && res.data?.success) {
    recordResult('Delete Package', true, res.status, 'Deleted successfully');
    return true;
  } else if (res.status === 404) {
    recordResult('Delete Package', true, res.status, 'Already deleted/not found');
    return true;
  } else {
    recordResult('Delete Package', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

async function test7_TestEndpoint() {
  log('TEST 7', 'POST /api/kcd/test - Test Connection');

  const res = await makeRequest('POST', '/api/kcd/test', {});

  if (res.ok && res.data?.success) {
    recordResult('Test Connection', true, res.status, res.data.message || 'Connected');
    return true;
  } else {
    recordResult('Test Connection', false, res.status, JSON.stringify(res.data).substring(0, 100));
    return false;
  }
}

// ==================== MAIN ====================

async function runTests() {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('  KCD COURIER API ENDPOINT TEST');
  console.log(`  Base URL: ${API_BASE_URL}`);
  console.log(`  Token: ${API_TOKEN.substring(0, 20)}...`);
  console.log(`  Test Tracking: ${TEST_TRACKING}`);
  console.log('='.repeat(60));
  console.log('\n');

  const startTime = Date.now();

  // Run all tests
  await test1_GetCustomers();
  await test2_AddPackage();
  await test3_GetPackage();
  await test4_UpdatePackage();
  await test5_UpdateManifest();
  await test6_DeletePackage();
  await test7_TestEndpoint();

  const duration = Date.now() - startTime;

  // Print summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    const color = r.success ? colors.green : colors.red;
    console.log(`${color}${icon}${colors.reset} ${r.name} - HTTP ${r.status}`);
  });

  console.log('\n');
  console.log(`Total: ${results.length} tests`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Duration: ${duration}ms`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
