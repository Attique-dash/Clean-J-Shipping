import { connectDatabase, disconnectDatabase } from '../src/config/database';
import mongoose from 'mongoose';

const checkCollections = async () => {
  try {
    await connectDatabase();
    console.log('=== CURRENT COLLECTIONS ===\n');

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Total collections: ${collections.length}\n`);
    
    // Check document count in each collection
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documents`);
    }

  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    await disconnectDatabase();
  }
};

checkCollections();
