import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Warehouse } from '../src/models/Warehouse';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';
import { generateMailboxCode } from '../src/utils/mailboxCodeGenerator';

// Load environment variables
dotenv.config();

async function testCustomerRegistrationEmail() {
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test email configuration
    console.log('\n📧 Testing email configuration...');
    const emailConnected = await EmailService.verifyConnection();
    if (emailConnected) {
      console.log('✅ Email service connected successfully');
    } else {
      console.log('❌ Email service connection failed');
      return;
    }

    // Check if test user already exists
    const testEmail = 'muhammadattique357@gmail.com';
    const existingUser = await User.findOne({ email: testEmail });
    
    if (existingUser) {
      console.log(`\n👤 Test user already exists: ${existingUser.email}`);
      console.log(`   User Code: ${existingUser.userCode}`);
      console.log(`   Mailbox: ${existingUser.mailboxNumber}`);
      console.log(`   Status: ${existingUser.accountStatus}`);
      console.log(`   Email Verified: ${existingUser.emailVerified}`);
      
      // Delete existing test user to create fresh one
      await User.deleteOne({ email: testEmail });
      console.log('🗑️  Deleted existing test user');
    }

    // Get default warehouse for shipping addresses
    const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
    if (!warehouse) {
      console.log('❌ No default warehouse found');
      return;
    }
    console.log('✅ Found default warehouse');

    // Create test customer data
    const testCustomer = {
      firstName: 'Muhammad',
      lastName: 'Attique',
      email: testEmail,
      password: 'TestPassword123!',
      phone: '+1234567890',
      role: 'customer',
      branch: 'Main Branch',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }
    };

    console.log('\n👤 Creating test customer...');
    console.log(`   Email: ${testCustomer.email}`);
    console.log(`   Name: ${testCustomer.firstName} ${testCustomer.lastName}`);

    // Generate proper CLEAN-XXXX code
    const cleanCode = await generateMailboxCode();

    // Create new customer
    const newUser = await User.create({
      firstName: testCustomer.firstName,
      lastName: testCustomer.lastName,
      email: testCustomer.email.toLowerCase(),
      passwordHash: testCustomer.password,
      phone: testCustomer.phone,
      role: testCustomer.role,
      branch: testCustomer.branch,
      address: testCustomer.address,
      userCode: cleanCode,
      mailboxNumber: cleanCode,
      accountStatus: 'pending',
      emailVerified: false
    });

    console.log('✅ Customer created successfully');
    console.log(`   User Code: ${newUser.userCode}`);
    console.log(`   Mailbox Number: ${newUser.mailboxNumber}`);

    // Send welcome email with shipping information
    console.log('\n📧 Sending welcome email with shipping information...');
    
    const emailSent = await EmailService.sendWelcomeWithShippingInfo(
      newUser.email,
      newUser.firstName,
      newUser.lastName,
      newUser.userCode,
      newUser.phone,
      newUser.branch,
      newUser.address,
      newUser.userCode, // Using userCode as courier code
      warehouse.airAddress,
      warehouse.seaAddress,
      warehouse.chinaAddress
    );

    if (emailSent) {
      console.log('✅ Welcome email sent successfully!');
    } else {
      console.log('❌ Failed to send welcome email');
    }

    // Display customer information (without password)
    console.log('\n📋 Customer Registration Summary:');
    console.log('=====================================');
    console.log(`👤 Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`📧 Email: ${newUser.email}`);
    console.log(`🔑 User Code: ${newUser.userCode}`);
    console.log(`📮 Mailbox Code: ${newUser.mailboxNumber}`);
    console.log(`📱 Phone: ${newUser.phone || 'Not provided'}`);
    console.log(`🏢 Role: ${newUser.role}`);
    console.log(`📊 Account Status: ${newUser.accountStatus}`);
    console.log(`✉️  Email Verified: ${newUser.emailVerified}`);
    console.log(`📅 Created: ${newUser.createdAt}`);
    
    if (newUser.address) {
      console.log('\n🏠 Shipping Address:');
      console.log(`   ${newUser.address.street}`);
      console.log(`   ${newUser.address.city}, ${newUser.address.state} ${newUser.address.zipCode}`);
      console.log(`   ${newUser.address.country}`);
    }

    if (warehouse) {
      console.log('\n🏭 Warehouse Addresses:');
      if (warehouse.airAddress) {
        console.log('\n✈️  Air Shipping Address:');
        console.log(`   ${warehouse.airAddress.name || 'Air Warehouse'}`);
        console.log(`   ${warehouse.airAddress.street}`);
        console.log(`   ${warehouse.airAddress.city}, ${warehouse.airAddress.state} ${warehouse.airAddress.zipCode}`);
        console.log(`   ${warehouse.airAddress.country}`);
      }
      
      if (warehouse.seaAddress) {
        console.log('\n🚢 Sea Shipping Address:');
        console.log(`   ${warehouse.seaAddress.name || 'Sea Warehouse'}`);
        console.log(`   ${warehouse.seaAddress.street}`);
        console.log(`   ${warehouse.seaAddress.city}, ${warehouse.seaAddress.state} ${warehouse.seaAddress.zipCode}`);
        console.log(`   ${warehouse.seaAddress.country}`);
      }
      
      if (warehouse.chinaAddress) {
        console.log('\n🇨🇳 China Address:');
        console.log(`   ${warehouse.chinaAddress.name || 'China Warehouse'}`);
        console.log(`   ${warehouse.chinaAddress.street}`);
        console.log(`   ${warehouse.chinaAddress.city}, ${warehouse.chinaAddress.state} ${warehouse.chinaAddress.zipCode}`);
        console.log(`   ${warehouse.chinaAddress.country}`);
      }
    }

    console.log('\n🎉 Test completed successfully!');
    console.log(`📧 Check ${testEmail} for the welcome email`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testCustomerRegistrationEmail();
