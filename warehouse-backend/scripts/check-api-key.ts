/**
 * Script to check the status of a KCD API key in the database
 * Usage: npx ts-node scripts/check-api-key.ts <api-key>
 */

import mongoose from 'mongoose';
import { KcdApiKey } from '../src/models/KcdApiKey';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse';

async function checkApiKey(apiKey: string) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Checking API key: ${apiKey.substring(0, 15)}...\n`);

    // Find the key (without filtering by isActive)
    const key = await KcdApiKey.findOne({ apiKey: apiKey.trim() })
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!key) {
      console.log('❌ API KEY NOT FOUND');
      console.log('\n📝 The API key does not exist in the database.');
      console.log('💡 Solution: Generate a new API key using:');
      console.log('   POST /api/admin/api-keys/kcd');
      console.log('\n   Body: {');
      console.log('     "courierCode": "CLEAN",');
      console.log('     "expiresIn": 365,');
      console.log('     "description": "KCD Logistics Integration API Key"');
      console.log('   }');
      process.exit(1);
    }

    console.log('✅ API KEY FOUND\n');
    console.log('📋 Key Details:');
    console.log('─'.repeat(50));
    console.log(`ID:              ${key._id}`);
    console.log(`Courier Code:    ${key.courierCode}`);
    console.log(`Description:     ${key.description || 'N/A'}`);
    console.log(`Is Active:       ${key.isActive ? '✅ YES' : '❌ NO'}`);
    console.log(`Created At:      ${key.createdAt}`);
    console.log(`Expires At:      ${key.expiresAt}`);
    console.log(`Last Used:       ${key.lastUsed || 'Never'}`);
    console.log(`Usage Count:     ${key.usageCount || 0}`);
    
    if (key.createdBy) {
      const creator = key.createdBy as any;
      console.log(`Created By:      ${creator.firstName} ${creator.lastName} (${creator.email})`);
    }

    if (key.deactivatedAt) {
      console.log(`Deactivated At:  ${key.deactivatedAt}`);
    }

    console.log('─'.repeat(50));

    // Check if expired
    const now = new Date();
    const isExpired = key.expiresAt && new Date(key.expiresAt) < now;
    
    if (isExpired) {
      console.log('\n⚠️  API KEY HAS EXPIRED');
      console.log(`   Expired on: ${key.expiresAt}`);
      console.log('\n💡 Solution: Generate a new API key using:');
      console.log('   POST /api/admin/api-keys/kcd');
    } else if (!key.isActive) {
      console.log('\n⚠️  API KEY IS INACTIVE');
      console.log('\n💡 Solutions:');
      console.log('   1. Reactivate the key: PUT /api/admin/api-keys/:keyId/activate');
      console.log('   2. Generate a new key: POST /api/admin/api-keys/kcd');
    } else {
      console.log('\n✅ API KEY IS VALID AND ACTIVE');
      console.log('   You can use this key to authenticate requests.');
    }

    // Check if key can be used
    const canUse = key.isActive && !isExpired;
    console.log(`\n🔐 Can Use: ${canUse ? '✅ YES' : '❌ NO'}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
    process.exit(canUse ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get API key from command line arguments
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ Error: API key is required');
  console.log('\nUsage: npx ts-node scripts/check-api-key.ts <api-key>');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/check-api-key.ts kcd_live_BJ4s80VKiFtFbbRl1O4f7wm2jBGccEPP');
  process.exit(1);
}

checkApiKey(apiKey);
