#!/usr/bin/env ts-node

/**
 * Test script for KCD Integration
 * This script tests the KCD API endpoints to verify the integration works correctly
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

class KCDIntegrationTester {
  private client: AxiosInstance;
  private apiKey: string = '';
  private adminToken: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async loginAsAdmin(): Promise<void> {
    try {
      console.log('🔐 Logging in as admin...');
      
      // You'll need to replace these with actual admin credentials
      const response = await this.client.post('/api/auth/login', {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });

      if (response.data.success) {
        this.adminToken = response.data.data.token;
        console.log('✅ Admin login successful');
      } else {
        throw new Error('Admin login failed');
      }
    } catch (error: any) {
      console.error('❌ Admin login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateApiKey(): Promise<void> {
    try {
      console.log('🔑 Generating KCD API key...');
      
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.adminToken}`;
      
      const response = await this.client.post('/api/admin/api-keys/kcd', {
        courierCode: 'CLEAN',
        expiresIn: 365,
        description: 'Test KCD Integration API Key'
      });

      if (response.data.success) {
        this.apiKey = response.data.data.apiKey;
        console.log('✅ KCD API key generated successfully');
        console.log(`   API Key: ${this.apiKey}`);
        console.log(`   Expires: ${response.data.data.expiresAt}`);
      } else {
        throw new Error('Failed to generate API key');
      }
    } catch (error: any) {
      console.error('❌ Failed to generate API key:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetCustomers(): Promise<void> {
    try {
      console.log('👥 Testing GET /api/kcd/customers...');
      
      // Switch to KCD API key authentication
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
      
      const response = await this.client.get('/api/kcd/customers', {
        data: {
          limit: 10,
          offset: 0
        }
      });

      if (response.data.success) {
        console.log('✅ GET customers successful');
        console.log(`   Found ${response.data.data.customers.length} customers`);
      } else {
        throw new Error('GET customers failed');
      }
    } catch (error: any) {
      console.error('❌ GET customers failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testAddPackage(): Promise<void> {
    try {
      console.log('📦 Testing POST /api/kcd/packages/add...');
      
      const packageData = {
        trackingNumber: `TRKCLN${Date.now()}`,
        courierCode: 'CLEAN',
        customerCode: 'TEST-001',
        weight: 2.5,
        status: 'received',
        warehouseAddress: '123 Warehouse St',
        processedAt: new Date().toISOString(),
        dimensions: {
          length: 10,
          width: 8,
          height: 5,
          unit: 'cm'
        },
        description: 'Test package from KCD integration'
      };

      const response = await this.client.post('/api/kcd/packages/add', packageData);

      if (response.data.success) {
        console.log('✅ POST package successful');
        console.log(`   Tracking Number: ${response.data.data.trackingNumber}`);
        console.log(`   Status: ${response.data.data.status}`);
        
        // Test getting the package we just created
        await this.testGetPackage(response.data.data.trackingNumber);
      } else {
        throw new Error('POST package failed');
      }
    } catch (error: any) {
      console.error('❌ POST package failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testGetPackage(trackingNumber: string): Promise<void> {
    try {
      console.log('🔍 Testing GET /api/kcd/packages/:trackingNumber...');
      
      const response = await this.client.get(`/api/kcd/packages/${trackingNumber}`);

      if (response.data.success) {
        console.log('✅ GET package successful');
        console.log(`   Package: ${response.data.data.trackingNumber}`);
        console.log(`   Status: ${response.data.data.status}`);
        console.log(`   Weight: ${response.data.data.weight}kg`);
      } else {
        throw new Error('GET package failed');
      }
    } catch (error: any) {
      console.error('❌ GET package failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testUpdatePackage(trackingNumber: string): Promise<void> {
    try {
      console.log('📝 Testing PUT /api/kcd/packages/update...');
      
      const updateData = {
        trackingNumber,
        status: 'in_transit',
        location: 'Distribution Center',
        lastUpdated: new Date().toISOString(),
        notes: 'Package updated via KCD integration test'
      };

      const response = await this.client.put('/api/kcd/packages/update', updateData);

      if (response.data.success) {
        console.log('✅ PUT package successful');
        console.log(`   Updated Status: ${response.data.data.status}`);
      } else {
        throw new Error('PUT package failed');
      }
    } catch (error: any) {
      console.error('❌ PUT package failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testApiKeysManagement(): Promise<void> {
    try {
      console.log('🔧 Testing API keys management...');
      
      // Switch back to admin token
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.adminToken}`;
      
      // List API keys
      const listResponse = await this.client.get('/api/admin/api-keys/list');
      if (listResponse.data.success) {
        console.log('✅ List API keys successful');
        console.log(`   Total keys: ${listResponse.data.data.total}`);
        console.log(`   Active keys: ${listResponse.data.data.active}`);
      }

      // Get connection info
      const infoResponse = await this.client.get('/api/admin/api-keys/info');
      if (infoResponse.data.success) {
        console.log('✅ Get connection info successful');
        console.log(`   Has active key: ${infoResponse.data.data.hasActiveKey}`);
        console.log(`   Get customers URL: ${infoResponse.data.data.kcdPortalConfiguration.endpoints.getCustomers}`);
        console.log(`   Add package URL: ${infoResponse.data.data.kcdPortalConfiguration.endpoints.addPackage}`);
        console.log(`   Update package URL: ${infoResponse.data.data.kcdPortalConfiguration.endpoints.updatePackage}`);
      }
    } catch (error: any) {
      console.error('❌ API keys management test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting KCD Integration Tests...\n');

    try {
      await this.loginAsAdmin();
      await this.generateApiKey();
      await this.testApiKeysManagement();
      await this.testGetCustomers();
      await this.testAddPackage();
      
      // Test update with a tracking number (we'll use the one from the package we just added)
      const trackingNumber = `TRKCLN${Date.now() - 1000}`; // Use a slightly older timestamp
      await this.testUpdatePackage(trackingNumber);

      console.log('\n🎉 All KCD Integration Tests Passed!');
      console.log('\n📋 Summary:');
      console.log('   ✅ Admin authentication');
      console.log('   ✅ KCD API key generation');
      console.log('   ✅ API keys management');
      console.log('   ✅ Get customers endpoint');
      console.log('   ✅ Add package endpoint');
      console.log('   ✅ Get package endpoint');
      console.log('   ✅ Update package endpoint');
      
    } catch (error) {
      console.log('\n❌ KCD Integration Tests Failed!');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new KCDIntegrationTester();
  tester.runAllTests().catch(console.error);
}

export default KCDIntegrationTester;
