// Script to clear invoice upload data from MongoDB
// Usage: node scripts/clear-invoice-upload.js

const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
let MONGODB_URI = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MONGODB_URI=(.+)/);
  if (match) {
    MONGODB_URI = match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  console.error('Please ensure .env.local exists and contains MONGODB_URI');
  process.exit(1);
}

async function clearInvoiceUploadData() {
  console.log('='.repeat(60));
  console.log('CLEAR INVOICE UPLOAD DATA');
  console.log('='.repeat(60));
  console.log('');
  console.log('MongoDB URI:', MONGODB_URI);
  console.log('');
  
  try {
    const mongoose = require('mongoose');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Clear invoice upload data from packages
    console.log('');
    console.log('Clearing invoice upload data from packages...');
    const pkgResult = await db.collection('packages').updateMany(
      {},
      {
        $unset: { invoiceFiles: 1, invoiceUploaded: 1, pricePaid: 1, pricePaidCurrency: 1, invoiceSubmittedAt: 1 },
        $set: { invoiceStatus: "pending" }
      }
    );
    console.log(`✅ Updated ${pkgResult.modifiedCount} packages`);
    
    // Clear invoice upload data from pre-alerts
    console.log('');
    console.log('Clearing invoice upload data from pre-alerts...');
    const preAlertResult = await db.collection('prealerts').updateMany(
      {},
      {
        $unset: { attachmentFile: 1 }
      }
    );
    console.log(`✅ Updated ${preAlertResult.modifiedCount} pre-alerts`);
    
    await mongoose.connection.close();
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Invoice upload data cleared successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Make sure you have mongoose installed:');
    console.error('  npm install mongoose');
    process.exit(1);
  }
}

clearInvoiceUploadData();
