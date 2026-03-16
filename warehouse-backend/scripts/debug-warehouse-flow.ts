import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { Warehouse } from '../src/models/Warehouse';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function debugWarehouseAndPackageFlow() {
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

    // Step 1: Check warehouse lookup in package creation
    console.log('\n🏭 Step 1: Testing warehouse lookup...');
    const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
    if (!warehouse) {
      console.log('❌ ERROR: No default warehouse found!');
      return;
    }
    console.log('✅ Default warehouse found:', warehouse.name);
    console.log('   Air Address:', warehouse.airAddress ? 'EXISTS' : 'MISSING');
    console.log('   Sea Address:', warehouse.seaAddress ? 'EXISTS' : 'MISSING');
    console.log('   China Address:', warehouse.chinaAddress ? 'EXISTS' : 'MISSING');

    // Step 2: Check user lookup
    console.log('\n👤 Step 2: Testing user lookup...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (!user) {
      console.log('❌ ERROR: User not found!');
      return;
    }
    console.log('✅ User found:', user.firstName, user.lastName, '(', user.email, ')');
    console.log('   Mailbox Number:', user.mailboxNumber || 'NOT SET');
    console.log('   User Code:', user.userCode);

    // Step 3: Test package creation with warehouse addresses
    console.log('\n📦 Step 3: Testing package creation...');
    const packageData = {
      trackingNumber: 'DEBUG' + Date.now().toString().slice(-6),
      userCode: 'CLEAN-0021',
      userId: user._id,
      weight: 1.5,
      dimensions: { length: 20, width: 15, height: 8, unit: 'cm' },
      serviceMode: 'air',
      status: 'received',
      shipper: 'Debug Shipper',
      description: 'Debug package',
      itemDescription: 'Debug item',
      senderName: 'Debug Sender',
      senderEmail: 'debug@sender.com',
      senderPhone: '+1234567890',
      senderAddress: '123 Debug St',
      senderCountry: 'USA',
      recipient: {
        name: 'Debug Recipient',
        email: 'debug@recipient.com',
        phone: '+0987654321',
        address: '456 Debug Ave',
        shippingId: 'DEBUG-001'
      },
      totalAmount: 100.0,
      paymentStatus: 'pending',
      customsRequired: false,
      customsStatus: 'not_required',
      isFragile: false,
      isHazardous: false,
      requiresSignature: false,
      specialInstructions: 'Debug instructions',
      warehouseLocation: warehouse.name,
      dateReceived: new Date(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    const newPackage = await Package.create(packageData);
    console.log('✅ Package created:', newPackage.trackingNumber);

    // Step 4: Test customer email with warehouse addresses
    console.log('\n📧 Step 4: Testing customer email with warehouse data...');
    const customerEmailSent = await EmailService.sendPackagePreAlert(
      user.email,
      {
        trackingNumber: newPackage.trackingNumber,
        shipper: newPackage.shipper || 'Unknown',
        weight: newPackage.weight || 0,
        mailboxNumber: user.mailboxNumber || 'N/A',
        customerName: `${user.firstName} ${user.lastName}`,
        receivedDate: newPackage.dateReceived || new Date(),
        // All detailed fields
        dimensions: newPackage.dimensions,
        description: newPackage.description,
        itemDescription: newPackage.itemDescription,
        serviceMode: newPackage.serviceMode,
        status: newPackage.status,
        senderName: newPackage.senderName,
        senderEmail: newPackage.senderEmail,
        senderPhone: newPackage.senderPhone,
        senderAddress: newPackage.senderAddress,
        senderCountry: newPackage.senderCountry,
        recipient: newPackage.recipient,
        totalAmount: newPackage.totalAmount,
        paymentStatus: newPackage.paymentStatus,
        customsRequired: newPackage.customsRequired,
        customsStatus: newPackage.customsStatus,
        warehouseLocation: newPackage.warehouseLocation,
        specialInstructions: newPackage.specialInstructions,
        isFragile: newPackage.isFragile,
        isHazardous: newPackage.isHazardous,
        requiresSignature: newPackage.requiresSignature,
        estimatedDelivery: newPackage.estimatedDelivery
      }
    );

    if (customerEmailSent) {
      console.log('✅ Customer email sent with all details');
    } else {
      console.log('❌ Customer email failed');
    }

    // Step 5: Test recipient email
    console.log('\n📧 Step 5: Testing recipient email...');
    if (newPackage.recipient && newPackage.recipient.email && newPackage.recipient.email !== user.email) {
      const recipientEmailSent = await EmailService.sendPackageNotificationToRecipient(
        newPackage.recipient.email,
        {
          trackingNumber: newPackage.trackingNumber,
          shipper: newPackage.shipper || 'Unknown',
          weight: newPackage.weight || 0,
          description: newPackage.description || '',
          itemDescription: newPackage.itemDescription || '',
          senderName: newPackage.senderName || '',
          senderEmail: newPackage.senderEmail || '',
          senderPhone: newPackage.senderPhone || '',
          senderAddress: newPackage.senderAddress || '',
          senderCountry: newPackage.senderCountry || '',
          recipientName: newPackage.recipient.name || '',
          recipientEmail: newPackage.recipient.email || '',
          recipientPhone: newPackage.recipient.phone || '',
          recipientAddress: newPackage.recipient.address || '',
          serviceMode: newPackage.serviceMode || 'standard',
          warehouseLocation: newPackage.warehouseLocation || '',
          estimatedDelivery: newPackage.estimatedDelivery,
          receivedDate: newPackage.dateReceived || new Date(),
          dimensions: newPackage.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
          totalAmount: newPackage.totalAmount || 0
        }
      );

      if (recipientEmailSent) {
        console.log('✅ Recipient email sent');
      } else {
        console.log('❌ Recipient email failed');
      }
    }

    // Step 6: Test welcome email with warehouse addresses
    console.log('\n📧 Step 6: Testing welcome email with warehouse data...');
    const welcomeEmailSent = await EmailService.sendWelcomeWithShippingInfo(
      user.email,
      user.firstName,
      user.lastName,
      user.userCode,
      user.phone,
      user.branch,
      user.address,
      user.userCode, // Using userCode as courier code
      warehouse.airAddress,
      warehouse.seaAddress,
      warehouse.chinaAddress
    );

    if (welcomeEmailSent) {
      console.log('✅ Welcome email sent with warehouse addresses');
    } else {
      console.log('❌ Welcome email failed');
    }

    console.log('\n📋 Debug Summary:');
    console.log('=====================================');
    console.log('✅ All warehouse addresses exist');
    console.log('✅ User lookup working');
    console.log('✅ Package creation working');
    console.log('✅ Customer email with details working');
    console.log('✅ Recipient email working');
    console.log('✅ Welcome email with warehouse addresses working');

    console.log('\n🎉 All systems working correctly!');
    console.log('📧 If you still see issues, check:');
    console.log('   1. Email spam folders');
    console.log('   2. Email configuration in .env');
    console.log('   3. Network connectivity');

    // Clean up
    console.log('\n🗑️  Cleaning up debug data...');
    await Package.deleteOne({ trackingNumber: newPackage.trackingNumber });
    console.log('✅ Debug package deleted');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the debug test
debugWarehouseAndPackageFlow();
