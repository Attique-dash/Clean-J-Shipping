#!/usr/bin/env node
/**
 * KCD API Step-by-Step Test with Real Database Data
 * Shows actual data from database for each endpoint
 */

const API_BASE_URL = 'https://www.cleanjshipping.com';
const API_TOKEN = 'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(title, message, type = 'info') {
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warning' ? colors.yellow : type === 'highlight' ? colors.magenta : colors.cyan;
  console.log(`${color}[${title}]${colors.reset} ${message}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function makeRequest(method, endpoint, body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
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

// Global variable to store selected customer
let selectedCustomer = null;
let createdPackageTracking = null;

// ==================== STEP 1: GET CUSTOMERS ====================

async function step1_GetCustomers() {
  section('STEP 1: GET CUSTOMERS (Real Database Data)');
  log('ACTION', 'Fetching customers from database...');

  const res = await makeRequest('GET', '/api/kcd/customers');

  if (!res.ok) {
    log('ERROR', `Failed to fetch customers: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  const customers = res.data?.customers || res.data || [];

  console.log('\n📋 CUSTOMERS FROM DATABASE:');
  console.log(`   Total customers found: ${customers.length}`);
  console.log('');

  if (customers.length === 0) {
    log('WARNING', 'No customers found in database!', 'warning');
    return false;
  }

  // Show first 5 customers with details
  customers.slice(0, 5).forEach((c, i) => {
    const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown';
    const mailbox = c.mailboxCode || c.userCode || c.UserCode || 'N/A';
    const email = c.email || c.Email || 'N/A';
    console.log(`   ${i + 1}. ${colors.yellow}${name}${colors.reset}`);
    console.log(`      📧 ${email}`);
    console.log(`      📦 Mailbox: ${colors.green}${mailbox}${colors.reset}`);
    if (c.address) {
      const addr = typeof c.address === 'object' ?
        `${c.address.street || ''}, ${c.address.city || ''}` :
        c.address;
      console.log(`      📍 ${addr}`);
    }
    console.log('');
  });

  // Select first customer for testing
  selectedCustomer = customers[0];
  const selectedMailbox = selectedCustomer.mailboxCode || selectedCustomer.userCode || selectedCustomer.UserCode;

  log('SUCCESS', `Selected customer for testing: ${colors.green}${selectedMailbox}${colors.reset}`, 'success');
  log('INFO', `Customer Name: ${selectedCustomer.name || selectedCustomer.email}`, 'highlight');

  return true;
}

// ==================== STEP 2: ADD PACKAGE ====================

