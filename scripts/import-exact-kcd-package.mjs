/**
 * One-off import: insert exact KCD/Tasoko package payload into MongoDB.
 * Usage: node scripts/import-exact-kcd-package.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const PACKAGE_PAYLOAD = {
  PackageID: '83383d43-a368-4fc1-a216-9e54e8ae7227',
  CourierID: '15fff123-f237-4571-b92a-ae69427d7a56',
  ManifestID: '',
  CollectionID: '',
  TrackingNumber: 'DROPOFF-20240902-225642-547',
  ControlNumber: 'EP0096513',
  FirstName: 'Courtney',
  LastName: 'Patterson',
  UserCode: 'EPXUUYE',
  Weight: 1,
  Shipper: 'Amazon',
  EntryStaff: '',
  EntryDate: '2024-09-02T00:00:00-05:00',
  EntryDateTime: '2024-09-02T21:55:51.1806146-05:00',
  Branch: 'Down Town',
  Claimed: false,
  APIToken: process.env.KCD_API_KEY || '',
  ShowControls: false,
  ManifestCode: '',
  CollectionCode: '',
  Description: 'Merchandise from Amazon',
  HSCode: '',
  Unknown: false,
  AIProcessed: false,
  OriginalHouseNumber: '',
  Cubes: 0,
  Length: 0,
  Width: 0,
  Height: 0,
  Pieces: 1,
  Discrepancy: false,
  DiscrepancyDescription: '',
  ServiceTypeID: '',
  HazmatCodeID: '',
  Coloaded: false,
  ColoadIndicator: '',
};

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const packages = db.collection('packages');

  const trackingNumber = PACKAGE_PAYLOAD.TrackingNumber.toUpperCase();
  const userCode = PACKAGE_PAYLOAD.UserCode;

  const existing = await packages.findOne({
    $or: [{ TrackingNumber: trackingNumber }, { trackingNumber }],
  });
  if (existing) {
    console.log('Package already exists:', existing._id);
    await mongoose.disconnect();
    return;
  }

  let user = await users.findOne({ userCode });
  if (!user) {
    const passwordHash = await bcrypt.hash('TempImport123!', 10);
    const insertResult = await users.insertOne({
      userCode,
      firstName: PACKAGE_PAYLOAD.FirstName,
      lastName: PACKAGE_PAYLOAD.LastName,
      name: `${PACKAGE_PAYLOAD.FirstName} ${PACKAGE_PAYLOAD.LastName}`,
      email: 'courtney.patterson@cleanjshipping.com',
      passwordHash,
      role: 'customer',
      accountStatus: 'active',
      emailVerified: true,
      registrationStep: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    user = await users.findOne({ _id: insertResult.insertedId });
    console.log('Created customer user:', userCode, user._id.toString());
  } else {
    console.log('Found existing user:', userCode, user._id.toString());
  }

  const doc = {
    ...PACKAGE_PAYLOAD,
    TrackingNumber: trackingNumber,
    EntryDate: new Date(PACKAGE_PAYLOAD.EntryDate),
    EntryDateTime: new Date(PACKAGE_PAYLOAD.EntryDateTime),
    userId: user._id,
    customer: user._id,
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await packages.insertOne(doc);
  console.log('Inserted package:', result.insertedId.toString());

  const saved = await packages.findOne({ _id: result.insertedId });
  const {
    _id,
    PackageID,
    TrackingNumber,
    UserCode,
    ControlNumber,
    FirstName,
    LastName,
    Weight,
    Shipper,
    Branch,
    Description,
    EntryDate,
    EntryDateTime,
  } = saved;
  console.log(
    JSON.stringify(
      {
        _id: _id.toString(),
        PackageID,
        TrackingNumber,
        UserCode,
        ControlNumber,
        FirstName,
        LastName,
        Weight,
        Shipper,
        Branch,
        Description,
        EntryDate,
        EntryDateTime,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
