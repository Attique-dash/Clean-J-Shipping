#!/usr/bin/env ts-node

/**
 * KCD API Endpoints Test Script
 * 
 * This script tests all KCD-related endpoints to ensure they work correctly:
 * 1. Admin authentication
 * 2. KCD API key generation (with auto-resolved warehouseId)
 * 3. KCD connection info retrieval
 * 4. Warehouse endpoints with API key authentication
 * 5. Webhook endpoints
 */

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

interface TestResult {
  success: boolean;
  endpoint: string;
  method: string;
  status?: number;
  message: string;
  data?: any;
  error?: any;
}

class KCDEndpointTester {
  private adminToken: string | null = null;
  private kcdApiKey: string | null = null;
  private results: TestResult[] = [];

  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<TestResult> {
    try {
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      console.log(`🔄 ${method} ${endpoint}`);
      const response = await axios(config);
      
      const result: TestResult = {
        success: true,
        endpoint,
        method,
        status: response.status,
        message: 'Success',
        data: response.data
      };

      console.log(`✅ ${method} ${endpoint} - ${response.status}`);
      return result;
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        endpoint,
        method,
        status: error.response?.status,
        message: error.message,
        error: error.response?.data || error.message
      };

      console.log(`❌ ${method} ${endpoint} - ${error.response?.status || 'ERROR'}: ${error.message}`);
      return result;
    }
  }

  async testAdminLogin(): Promise<void> {
    console.log('\n🔐 Testing Admin Login...');
    
    // Try to login with default admin credentials or environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@warehouse.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const result = await this.makeRequest('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword
    });

    if (result.success && result.data?.data?.token) {
      this.adminToken = result.data.data.token;
      console.log(`🎫 Admin token acquired: ${this.adminToken?.substring(0, 20)}...`);
    }

    this.results.push(result);
  }

  async testKCDApiKeyGeneration(): Promise<void> {
    console.log('\n🔑 Testing KCD API Key Generation...');
    
    if (!this.adminToken) {
      console.log('❌ No admin token available');
      return;
    }

    // Test without warehouseId (should auto-resolve)
    const result = await this.makeRequest('POST', '/admin/api-keys/kcd', {}, {
      'Authorization': `Bearer ${this.adminToken}`
    });

    if (result.success && result.data?.data?.apiKey) {
      this.kcdApiKey = result.data.data.apiKey;
      console.log(`🎫 KCD API key generated: ${this.kcdApiKey?.substring(0, 20)}...`);
      
      // Log the KCD portal configuration
      if (result.data.data.nextSteps) {
        console.log('\n📋 Next Steps:');
        result.data.data.nextSteps.forEach((step: string, index: number) => {
          console.log(`  ${step}`);
        });
      }
    }

    this.results.push(result);
  }

  async testKCDConnectionInfo(): Promise<void> {
    console.log('\n📡 Testing KCD Connection Info...');
    
    if (!this.adminToken) {
      console.log('❌ No admin token available');
      return;
    }

    const result = await this.makeRequest('GET', '/admin/api-keys/info', undefined, {
      'Authorization': `Bearer ${this.adminToken}`
    });

    this.results.push(result);
  }

  async testWarehouseEndpointsWithApiKey(): Promise<void> {
    console.log('\n🏪 Testing Warehouse Endpoints with API Key...');
    
    if (!this.kcdApiKey) {
      console.log('❌ No KCD API key available');
      return;
    }

    const headers = { 'X-API-Key': this.kcdApiKey };

    // Test customers endpoint
    const customersResult = await this.makeRequest('GET', '/warehouse/customers', undefined, headers);
    this.results.push(customersResult);

    // Test packages search endpoint
    const packagesResult = await this.makeRequest('GET', '/warehouse/packages/search', undefined, headers);
    this.results.push(packagesResult);

    // Test add package endpoint
    const addPackageResult = await this.makeRequest('POST', '/warehouse/packages/add', {
      trackingNumber: `TEST${Date.now()}`,
      userCode: 'TEST-001',
      weight: 2.5,
      serviceMode: 'air',
      shipper: 'Test Shipper',
      description: 'Test package from KCD endpoint test'
    }, headers);
    this.results.push(addPackageResult);

    // If package was created, test update
    if (addPackageResult.success && addPackageResult.data?.data?.id) {
      const packageId = addPackageResult.data.data.id;
      const updateResult = await this.makeRequest('PUT', `/warehouse/packages/${packageId}`, {
        weight: 3.0,
        description: 'Updated test package'
      }, headers);
      this.results.push(updateResult);
    }
  }

  async testWebhookEndpoints(): Promise<void> {
    console.log('\n🪝 Testing Webhook Endpoints...');
    
    if (!this.kcdApiKey) {
      console.log('❌ No KCD API key available');
      return;
    }

    const headers = { 'X-API-Key': this.kcdApiKey };

    // Test package-created webhook
    const packageCreatedResult = await this.makeRequest('POST', '/webhooks/kcd/package-created', {
      trackingNumber: `WEBHOOK${Date.now()}`,
      userCode: 'TEST-001',
      weight: 1.5,
      serviceMode: 'air',
      status: 'received'
    }, headers);
    this.results.push(packageCreatedResult);

    // Test package-updated webhook
    const packageUpdatedResult = await this.makeRequest('POST', '/webhooks/kcd/package-updated', {
      trackingNumber: `WEBHOOK${Date.now()}`,
      status: 'in_transit',
      location: 'Test Location'
    }, headers);
    this.results.push(packageUpdatedResult);

    // Test manifest-created webhook
    const manifestCreatedResult = await this.makeRequest('POST', '/webhooks/kcd/manifest-created', {
      manifestId: `MANIFEST${Date.now()}`,
      packages: [
        { trackingNumber: `PKG${Date.now()}`, status: 'received' }
      ],
      createdAt: new Date().toISOString()
    }, headers);
    this.results.push(manifestCreatedResult);

    // Test webhook test endpoint
    const testResult = await this.makeRequest('POST', '/webhooks/kcd/test', {}, headers);
    this.results.push(testResult);
  }

  async testAPIKeyManagement(): Promise<void> {
    console.log('\n🔧 Testing API Key Management...');
    
    if (!this.adminToken) {
      console.log('❌ No admin token available');
      return;
    }

    const headers = { 'Authorization': `Bearer ${this.adminToken}` };

    // List all API keys
    const listResult = await this.makeRequest('GET', '/admin/api-keys', undefined, headers);
    this.results.push(listResult);

    // If we have a key ID, test deactivation/activation
    if (listResult.success && listResult.data?.data?.apiKeys?.length > 0) {
      const keyId = listResult.data.data.apiKeys[0].id;
      
      // Test deactivation
      const deactivateResult = await this.makeRequest('PUT', `/admin/api-keys/${keyId}/deactivate`, undefined, headers);
      this.results.push(deactivateResult);

      // Test activation
      const activateResult = await this.makeRequest('PUT', `/admin/api-keys/${keyId}/activate`, undefined, headers);
      this.results.push(activateResult);
    }
  }

  printSummary(): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => r.success === false).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => r.success === false)
        .forEach(r => {
          console.log(`  ${r.method} ${r.endpoint} - ${r.status || 'ERROR'}: ${r.message}`);
          if (r.error) {
            console.log(`    Details: ${JSON.stringify(r.error, null, 2)}`);
          }
        });
    }

    console.log('\n🔗 ENDPOINTS TESTED:');
    this.results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`  ${status} ${r.method} ${r.endpoint}`);
    });

    console.log('\n🌐 Swagger Documentation: http://localhost:5000/docs');
    console.log('📚 API Docs JSON: http://localhost:5000/api-docs');
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting KCD API Endpoints Test...');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log('='.repeat(50));

    try {
      await this.testAdminLogin();
      await this.testKCDApiKeyGeneration();
      await this.testKCDConnectionInfo();
      await this.testWarehouseEndpointsWithApiKey();
      await this.testWebhookEndpoints();
      await this.testAPIKeyManagement();
    } catch (error) {
      console.error('💥 Test suite crashed:', error);
    }

    this.printSummary();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new KCDEndpointTester();
  tester.runAllTests().catch(console.error);
}

export { KCDEndpointTester };
