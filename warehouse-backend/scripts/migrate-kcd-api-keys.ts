import mongoose from 'mongoose';
import { ApiKey } from '../src/models/ApiKey';
import { KcdApiKey } from '../src/models/KcdApiKey';

/**
 * Migration script to consolidate KcdApiKey records into the unified ApiKey model
 * This script should be run once to migrate existing KCD API keys to the new unified model
 */

async function migrateKcdApiKeys() {
  try {
    console.log('🔄 Starting migration of KcdApiKey to unified ApiKey model...');

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse-backend');
    }

    // Find all existing KcdApiKey records
    const existingKcdKeys = await KcdApiKey.find({});
    console.log(`📊 Found ${existingKcdKeys.length} existing KCD API keys to migrate`);

    for (const kcdKey of existingKcdKeys) {
      // Check if this key already exists in the unified ApiKey model
      const existingUnifiedKey = await ApiKey.findOne({ 
        key: kcdKey.apiKey,
        courierCode: { $exists: true }
      });

      if (existingUnifiedKey) {
        console.log(`⚠️  Key for courier ${kcdKey.courierCode} already exists in unified model, skipping...`);
        continue;
      }

      // Create new unified ApiKey record
      const unifiedKey = new ApiKey({
        key: kcdKey.apiKey,
        name: `KCD ${kcdKey.courierCode} Integration`,
        description: kcdKey.description || 'KCD Logistics Integration API Key',
        courierCode: kcdKey.courierCode,
        permissions: ['kcd_integration'],
        isActive: kcdKey.isActive,
        expiresAt: kcdKey.expiresAt,
        lastUsed: kcdKey.lastUsed,
        usageCount: kcdKey.usageCount || 0,
        createdBy: kcdKey.createdBy,
        createdAt: kcdKey.createdAt,
        updatedAt: kcdKey.updatedAt
      });

      await unifiedKey.save();
      console.log(`✅ Migrated key for courier ${kcdKey.courierCode} (ID: ${unifiedKey._id})`);
    }

    console.log('🎉 Migration completed successfully!');
    
    // Optional: Clean up old KcdApiKey records after successful migration
    console.log('🧹 Cleaning up old KcdApiKey records...');
    await KcdApiKey.deleteMany({});
    console.log('✅ Old KcdApiKey records cleaned up');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateKcdApiKeys()
    .then(() => {
      console.log('🎯 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateKcdApiKeys;
