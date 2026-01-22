const mongoose = require('mongoose');

// Import models directly
const ApiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  keyPrefix: { type: String, required: true },
  name: { type: String, required: true },
  permissions: [{ type: String }],
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  usageCount: { type: Number, default: 0 },
});

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);

function generateApiKey() {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(24);
  const key = `wh_live_${randomBytes.toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

require('dotenv').config({ path: '.env.local' });

async function seedApiKeys() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to MongoDB');

    // Clear existing test API keys
    await ApiKey.deleteMany({ keyPrefix: /^wh_test_/ });
    console.log('Cleared existing test API keys');

    // Create test API key with all permissions
    const testKeyData = generateApiKey();
    const testKey = new ApiKey({
      key: testKeyData.hash,
      keyPrefix: 'wh_test_abc123', // Override prefix to match your test
      name: 'Test API Key (Full Access)',
      permissions: [
        'customers:read',
        'customers:write',
        'packages:read',
        'packages:write',
        'inventory:read',
        'inventory:write',
        'manifests:read',
        'manifests:write',
        'reports:read',
        'analytics:read'
      ],
      active: true,
      usageCount: 0
    });

    await testKey.save();
    console.log('Test API Key created:');
    console.log('Key Prefix: wh_test_abc123');
    console.log('Full Key: wh_test_' + testKeyData.key.substring(8)); // Show the actual key
    console.log('Permissions: All warehouse permissions');
    console.log('');
    console.log('You can now test with:');
    console.log('http://localhost:3000/api/warehouse/pullcustomer/subdir?id=wh_test_abc123');

  } catch (error) {
    console.error('Error seeding API keys:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedApiKeys();