async function step2_AddPackage() {
  section('STEP 2: ADD PACKAGE (Insert into Database)');

  if (!selectedCustomer) {
    log('ERROR', 'No customer selected. Run Step 1 first.', 'error');
    return false;
  }

  const mailboxCode = selectedCustomer.mailboxCode || selectedCustomer.userCode || selectedCustomer.UserCode;
  createdPackageTracking = `TEST${Date.now()}`;

  log('ACTION', `Adding package to database...`);
  log('INFO', `Tracking Number: ${colors.yellow}${createdPackageTracking}${colors.reset}`);
  log('INFO', `Customer Mailbox: ${colors.yellow}${mailboxCode}${colors.reset}`);

  const packageData = {
    trackingNumber: createdPackageTracking,
    customerMailbox: mailboxCode,
    weight: 2.5,
    shipper: 'Amazon',
    description: 'Real test package from step-by-step test',
    receivedAt: new Date().toISOString()
  };

  console.log('\n📤 PACKAGE DATA BEING SENT:');
  console.log(JSON.stringify(packageData, null, 2));

  const res = await makeRequest('POST', '/api/kcd/packages/add', packageData);

  if (!res.ok) {
    log('ERROR', `Failed to add package: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  console.log('\n📥 DATABASE RESPONSE:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.success) {
    const pkg = res.data.package || res.data.data?.[0];
    log('SUCCESS', `Package created in database!`, 'success');
    log('INFO', `Package ID: ${colors.green}${pkg?.id || pkg?.PackageID || 'N/A'}${colors.reset}`);
    log('INFO', `Status: ${colors.green}${pkg?.status || 'created'}${colors.reset}`);
    return true;
  }

  return false;
}

// ==================== STEP 3: GET PACKAGE ====================

async function step3_GetPackage() {
  section('STEP 3: GET PACKAGE (Query from Database)');

  if (!createdPackageTracking) {
    log('ERROR', 'No package created. Run Step 2 first.', 'error');
    return false;
  }

  log('ACTION', `Querying package from database...`);
  log('INFO', `Tracking Number: ${colors.yellow}${createdPackageTracking}${colors.reset}`);

  const res = await makeRequest('GET', `/api/kcd/packages/${createdPackageTracking}`);

  if (!res.ok) {
    log('ERROR', `Failed to get package: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  console.log('\n📦 PACKAGE DATA FROM DATABASE:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.success && res.data?.package) {
    const pkg = res.data.package;
    log('SUCCESS', `Package found in database!`, 'success');
    log('INFO', `ID: ${pkg.id}`);
    log('INFO', `Tracking: ${pkg.trackingNumber}`);
    log('INFO', `UserCode: ${pkg.userCode}`);
    log('INFO', `Status: ${colors.green}${pkg.status}${colors.reset}`);
    log('INFO', `Weight: ${pkg.weight} kg`);
    log('INFO', `Shipper: ${pkg.shipper}`);
    return true;
  }

  return false;
}

// ==================== STEP 4: UPDATE PACKAGE ====================

async function step4_UpdatePackage() {
  section('STEP 4: UPDATE PACKAGE (Modify in Database)');

  if (!createdPackageTracking) {
    log('ERROR', 'No package created. Run Step 2 first.', 'error');
    return false;
  }

  log('ACTION', `Updating package in database...`);
  log('INFO', `Tracking Number: ${colors.yellow}${createdPackageTracking}${colors.reset}`);

  const updateData = {
    weight: 5.0,
    shipper: 'Updated Shipper Name',
    description: 'Updated description - package was modified',
    status: 'received'
  };

  console.log('\n📝 UPDATE DATA:');
  console.log(JSON.stringify(updateData, null, 2));

  const res = await makeRequest('POST', `/api/kcd/packages/${createdPackageTracking}`, updateData);

  if (!res.ok) {
    log('ERROR', `Failed to update package: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  console.log('\n📥 UPDATE RESPONSE:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.success) {
    log('SUCCESS', `Package updated in database!`, 'success');

    // Verify the update by fetching again
    log('ACTION', 'Verifying update by fetching package again...');
    const verifyRes = await makeRequest('GET', `/api/kcd/packages/${createdPackageTracking}`);

    if (verifyRes.ok && verifyRes.data?.package) {
      const pkg = verifyRes.data.package;
      console.log('\n✅ VERIFIED DATA FROM DATABASE:');
      log('INFO', `Weight: ${colors.green}${pkg.weight}${colors.reset} kg (was 2.5)`);
      log('INFO', `Shipper: ${colors.green}${pkg.shipper}${colors.reset}`);
      log('INFO', `Description: ${colors.green}${pkg.description}${colors.reset}`);
    }

    return true;
  }

  return false;
}

// ==================== STEP 5: UPDATE MANIFEST ====================

async function step5_UpdateManifest() {
  section('STEP 5: UPDATE MANIFEST (Update in Database)');

  if (!createdPackageTracking) {
    log('ERROR', 'No package created. Run Step 2 first.', 'error');
    return false;
  }

  log('ACTION', `Updating manifest in database...`);
  log('INFO', `Tracking Number: ${colors.yellow}${createdPackageTracking}${colors.reset}`);

  const manifestData = {
    manifestId: 'MANIFEST-TEST-001',
    batchNumber: 'BATCH-2024-001',
    shipmentMode: 'air',
    flightNumber: 'AA1234',
    currentLocation: 'Miami Warehouse',
    warehouseLocation: 'Miami Main Warehouse',
    eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  console.log('\n📦 MANIFEST DATA:');
  console.log(JSON.stringify(manifestData, null, 2));

  const res = await makeRequest('POST', `/api/kcd/packages/${createdPackageTracking}/manifest`, manifestData);

  if (!res.ok) {
    log('ERROR', `Failed to update manifest: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  console.log('\n📥 MANIFEST RESPONSE:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.success) {
    log('SUCCESS', `Manifest updated in database!`, 'success');

    // Verify by fetching package
    log('ACTION', 'Verifying manifest update...');
    const verifyRes = await makeRequest('GET', `/api/kcd/packages/${createdPackageTracking}`);

    if (verifyRes.ok && verifyRes.data?.package) {
      const pkg = verifyRes.data.package;
      console.log('\n✅ VERIFIED MANIFEST DATA:');
      log('INFO', `Manifest ID: ${colors.green}${pkg.manifestId || 'N/A'}${colors.reset}`);
      log('INFO', `Batch Number: ${colors.green}${pkg.batchNumber || 'N/A'}${colors.reset}`);
      log('INFO', `Current Location: ${colors.green}${pkg.currentLocation || 'N/A'}${colors.reset}`);
    }

    return true;
  }

  return false;
}

// ==================== STEP 6: DELETE PACKAGE ====================

async function step6_DeletePackage() {
  section('STEP 6: DELETE PACKAGE (Remove from Database)');

  if (!createdPackageTracking) {
    log('ERROR', 'No package created. Run Step 2 first.', 'error');
    return false;
  }

  log('ACTION', `Deleting package from database...`);
  log('WARNING', `This will permanently delete: ${createdPackageTracking}`, 'warning');

  const res = await makeRequest('POST', `/api/kcd/packages/${createdPackageTracking}/delete`, {});

  if (!res.ok) {
    log('ERROR', `Failed to delete package: ${JSON.stringify(res.data)}`, 'error');
    return false;
  }

  console.log('\n📥 DELETE RESPONSE:');
  console.log(JSON.stringify(res.data, null, 2));

  if (res.data?.success) {
    log('SUCCESS', `Package deleted from database!`, 'success');
    log('INFO', `Deleted Tracking: ${res.data.deleted?.trackingNumber || createdPackageTracking}`);
    log('INFO', `Deleted At: ${res.data.deleted?.deletedAt || new Date().toISOString()}`);

    // Verify deletion
    log('ACTION', 'Verifying deletion (should return 404)...');
    const verifyRes = await makeRequest('GET', `/api/kcd/packages/${createdPackageTracking}`);

    if (verifyRes.status === 404) {
      log('SUCCESS', `✅ Package no longer exists in database (404 confirmed)`, 'success');
    } else {
      log('WARNING', `Package still exists (status: ${verifyRes.status})`, 'warning');
    }

    return true;
  }

  return false;
}

// ==================== MAIN ====================

async function runAllSteps() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'KCD API STEP-BY-STEP TEST' + ' '.repeat(23) + '║');
  console.log('║' + ' '.repeat(5) + 'Real Database Operations with Live Data' + ' '.repeat(14) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log(`\n🌐 URL: ${API_BASE_URL}`);
  console.log(`🔑 Token: ${API_TOKEN.substring(0, 20)}...`);

  const results = [];

  // Run each step sequentially
  results.push({ name: 'Get Customers', success: await step1_GetCustomers() });
  results.push({ name: 'Add Package', success: await step2_AddPackage() });
  results.push({ name: 'Get Package', success: await step3_GetPackage() });
  results.push({ name: 'Update Package', success: await step4_UpdatePackage() });
  results.push({ name: 'Update Manifest', success: await step5_UpdateManifest() });
  results.push({ name: 'Delete Package', success: await step6_DeletePackage() });

  // Final Summary
  section('FINAL SUMMARY - ALL DATABASE OPERATIONS');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('');
  results.forEach((r, i) => {
    const icon = r.success ? '✅' : '❌';
    const color = r.success ? colors.green : colors.red;
    console.log(`   ${color}${icon} Step ${i + 1}: ${r.name}${colors.reset}`);
  });

  console.log('\n');
  console.log(`   📊 Total: ${results.length} steps`);
  console.log(`   ${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n   🎉 ${colors.green}ALL ENDPOINTS WORKING WITH REAL DATABASE!${colors.reset}`);
  } else {
    console.log(`\n   ⚠️ ${colors.yellow}Some steps failed - check logs above${colors.reset}`);
  }

  console.log('');
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runAllSteps().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
