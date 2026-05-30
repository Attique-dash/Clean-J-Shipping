// Script to clean up packages with null tracking numbers
// Run with: node scripts/cleanup-null-tracking-numbers.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanupNullTrackingNumbers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const packagesCollection = db.collection('packages');
    
    // Find all packages with null trackingNumber
    const nullTrackingPackages = await packagesCollection.find({
      $or: [
        { TrackingNumber: null },
        { TrackingNumber: '' },
        { trackingNumber: null },
        { trackingNumber: '' }
      ]
    }).toArray();
    
    console.log(`Found ${nullTrackingPackages.length} packages with null/empty tracking numbers`);
    
    if (nullTrackingPackages.length === 0) {
      console.log('No cleanup needed');
      return;
    }
    
    // Delete these packages
    const deleteResult = await packagesCollection.deleteMany({
      $or: [
        { TrackingNumber: null },
        { TrackingNumber: '' },
        { trackingNumber: null },
        { trackingNumber: '' }
      ]
    });
    
    console.log(`Deleted ${deleteResult.deletedCount} packages with null/empty tracking numbers`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupNullTrackingNumbers();
