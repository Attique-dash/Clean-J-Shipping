#!/usr/bin/env node
/**
 * Script to add the KCD API key to the database
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// The token from Askenish portal
const KCD_TOKEN = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

// MongoDB URI - you need to set this or it will use a default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/courier_db?retryWrites=true&w=majority';

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function addKcdApiKey() {
  console.log('='.repeat(60));
  console.log('Adding KCD API Key to Database');
  console.log('='.repeat(60));
  console.log(`Token: ${KCD_TOKEN.substring(0, 20)}...`);
  
  if (!process.env.MONGODB_URI) {
    console.log('\n⚠️  WARNING: MONGODB_URI environment variable not set!');
    console.log('Please set it before running this script:');
    console.log('  export MONGODB_URI="your-mongodb-connection-string"');
    console.log('\nOr run with the variable:');
    console.log('  MONGODB_URI="your-uri" node add-kcd-api-key.js');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB');

    const db = client.db();
    const apiKeysCollection = db.collection('apikeys');

    // Check if token already exists
    const hashedKey = hashApiKey(KCD_TOKEN);
    const existingKey = await apiKeysCollection.findOne({ key: hashedKey });

    if (existingKey) {
      console.log('\n⚠️  API key already exists in database');
      console.log('Key ID:', existingKey._id);
      console.log('Active:', existingKey.active);
      
      // Ensure it's active
      if (!existingKey.active) {
        await apiKeysCollection.updateOne(
          { _id: existingKey._id },
          { $set: { active: true, lastUsedAt: new Date() } }
        );
        console.log('\n✅ Key reactivated');
      }
    } else {
      // Add new key
      const newKey = {
        key: hashedKey,
        keyPrefix: KCD_TOKEN.substring(0, 12),
        name: 'Askenish KCD Integration',
        permissions: ['kcd:read', 'kcd:write', 'kcd:delete'],
        active: true,
        createdAt: new Date(),
        usageCount: 0
      };

      const result = await apiKeysCollection.insertOne(newKey);
      console.log('\n✅ API key added successfully');
      console.log('Key ID:', result.insertedId);
    }

    // List all active API keys
    console.log('\n' + '='.repeat(60));
    console.log('Active API Keys in Database:');
    console.log('='.repeat(60));
    
    const allKeys = await apiKeysCollection.find({ active: true }).toArray();
    allKeys.forEach((key, index) => {
      console.log(`\n${index + 1}. ${key.name}`);
      console.log(`   ID: ${key._id}`);
      console.log(`   Prefix: ${key.keyPrefix}...`);
      console.log(`   Created: ${key.createdAt}`);
      console.log(`   Usage: ${key.usageCount || 0}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ KCD API Key setup complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

addKcdApiKey();
