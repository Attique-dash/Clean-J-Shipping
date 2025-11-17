// scripts/seed-admin.js
// Run this with: node scripts/seed-admin.js

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  userCode: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "customer", "warehouse"], default: "customer" },
  accountStatus: { type: String, default: "active" },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to MongoDB');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const adminEmail = process.env.ADMIN_EMAIL || 'jamesfoster1518@yahoo.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Nellyfrass@12';

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      console.log('Updating password...');
      
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.updatedAt = new Date();
      await existingAdmin.save();
      
      console.log('Admin password updated successfully');
    } else {
      console.log('Creating new admin user...');
      
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      const admin = await User.create({
        userCode: `A${Date.now()}`,
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        emailVerified: true,
      });

      console.log('Admin user created successfully');
      console.log('Email:', admin.email);
      console.log('User Code:', admin.userCode);
    }

    console.log('\nYou can now login with:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();