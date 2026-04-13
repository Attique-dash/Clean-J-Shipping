#!/usr/bin/env node
/**
 * Diagnostic script for KCD API issues
 */

const API_BASE_URL = 'https://cleanjshipping.vercel.app';
const API_TOKEN = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

console.log('🔍 KCD API Diagnostics');
console.log('=======================\n');

// Test 1: Simple GET with query param (most basic KCD format)
async function test1() {
  console.log('Test 1: GET /api/kcd/customers?id=TOKEN');
  try {
    const res = await fetch(`${API_BASE_URL}/api/kcd/customers?id=${API_TOKEN}`);
    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}`);
    return res.ok;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return false;
  }
}

// Test 2: POST with APIToken in body
async function test2() {
  console.log('\nTest 2: POST /api/kcd/packages/add with APIToken in body');
  try {
    const res = await fetch(`${API_BASE_URL}/api/kcd/packages/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        APIToken: API_TOKEN,
        trackingNumber: `DIAG-${Date.now()}`,
        customerMailbox: 'CLEAN-0007',
        weight: 1.0,
        shipper: 'Test'
      })
    });
    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}`);
    return res.ok;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return false;
  }
}

// Test 3: Check if backend is Express or Next.js
async function test3() {
  console.log('\nTest 3: Check backend type (response format)');
  try {
    const res = await fetch(`${API_BASE_URL}/api/kcd/customers`, {
      headers: { 'x-api-key': 'invalid-key-test' }
    });
    const data = await res.json();
    // Express backend returns: { success: false, message: "..." }
    // Next.js backend returns: { error: "..." }
    if (data.success === false && data.message) {
      console.log('  ✅ Backend: Express (warehouse-backend)');
      return 'express';
    } else if (data.error) {
      console.log('  ✅ Backend: Next.js');
      return 'nextjs';
    }
    console.log(`  Unknown backend format: ${JSON.stringify(data)}`);
    return 'unknown';
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return 'error';
  }
}

// Run all tests
async function runDiagnostics() {
  const results = {
    t1: await test1(),
    t2: await test2(),
    backend: await test3()
  };

  console.log('\n=======================');
  console.log('📊 DIAGNOSIS:');
  console.log('=======================\n');

  if (results.backend === 'express') {
    console.log('The requests are going to the Express backend (warehouse-backend).');
    console.log('');
    if (!results.t1 && !results.t2) {
      console.log('❌ PROBLEM: Both auth methods fail');
      console.log('');
      console.log('POSSIBLE CAUSES:');
      console.log('1. KCD_API_KEY environment variable is NOT set in Vercel');
      console.log('2. The API key is NOT in the database');
      console.log('3. The deployment did not include the authKcd.ts fixes');
      console.log('');
      console.log('SOLUTIONS:');
      console.log('A. Verify KCD_API_KEY is set in Vercel dashboard');
      console.log('B. Add the API key to the database');
      console.log('C. Rebuild and redeploy warehouse-backend');
    }
  } else if (results.backend === 'nextjs') {
    console.log('The requests are going to Next.js routes.');
    console.log('Check src/lib/api-key-validation.ts for KCD_API_KEY support.');
  }

  console.log('\n=======================');
  console.log('🔧 NEXT STEPS:');
  console.log('=======================');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Find your warehouse-backend project');
  console.log('3. Check Settings → Environment Variables');
  console.log('4. Verify KCD_API_KEY is set to: ' + API_TOKEN.substring(0, 20) + '...');
  console.log('5. If not set, add it and redeploy');
}

runDiagnostics();
