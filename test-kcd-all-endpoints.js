#!/usr/bin/env node
/**
 * KCD API Endpoints Test Script
 * Tests all KCD endpoints on the deployed Vercel site
 */

const BASE_URL = 'https://cleanjshipping.vercel.app';
const API_KEY = process.env.KCD_API_KEY || 'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';

// Test tracking number (unique for each test run)
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

async function makeRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...headers
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
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// Test Results
const results = [];

function recordResult(name, success, status, details = '') {
  results.push({ name, success, status, details });
  if (success) {
    log('PASS', `${name} (HTTP ${status})`, 'success');
  } else {
    log('FAIL', `${name} (HTTP ${status}) - ${details}`, 'error');
  }
}

// ==================== TEST FUNCTIONS ====================

async function test1_GetCustomers() {
  log('TEST 1', 'GET /api/kcd/customers - Fetch customers list');
  const res = await makeRequest('GET', '/api/kcd/customers?limit=10');

  // Warehouse backend returns array directly, not wrapped in success object
  if (res.ok && Array.isArray(res.data)) {
    recordResult('Get Customers', true, res.status, `${res.data.length} customers found`);
    return true;
  } else if (res.data?.success && Array.isArray(res.data?.customers)) {
    recordResult('Get Customers', true, res.status, `${res.data.count} customers found`);
    return true;
  } else {
    recordResult('Get Customers', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test2_AddPackage() {
  log('TEST 2', `POST /api/kcd/packages/add - Add package ${TEST_TRACKING}`);

  // First find a valid customer with query param
  const customersRes = await makeRequest('GET', '/api/kcd/customers?userCode=CLEAN-0001');
  const userCode = customersRes.data?.[0]?.UserCode || 'CLEAN-0001';
  log('INFO', `Using customer: ${userCode}`);

  const res = await makeRequest('POST', '/api/kcd/packages/add', {
    trackingNumber: TEST_TRACKING,
    userCode: userCode,
    weight: 2.5,
    shipper: 'Test Shipper',
    description: 'Test package from KCD endpoint test',
    status: 'received'
  });

  // Warehouse backend returns { success, message, data: [{ PackageID, ... }] }
  if (res.ok && res.data?.success && res.data?.data?.[0]?.PackageID) {
    recordResult('Add Package', true, res.status, `Package ID: ${res.data.data[0].PackageID}`);
    return true;
  } else if (res.status === 409) {
    recordResult('Add Package', true, res.status, 'Package already exists (expected for duplicate)');
    return true;
  } else if (res.status === 400) {
    recordResult('Add Package', false, res.status, `Validation error: ${JSON.stringify(res.data)}`);
    return false;
  } else {
    recordResult('Add Package', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test3_GetPackage() {
  log('TEST 3', `GET /api/kcd/packages/${TEST_TRACKING} - Get package details`);
  const res = await makeRequest('GET', `/api/kcd/packages/${TEST_TRACKING}`);

  // Warehouse backend returns { success, data: { trackingNumber, status, ... } }
  if (res.ok && res.data?.success && res.data?.data?.trackingNumber) {
    recordResult('Get Package', true, res.status, `Status: ${res.data.data.status}`);
    return true;
  } else if (res.status === 404) {
    recordResult('Get Package', false, res.status, 'Package not found (may need to run add test first)');
    return false;
  } else {
    recordResult('Get Package', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test4_UpdatePackage() {
  log('TEST 4', `POST /api/kcd/packages/${TEST_TRACKING} - Update package`);
  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}`, {
    weight: 3.0,
    shipper: 'Updated Shipper',
    description: 'Updated description',
    status: 'received'
  });

  if (res.ok && res.data?.success) {
    recordResult('Update Package', true, res.status, 'Package updated successfully');
    return true;
  } else if (res.status === 404) {
    recordResult('Update Package', false, res.status, 'Package not found');
    return false;
  } else {
    recordResult('Update Package', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test5_UpdateManifest() {
  log('TEST 5', `POST /api/kcd/packages/${TEST_TRACKING}/manifest - Update manifest`);
  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}/manifest`, {
    items: [{ name: 'Test Item', value: 100 }],
    totalValue: 100,
    weight: 3.5,
    specialInstructions: 'Test manifest update'
  });

  if (res.ok && res.data?.success) {
    recordResult('Update Manifest', true, res.status, `Manifest: ${res.data.data?.manifestId || 'updated'}`);
    return true;
  } else if (res.status === 404) {
    recordResult('Update Manifest', false, res.status, 'Package not found');
    return false;
  } else {
    recordResult('Update Manifest', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test6_KcdTestEndpoint() {
  log('TEST 6', 'POST /api/kcd/test - KCD connection test endpoint');
  const res = await makeRequest('POST', '/api/kcd/test', {});

  if (res.ok && res.data?.success) {
    recordResult('KCD Test Endpoint', true, res.status, res.data.message || 'Connection OK');
    return true;
  } else {
    recordResult('KCD Test Endpoint', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test7_ListPackages() {
  log('TEST 7', 'GET /api/kcd/packages - List all packages');
  const res = await makeRequest('GET', '/api/kcd/packages?limit=5');

  if (res.ok && res.data?.success && res.data?.data?.packages) {
    recordResult('List Packages', true, res.status, `${res.data.data.packages.length} packages found`);
    return true;
  } else {
    recordResult('List Packages', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test8_DebugKcdEnv() {
  log('TEST 8', 'GET /api/debug/kcd-env - Debug KCD environment');
  const res = await makeRequest('GET', '/api/debug/kcd-env');

  if (res.ok && res.data?.kcdApiKeyExists !== undefined) {
    recordResult('Debug KCD Env', true, res.status, `KCD_KEY exists: ${res.data.kcdApiKeyExists}`);
    return true;
  } else {
    recordResult('Debug KCD Env', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

async function test9_UnauthorizedAccess() {
  log('TEST 9', 'Testing unauthorized access (should fail with 401)');

  const url = `${BASE_URL}/api/kcd/customers`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
      // No API key
    });

    if (response.status === 401) {
      recordResult('Unauthorized Access', true, response.status, 'Correctly rejected without API key');
      return true;
    } else {
      recordResult('Unauthorized Access', false, response.status, 'Should have returned 401');
      return false;
    }
  } catch (error) {
    recordResult('Unauthorized Access', false, 0, error.message);
    return false;
  }
}

async function test10_InvalidApiKey() {
  log('TEST 10', 'Testing invalid API key (should fail with 401)');

  const url = `${BASE_URL}/api/kcd/customers`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid-key-12345'
      }
    });

    if (response.status === 401) {
      recordResult('Invalid API Key', true, response.status, 'Correctly rejected invalid key');
      return true;
    } else {
      recordResult('Invalid API Key', false, response.status, 'Should have returned 401');
      return false;
    }
  } catch (error) {
    recordResult('Invalid API Key', false, 0, error.message);
    return false;
  }
}

async function test11_DeletePackage() {
  log('TEST 11', `POST /api/kcd/packages/${TEST_TRACKING}/delete - Delete package`);
  const res = await makeRequest('POST', `/api/kcd/packages/${TEST_TRACKING}/delete`);

  if (res.ok && res.data?.success) {
    recordResult('Delete Package', true, res.status, 'Package deleted successfully');
    return true;
  } else if (res.status === 404) {
    recordResult('Delete Package', false, res.status, 'Package not found (may already be deleted)');
    return false;
  } else {
    recordResult('Delete Package', false, res.status, JSON.stringify(res.data || res.error));
    return false;
  }
}

// ==================== MAIN ====================

async function runTests() {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('  KCD API ENDPOINTS TEST');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Test Tracking Number: ${TEST_TRACKING}`);
  console.log('='.repeat(60));
  console.log('\n');

  const startTime = Date.now();

  // Run all tests
  await test1_GetCustomers();
  await test2_AddPackage();
  await test3_GetPackage();
  await test4_UpdatePackage();
  await test5_UpdateManifest();
  await test6_KcdTestEndpoint();
  await test7_ListPackages();
  await test8_DebugKcdEnv();
  await test9_UnauthorizedAccess();
  await test10_InvalidApiKey();
  await test11_DeletePackage();

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

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
