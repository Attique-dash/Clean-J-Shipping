// Script to delete invoices from MongoDB
// Usage: node scripts/delete-invoices.js [option]
// Options:
//   - invoices [userCode]  : Delete system-generated invoices
//   - invoice-upload       : Clear invoice upload data from packages
//   - all                  : Delete all invoices

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
  const option = process.argv[2];
  const userCode = process.argv[3];
  
  console.log('='.repeat(60));
  console.log('MONGODB DATA DELETION');
  console.log('='.repeat(60));
  console.log('');
  console.log('MongoDB URI:', MONGODB_URI);
  console.log('');
  
  if (option === 'invoice-upload') {
    console.log('CLEAR INVOICE UPLOAD DATA FROM PACKAGES');
    console.log('');
    console.log('This will clear invoice upload data from packages (invoiceUploaded, invoiceFiles, invoiceStatus)');
    console.log('');
    console.log('Option 1: Use MongoDB Atlas Web Console');
    console.log('  1. Go to https://cloud.mongodb.com');
    console.log('  2. Navigate to your cluster and database');
    console.log('  3. Go to the "packages" collection');
    console.log('  4. Run this update to clear invoice upload data:');
    console.log('     {');
    console.log('       "invoiceUploaded": true');
    console.log('     }');
    console.log('  5. Update these fields:');
    console.log('     - Set invoiceUploaded to false');
    console.log('     - Clear invoiceFiles array');
    console.log('     - Set invoiceStatus to "pending"');
    console.log('');
    console.log('Option 2: Use mongosh (if installed)');
    console.log(`  mongosh "${MONGODB_URI}"`);
    console.log('  // Clear all invoice upload data from packages');
    console.log('  db.packages.updateMany(');
    console.log('    {},');
    console.log('    {');
    console.log('      $unset: { invoiceFiles: 1, invoiceUploaded: 1, pricePaid: 1, pricePaidCurrency: 1, invoiceSubmittedAt: 1 },');
    console.log('      $set: { invoiceStatus: "pending" }');
    console.log('    }');
    console.log('  )');
    console.log('');
    console.log('  // Clear invoice upload data from pre-alerts');
    console.log('  db.prealerts.updateMany(');
    console.log('    {},');
    console.log('    {');
    console.log('      $unset: { attachmentFile: 1 }');
    console.log('    }');
    console.log('  )');
  } else if (option === 'invoices') {
    console.log('DELETE SYSTEM-GENERATED INVOICES');
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
      console.log(`     OR`);
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
  } else if (option === 'all') {
    console.log('DELETE ALL INVOICE DATA');
    console.log('');
    console.log('This will delete both system invoices and clear invoice upload data');
    console.log('');
    console.log('Option 1: Use MongoDB Atlas Web Console');
    console.log('  1. Go to https://cloud.mongodb.com');
    console.log('  2. Navigate to your cluster and database');
    console.log('  3. Drop the "invoices" collection');
    console.log('  4. Go to "packages" collection and clear invoice upload data');
    console.log('  5. Go to "prealerts" collection and clear attachment files');
    console.log('');
    console.log('Option 2: Use mongosh (if installed)');
    console.log(`  mongosh "${MONGODB_URI}"`);
    console.log('  // Delete all invoices');
    console.log('  db.invoices.deleteMany({})');
    console.log('  // Clear invoice upload data from packages');
    console.log('  db.packages.updateMany({}, { $unset: { invoiceFiles: 1, invoiceUploaded: 1, pricePaid: 1, pricePaidCurrency: 1, invoiceSubmittedAt: 1 }, $set: { invoiceStatus: "pending" } })');
    console.log('  // Clear invoice upload data from pre-alerts');
    console.log('  db.prealerts.updateMany({}, { $unset: { attachmentFile: 1 } })');
  } else {
    console.log('USAGE:');
    console.log('  node scripts/delete-invoices.js invoices [userCode]');
    console.log('  node scripts/delete-invoices.js invoice-upload');
    console.log('  node scripts/delete-invoices.js all');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  node scripts/delete-invoices.js invoices CLEAN-0028');
    console.log('  node scripts/delete-invoices.js invoice-upload');
    console.log('  node scripts/delete-invoices.js all');
  }
  console.log('');
  console.log('='.repeat(60));
}

deleteInvoices();
