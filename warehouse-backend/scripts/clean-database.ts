import { connectDatabase, disconnectDatabase } from '../src/config/database';
import mongoose from 'mongoose';

const cleanDatabase = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`- ${col.name}`));

    // Drop all collections
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`✅ Dropped collection: ${collection.name}`);
    }

    console.log('\n🗑️  All collections deleted successfully!');
    
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from database');
  }
};

cleanDatabase();
