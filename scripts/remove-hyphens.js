/**
 * Script to remove hyphens from all User and Package userCodes in MongoDB
 * e.g., CLEAN-0007 -> CLEAN0007
 * 
 * Usage: node scripts/remove-hyphens.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.');

    const db = mongoose.connection.db;

    // 1. Update Users
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({
      $or: [
        { userCode: { $regex: '-' } },
        { shippingId: { $regex: '-' } }
      ]
    }).toArray();

    console.log(`Found ${users.length} users with hyphens.`);
    let userCount = 0;

    for (const u of users) {
      const updates = {};
      if (u.userCode && u.userCode.includes('-')) {
        updates.userCode = u.userCode.replace(/-/g, '').toUpperCase();
      }
      if (u.shippingId && u.shippingId.includes('-')) {
        updates.shippingId = u.shippingId.replace(/-/g, '').toUpperCase();
      }
      if (Object.keys(updates).length > 0) {
        await usersCollection.updateOne({ _id: u._id }, { $set: updates });
        userCount++;
        console.log(`Updated user ${u.email}: ${u.userCode} -> ${updates.userCode || u.userCode}`);
      }
    }

    // 2. Update Packages
    const packagesCollection = db.collection('packages');
    const packages = await packagesCollection.find({
      $or: [
        { UserCode: { $regex: '-' } },
        { userCode: { $regex: '-' } }
      ]
    }).toArray();

    console.log(`Found ${packages.length} packages with hyphens.`);
    let pkgCount = 0;

    for (const p of packages) {
      const updates = {};
      if (p.UserCode && p.UserCode.includes('-')) {
        updates.UserCode = p.UserCode.replace(/-/g, '').toUpperCase();
      }
      if (p.userCode && p.userCode.includes('-')) {
        updates.userCode = p.userCode.replace(/-/g, '').toUpperCase();
      }
      if (Object.keys(updates).length > 0) {
        await packagesCollection.updateOne({ _id: p._id }, { $set: updates });
        pkgCount++;
      }
    }

    console.log(`\n🎉 Completed migration!`);
    console.log(`- Updated users: ${userCount}`);
    console.log(`- Updated packages: ${pkgCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
