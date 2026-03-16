#!/usr/bin/env node

/**
 * Simple test for KCD package endpoints
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test data for KCD package creation
const kcdPackageData = {
  UserCode: "CLEAN-0007",                // Required field
  Weight: 3.2,                           // Required field
  TrackingNumber: "KCD-20240311-123456",   // Alternative tracking
  FirstName: "John",
  LastName: "Doe", 
  Shipper: "Test Shipping",
  Description: "KCD test package",
  Length: 25,
  Width: 18,
  Height: 12,
  Pieces: 2,
  Branch: "Main Warehouse"
};

const testKcdPackageEndpoints = async () => {
  try {
    const apiKey = process.argv[2] || process.env.KCD_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Error: No KCD API key provided');
      console.log('\nUsage:');
      console.log('  npm run test:kcd-simple your_kcd_api_key');
      console.log('  KCD_API_KEY=your_key npm run test:kcd-simple');
      console.log('\nTo get a KCD API key, use the admin panel or existing test scripts');
      process.exit(1);
    }
    
    console.log('🚀 Testing KCD Package Endpoints');
    console.log('=================================');
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    console.log(`🔑 Using KCD API Key: ${apiKey.substring(0, 20)}...`);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-KCD-API-Key': apiKey
    };
    
    // Test 1: Get all packages
    console.log('\n📋 Test 1: Get All Packages');
    console.log('--------------------------------');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/kcd/packages`, { headers });
      console.log('✅ Success!');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Total Packages: ${response.data.data?.packages?.length || 0}`);
      if (response.data.data?.packages?.length > 0) {
        console.log('📦 First Package:');
        console.log(JSON.stringify(response.data.data.packages[0], null, 2));
      }
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Add new package
    console.log('\n📦 Test 2: Add New Package');
    console.log('--------------------------------');
    console.log('📋 Package Data:');
    console.log(JSON.stringify(kcdPackageData, null, 2));
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/kcd/packages/add`, kcdPackageData, { headers });
      console.log('✅ Success!');
      console.log(`📊 Status: ${response.status}`);
      console.log('📦 Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Store the tracking number for next test
      const trackingNumber = response.data.data?.[0]?.TrackingNumber;
      if (trackingNumber) {
        console.log(`\n🔄 Using tracking number for next test: ${trackingNumber}`);
        
        // Test 3: Get package by tracking number
        console.log('\n🔍 Test 3: Get Package by Tracking Number');
        console.log('-------------------------------------------');
        try {
          const getResponse = await axios.get(`${API_BASE_URL}/api/kcd/packages/${trackingNumber}`, { headers });
          console.log('✅ Success!');
          console.log(`📊 Status: ${getResponse.status}`);
          console.log('📦 Package Details:');
          console.log(JSON.stringify(getResponse.data, null, 2));
        } catch (error: any) {
          console.error('❌ Error:', error.response?.data?.message || error.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.log('\n🔧 Troubleshooting:');
        console.log('- Check if KCD API key is valid');
        console.log('- Ensure key is generated via admin endpoint');
        console.log('- Key should be 48 characters, alphanumeric only');
      }
    }
    
    console.log('\n✅ KCD Package API Testing Complete!');
    console.log('\n📚 Full API Documentation:');
    console.log(`   Swagger UI: ${API_BASE_URL}/docs`);
    console.log(`   API Docs: ${API_BASE_URL}/api-docs`);
    
  } catch (error: any) {
    console.error('💥 Setup error:', error.message);
    process.exit(1);
  }
};

testKcdPackageEndpoints();
