#!/usr/bin/env ts-node
/**
 * Add KCD API Key to database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from warehouse-backend
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

const KCD_API_KEY = 'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';

const addKcdApiKey = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Check if API key already exists
    const existingKey = await mongoose.connection.collection('apikeys').findOne({ key: KCD_API_KEY });
    
    if (existingKey) {
      console.log('✅ API key already exists in database');
      console.log('Key details:', {
        name: existingKey.name,
        courierCode: existingKey.courierCode,
        isActive: existingKey.isActive
      });
    } else {
      // Create new API key
      const newKey = {
        key: KCD_API_KEY,
        name: 'KCD Production Key',
        description: 'API key for KCD warehouse integration',
        courierCode: 'CLEAN',
        permissions: ['webhook:package', 'webhook:manifest', 'webhook:update'],
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await mongoose.connection.collection('apikeys').insertOne(newKey);
      console.log('✅ API key added successfully!');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addKcdApiKey();
