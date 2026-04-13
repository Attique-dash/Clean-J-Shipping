#!/usr/bin/env node
/**
 * Test all KCD auth methods
 */

const API_BASE_URL = 'https://cleanjshipping.vercel.app';
const API_TOKEN = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

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

async function testGetCustomers(method, url, headers = {}) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`GET CUSTOMERS - ${method}`, 'cyan');
  log(`URL: ${url}`, 'blue');
  log(`Headers: ${JSON.stringify(headers)}`, 'yellow');
  log(`${'='.repeat(60)}`, 'cyan');

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red');
    log(`Response: ${JSON.stringify(data, null, 2).substring(0, 500)}...`, response.ok ? 'green' : 'red');
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testAddPackage(method, authInfo, bodyData = {}) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`ADD PACKAGE - ${method}`, 'cyan');
  log(`Auth: ${authInfo}`, 'blue');
  log(`${'='.repeat(60)}`, 'cyan');

  try {
    const headers = { 'Content-Type': 'application/json' };
    const body = { ...bodyData };
    
    const response = await fetch(`${API_BASE_URL}/api/kcd/packages/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red');
    log(`Response: ${JSON.stringify(data, null, 2)}`, response.ok ? 'green' : 'red');
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TESTING ALL KCD AUTH METHODS', 'cyan');
  log('='.repeat(60), 'cyan');

  const results = [];

  // GET CUSTOMERS - Different auth methods
  
  // Method 1: Query param ?id=TOKEN (per KCD docs)
  results.push({
    name: 'GET /customers ?id=TOKEN',
    result: await testGetCustomers(
      'Query param ?id=TOKEN',
      `${API_BASE_URL}/api/kcd/customers?id=${API_TOKEN}`
    )
  });

  // Method 2: Authorization header (raw token)
  results.push({
    name: 'GET /customers Authorization header',
    result: await testGetCustomers(
      'Authorization header',
      `${API_BASE_URL}/api/kcd/customers`,
      { 'Authorization': API_TOKEN }
    )
  });

  // Method 3: x-kcd-api-key header
  results.push({
    name: 'GET /customers x-kcd-api-key header',
    result: await testGetCustomers(
      'x-kcd-api-key header',
      `${API_BASE_URL}/api/kcd/customers`,
      { 'x-kcd-api-key': API_TOKEN }
    )
  });

  // Method 4: x-api-key header
  results.push({
    name: 'GET /customers x-api-key header',
    result: await testGetCustomers(
      'x-api-key header',
      `${API_BASE_URL}/api/kcd/customers`,
      { 'x-api-key': API_TOKEN }
    )
  });

  // ADD PACKAGE - Different auth methods
  const testTracking = `TEST-${Date.now()}`;
  
  // Method 5: APIToken in body
  results.push({
    name: 'POST /packages/add APIToken in body',
    result: await testAddPackage(
      'APIToken in body',
      'Body field: APIToken',
      {
        APIToken: API_TOKEN,
        trackingNumber: testTracking,
        customerMailbox: 'CLEAN-0007',
        weight: 2.5,
        shipper: 'Test'
      }
    )
  });

  // Method 6: token in body (Askenish format)
  results.push({
    name: 'POST /packages/add token in body',
    result: await testAddPackage(
      'token in body',
      'Body field: token',
      {
        token: API_TOKEN,
        trackingNumber: `TEST-TOK-${Date.now()}`,
        customerMailbox: 'CLEAN-0007',
        weight: 1.5,
        shipper: 'Test'
      }
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
      log(`✅ ${name}: PASSED (${result.status})`, 'green');
      passed++;
    } else {
      log(`❌ ${name}: FAILED (${result.status || result.error})`, 'red');
      failed++;
    }
  }

  log('\n' + '='.repeat(60), 'cyan');
  log(`Results: ${passed} passed, ${failed} failed`, failed === 0 ? 'green' : 'yellow');
  log('='.repeat(60), 'cyan');

  if (passed > 0) {
    log('\n✅ At least one auth method works! Use that format.', 'green');
  } else {
    log('\n❌ All auth methods failed. Check if KCD_API_KEY is set in Vercel.', 'red');
  }
}

runTests().catch(console.error);
