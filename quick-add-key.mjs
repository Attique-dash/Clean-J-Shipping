import mongoose from 'mongoose';

const API_KEY = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

// Get MongoDB URI from user input or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://warehouse:Pass1234@cluster0.0ot8p.mongodb.net/warehouse_db?retryWrites=true&w=majority';

async function addKey() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected');
    
    const schema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      name: String,
      courierCode: String,
      isActive: Boolean,
      active: Boolean,
      createdAt: Date
    });
    
    const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', schema);
    
    // Delete old entry if exists and re-add
    await ApiKey.deleteOne({ key: API_KEY });
    
    await ApiKey.create({
      key: API_KEY,
      name: 'KCD Askenish Key',
      courierCode: 'CLEANJ',
      isActive: true,
      active: true,
      createdAt: new Date()
    });
    
    console.log('✓ API key added to database');
    console.log('Test again with: node test-kcd-all-methods.js');
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\nPlease provide your MongoDB URI:');
    console.log('MONGODB_URI=your-uri node quick-add-key.mjs');
  }
}

addKey();
