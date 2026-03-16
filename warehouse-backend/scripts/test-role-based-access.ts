/**
 * Test script to verify role-based access control
 * This script tests that tokens from one role cannot access endpoints meant for other roles
 */

import axios, { AxiosRequestConfig } from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test tokens (replace with actual tokens from your system)
const testTokens: Record<string, string> = {
  customer: process.env.CUSTOMER_TOKEN || 'customer_jwt_token_here',
  warehouse: process.env.WAREHOUSE_TOKEN || 'warehouse_jwt_token_here', 
  admin: process.env.ADMIN_TOKEN || 'admin_jwt_token_here',
  kcdApiKey: process.env.KCD_API_KEY || 'kcd_api_key_here'
};

// Test endpoints by role
const testEndpoints: Record<string, Array<{
  method: string;
  path: string;
  expectedStatus: number;
  data?: any;
}>> = {
  customer: [
    { method: 'GET', path: '/api/customer/packages', expectedStatus: 200 },
    { method: 'GET', path: '/api/customer/profile', expectedStatus: 200 },
    { method: 'GET', path: '/api/warehouse/packages', expectedStatus: 403 },
    { method: 'GET', path: '/api/admin/customers', expectedStatus: 403 }
  ],
  warehouse: [
    { method: 'GET', path: '/api/warehouse/packages', expectedStatus: 200 },
    { method: 'GET', path: '/api/warehouse/customers', expectedStatus: 200 },
    { method: 'GET', path: '/api/customer/packages', expectedStatus: 403 },
    { method: 'GET', path: '/api/admin/customers', expectedStatus: 403 }
  ],
  admin: [
    { method: 'GET', path: '/api/admin/customers', expectedStatus: 200 },
    { method: 'GET', path: '/api/admin/api-keys', expectedStatus: 200 },
    { method: 'GET', path: '/api/warehouse/packages', expectedStatus: 200 },
    { method: 'GET', path: '/api/customer/packages', expectedStatus: 403 }
  ],
  kcd: [
    { method: 'GET', path: '/api/kcd/customers', expectedStatus: 200 },
    { method: 'POST', path: '/api/kcd/packages/add', expectedStatus: 201, data: { trackingNumber: 'TEST123', customerCode: 'CUST001', weight: 1.5 } },
    { method: 'GET', path: '/api/customer/packages', expectedStatus: 401 },
    { method: 'GET', path: '/api/warehouse/packages', expectedStatus: 401 }
  ]
};

async function makeRequest(method: string, path: string, token: string, data: any = null) {
  try {
    const config: AxiosRequestConfig = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {}
    };

    // Use appropriate auth header based on token type
    if (token.startsWith('kcd_live_')) {
      config.headers!['X-API-Key'] = token;
    } else {
      config.headers!['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers!['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { status: response.status, data: response.data };
  } catch (error: any) {
    return { 
      status: error.response?.status || 500, 
      data: error.response?.data || { error: error.message } 
    };
  }
}

async function testRoleAccess() {
  console.log('🔐 Testing Role-Based Access Control\n');
  
  let totalTests = 0;
  let passedTests = 0;

  for (const [role, endpoints] of Object.entries(testEndpoints)) {
    console.log(`\n📋 Testing ${role.toUpperCase()} role:`);
    
    const token = testTokens[role];
    if (!token || token.includes('_here')) {
      console.log(`⚠️  Skipping ${role} tests - token not configured`);
      continue;
    }

    for (const endpoint of endpoints) {
      totalTests++;
      const result = await makeRequest(endpoint.method, endpoint.path, token, endpoint.data);
      
      const passed = result.status === endpoint.expectedStatus;
      if (passed) {
        passedTests++;
        console.log(`  ✅ ${endpoint.method} ${endpoint.path} - ${result.status} (expected ${endpoint.expectedStatus})`);
      } else {
        console.log(`  ❌ ${endpoint.method} ${endpoint.path} - ${result.status} (expected ${endpoint.expectedStatus})`);
        if (result.data?.error || result.data?.message) {
          console.log(`     Error: ${result.data?.error || result.data?.message}`);
        }
      }
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${totalTests - passedTests}`);
  console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All role-based access control tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the authorization configuration.');
  }
}

// Cross-role access test
async function testCrossRoleAccess() {
  console.log('\n🔄 Testing Cross-Role Access Prevention:');
  
  const customerToken = testTokens.customer;
  const warehouseToken = testTokens.warehouse;
  
  if (customerToken && !customerToken.includes('_here')) {
    // Test customer accessing warehouse endpoints
    const result1 = await makeRequest('GET', '/api/warehouse/packages', customerToken);
    console.log(`  Customer → Warehouse: ${result1.status === 403 ? '✅ Blocked' : '❌ Allowed'}`);
    
    // Test customer accessing admin endpoints  
    const result2 = await makeRequest('GET', '/api/admin/customers', customerToken);
    console.log(`  Customer → Admin: ${result2.status === 403 ? '✅ Blocked' : '❌ Allowed'}`);
  }
  
  if (warehouseToken && !warehouseToken.includes('_here')) {
    // Test warehouse accessing customer endpoints
    const result3 = await makeRequest('GET', '/api/customer/packages', warehouseToken);
    console.log(`  Warehouse → Customer: ${result3.status === 403 ? '✅ Blocked' : '❌ Allowed'}`);
  }
}

// Run tests
if (require.main === module) {
  testRoleAccess()
    .then(() => testCrossRoleAccess())
    .catch(console.error);
}

export { testRoleAccess, testCrossRoleAccess };
