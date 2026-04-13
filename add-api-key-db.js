#!/usr/bin/env node
/**
 * Add KCD API Key to Database
 * This ensures the API key is recognized even if KCD_API_KEY env var isn't loaded
 */

const API_KEY = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

async function addApiKey() {
  console.log('Adding API key to database...');
  
  try {
    // Try to import from warehouse-backend
    const { default: mongoose } = await import('mongoose');
    
    const MONGODB_URI = process.env.MONGODB_URI || 
      'mongodb+srv://warehouse:Pass1234@cluster0.0ot8p.mongodb.net/warehouse_db?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to database');
    
    // Define schema
    const ApiKeySchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      name: { type: String, default: 'KCD API Key' },
      courierCode: { type: String, default: 'CLEANJ' },
      isActive: { type: Boolean, default: true },
      active: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: null },
      lastUsedAt: { type: Date },
      usageCount: { type: Number, default: 0 }
    });
    
    const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);
    
    // Check if key exists
    const existing = await ApiKey.findOne({ key: API_KEY });
    if (existing) {
      console.log('✓ API key already exists:', existing.name);
      await mongoose.disconnect();
      return;
    }
    
    // Add the key
    const newKey = await ApiKey.create({
      key: API_KEY,
      name: 'KCD Askenish Key (auto-added)',
      courierCode: 'CLEANJ',
      isActive: true,
      active: true
    });
    
    console.log('✓ API key added successfully:', newKey._id);
    
    await mongoose.disconnect();
    console.log('✓ Disconnected from database');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nAlternative: Add key via API endpoint:');
    console.log(`curl -X POST ${process.env.API_URL || 'https://cleanjshipping.vercel.app'}/api/admin/api-keys/kcd \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\\n  -d '{"key":"${API_KEY}","name":"KCD Key","courierCode":"CLEANJ"}'`);
    process.exit(1);
  }
}

addApiKey();
