// lib/db.ts
import mongoose from 'mongoose';
import { toast } from 'react-hot-toast';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  const errorMsg = '❌ MONGODB_URI is not defined in .env.local';
  if (typeof window !== 'undefined') {
    toast.error('Database configuration error. Please contact support.');
  }
  throw new Error(errorMsg);
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastConnectionAttempt: number;
}

// Use global to cache the mongoose connection
declare global {
  var mongoose: CachedConnection | undefined;
}

const CONNECTION_TIMEOUT = 5000; // 5 seconds
const RECONNECT_INTERVAL = 5000; // 5 seconds

let cached: CachedConnection = global.mongoose || { 
  conn: null, 
  promise: null, 
  lastConnectionAttempt: 0 
};

if (!global.mongoose) {
  global.mongoose = cached;
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  if (typeof window !== 'undefined') {
    toast.error('Database connection error. Please try again later.');
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cached.conn = null;
  cached.promise = null;
});

async function connectWithRetry() {
  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT,
      socketTimeoutMS: CONNECTION_TIMEOUT,
    };

    await mongoose.connect(MONGODB_URI, opts);
    console.log('✅ MongoDB Connected Successfully');
    if (typeof window !== 'undefined') {
      toast.success('Connected to database');
    }
    return mongoose;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    if (typeof window !== 'undefined') {
      toast.error('Failed to connect to database. Retrying...');
    }
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, RECONNECT_INTERVAL));
    return connectWithRetry();
  }
}

export default async function dbConnect(): Promise<typeof mongoose> {
  // If we have a cached connection and it's still valid, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Prevent multiple connection attempts within a short time
  const now = Date.now();
  if (cached.promise && (now - cached.lastConnectionAttempt) < RECONNECT_INTERVAL) {
    return (await cached.promise).connection;
  }

  // Create new connection promise
  if (!cached.promise) {
    cached.lastConnectionAttempt = now;
    cached.promise = connectWithRetry().catch(err => {
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Database connection failed:', error);
    if (typeof window !== 'undefined') {
      toast.error('Failed to connect to database');
    }
    throw error;
  }
}

// Also export as named export for flexibility
export { dbConnect };