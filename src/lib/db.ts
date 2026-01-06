import mongoose from 'mongoose';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Please define the DATABASE_URL environment variable in .env.local');
}

interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedMongoose;
}

const cached: CachedMongoose = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000, // 30 seconds
    };

    console.log('🔌 Attempting to connect to MongoDB...');
    cached.promise = mongoose.connect(DATABASE_URL as string, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e);
    throw e;
  }
}

export default dbConnect;

// Alias for backward compatibility
export const connectToDatabase = dbConnect;