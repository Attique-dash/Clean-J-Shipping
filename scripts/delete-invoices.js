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

async function deleteInvoices() {
  const userCode = process.argv[2];
  
  console.log('='.repeat(60));
  console.log('MONGODB INVOICE DELETION');
  console.log('='.repeat(60));
  console.log('');
  console.log('MongoDB URI:', MONGODB_URI);
  console.log('');
  
  if (userCode) {
    console.log(`Delete invoices for user code: ${userCode}`);
    console.log('');
    console.log('Option 1: Use MongoDB Atlas Web Console');
    console.log('  1. Go to https://cloud.mongodb.com');
    console.log('  2. Navigate to your cluster and database');
    console.log('  3. First, find the user ID in "users" collection:');
    console.log(`     { "userCode": "${userCode}" }`);
    console.log('  4. Copy the user\'s _id');
    console.log('  5. Go to the "invoices" collection');
    console.log('  6. Run this query in the filter (replace USER_ID with actual _id):');
    console.log(`     { "userId": ObjectId("USER_ID") }`);
    console.log('     OR');
    console.log(`     { "customer.id": "USER_ID" }`);
    console.log('  7. Select all matching documents and delete them');
    console.log('');
    console.log('Option 2: Use mongosh (if installed)');
    console.log(`  mongosh "${MONGODB_URI}"`);
    console.log(`  // First find the user ID`);
    console.log(`  var user = db.users.findOne({ "userCode": "${userCode}" })`);
    console.log(`  // Then delete invoices for that user`);
    console.log(`  db.invoices.deleteMany({ "userId": user._id })`);
    console.log(`  db.invoices.deleteMany({ "customer.id": user._id.toString() })`);
  } else {
    console.log('Delete ALL invoices from database');
    console.log('');
    console.log('Option 1: Use MongoDB Atlas Web Console');
    console.log('  1. Go to https://cloud.mongodb.com');
    console.log('  2. Navigate to your cluster and database');
    console.log('  3. Go to the "invoices" collection');
    console.log('  4. Click "Drop Collection" to delete all invoices');
    console.log('');
    console.log('Option 2: Use mongosh (if installed)');
    console.log(`  mongosh "${MONGODB_URI}"`);
    console.log('  db.invoices.deleteMany({})');
  }
  console.log('');
  console.log('='.repeat(60));
}

deleteInvoices();
