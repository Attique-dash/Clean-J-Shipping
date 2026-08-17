// scripts/fix-package-currencies.js
// Migration script to fix missing/inconsistent currency fields in existing packages

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/clean-j-shipping';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB');

  // Import Package model
  const Package = require('../src/models/Package').default;
  
  const cursor = Package.find({}).cursor();
  let updated = 0;
  let processed = 0;
  let skipped = 0;

  console.log('Starting currency field normalization...');
  
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    processed++;
    let changed = false;
    let currency = doc.chargeCurrency || doc.pricePaidCurrency || doc.paymentCurrency || null;

    // Try to parse PackagePayments for currency
    if (!currency && doc.PackagePayments && typeof doc.PackagePayments === 'string') {
      try {
        const parsed = JSON.parse(doc.PackagePayments);
        if (parsed.currency) currency = parsed.currency;
      } catch (e) {
        // ignore parse errors
      }
    }

    if (currency) {
      const normalized = String(currency).toUpperCase();
      
      // Update chargeCurrency if different
      if (doc.chargeCurrency !== normalized) {
        doc.chargeCurrency = normalized;
        changed = true;
      }
      
      // Update pricePaidCurrency if missing or different
      if (!doc.pricePaidCurrency || doc.pricePaidCurrency !== normalized) {
        doc.pricePaidCurrency = normalized;
        changed = true;
      }
      
      // Update paymentCurrency if missing or different
      if (!doc.paymentCurrency || doc.paymentCurrency !== normalized) {
        doc.paymentCurrency = normalized;
        changed = true;
      }
      
      if (changed) {
        await doc.save();
        updated++;
        console.log(`Updated package ${doc.trackingNumber || doc._id}: currency = ${normalized}`);
      } else {
        skipped++;
      }
    } else {
      console.log(`No currency found for package ${doc.trackingNumber || doc._id}, setting to USD`);
      doc.chargeCurrency = 'USD';
      doc.pricePaidCurrency = 'USD';
      doc.paymentCurrency = 'USD';
      await doc.save();
      updated++;
    }
    
    // Progress logging
    if (processed % 100 === 0) {
      console.log(`Processed ${processed} packages...`);
    }
  }

  console.log('Migration complete!');
  console.log(`Total packages processed: ${processed}`);
  console.log(`Packages updated: ${updated}`);
  console.log(`Packages skipped (already correct): ${skipped}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
