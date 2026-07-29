// Script to delete invoices from MongoDB
// Usage: node scripts/delete-invoices.js [trackingNumber]
// If trackingNumber is provided, only deletes invoices for that package
// Otherwise, deletes all invoices

const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
let MONGODB_URI = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MONGODB_URI=(.+)/);
  if (match) {
    MONGODB_URI = match[1].trim();
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  console.error('Please ensure .env.local exists and contains MONGODB_URI');
  process.exit(1);
}

// Use MongoDB Node.js driver directly (no mongoose dependency)
const { MongoClient } = require('mongodb');

async function deleteInvoices() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const invoices = db.collection('invoices');
    
    const trackingNumber = process.argv[2];

    if (trackingNumber) {
      // Delete invoices for specific tracking number
      const result = await invoices.deleteMany({ 
        tracking_number: trackingNumber 
      });
      console.log(`✅ Deleted ${result.deletedCount} invoice(s) for tracking number: ${trackingNumber}`);
    } else {
      // Delete all invoices
      const result = await invoices.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} invoice(s) from database`);
    }

    await client.close();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

deleteInvoices();
