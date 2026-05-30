// Script to drop the legacy trackingNumber unique index if it exists
// Run with: node scripts/drop-tracking-number-index.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function dropLegacyTrackingNumberIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const packagesCollection = db.collection('packages');
    
    // Check existing indexes
    const indexes = await packagesCollection.indexes();
    console.log('Current indexes:', indexes.map(i => ({ name: i.name, key: i.key })));
    
    // Drop the legacy trackingNumber_1 index if it exists
    const trackingNumberIndex = indexes.find(i => i.name === 'trackingNumber_1');
    if (trackingNumberIndex) {
      console.log('Found legacy trackingNumber_1 index, dropping it...');
      await packagesCollection.dropIndex('trackingNumber_1');
      console.log('Successfully dropped trackingNumber_1 index');
    } else {
      console.log('No legacy trackingNumber_1 index found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropLegacyTrackingNumberIndex();
