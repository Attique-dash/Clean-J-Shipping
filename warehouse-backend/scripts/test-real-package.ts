import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testRealPackageCreation() {
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

    // Find user by userCode
    console.log('\n👤 Finding user with userCode: CLEAN-0021...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (!user) {
      console.log('❌ User not found with userCode: CLEAN-0021');
      return;
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.email})`);

    // Create comprehensive package data matching your API response format
    const packageData = {
      trackingNumber: 'REALPKG' + Date.now().toString().slice(-6),
      userCode: 'CLEAN-0021',
      dimensions: {
        length: 18,
        width: 12,
        height: 5,
        unit: 'cm'
      },
      recipient: {
        name: 'David Miller',
        email: 'david.miller@gmail.com',
        shippingId: 'SHIP-DM002',
        phone: '+17735551234',
        address: '789 Michigan Ave, Chicago, IL 60601, USA'
      },
      userId: user._id,
      courierCode: 'CLEAN-KCD',
      source: 'kcd-packing-system',
      processedAt: new Date(),
      weight: 1.8,
      shipper: 'UPS',
      description: 'Personal items',
      itemDescription: 'Clothing and accessories',
      serviceMode: 'local',
      status: 'processing',
      senderName: 'Jennifer Williams',
      senderEmail: 'jwilliams@familypackages.com',
      senderPhone: '+13105552345',
      senderAddress: '890 Lake Shore Dr, Chicago, IL 60611',
      senderCountry: 'USA',
      dateReceived: new Date(),
      customsRequired: false,
      customsStatus: 'not_required',
      shippingCost: 0,
      totalAmount: 60,
      paymentStatus: 'pending',
      isFragile: false,
      isHazardous: false,
      requiresSignature: false,
      specialInstructions: 'Handle with care',
      ShowControls: false,
      Unknown: false,
      AIProcessed: false,
      Cubes: 0,
      Length: 0,
      Width: 0,
      Height: 0,
      Pieces: 1,
      Discrepancy: false,
      Coloaded: false,
      coloaded: false,
      packageStatus: 0,
      timeline: [],
      trackingHistory: [
        {
          timestamp: new Date(),
          status: 'processing',
          location: 'Warehouse',
          description: 'Package received from CLEAN-KCD'
        }
      ],
      history: [],
      warehouseLocation: 'Main Warehouse',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    console.log('\n📦 Creating real package with all details...');
    console.log(`   Tracking: ${packageData.trackingNumber}`);
    console.log(`   User Code: ${packageData.userCode}`);
    console.log(`   Shipper: ${packageData.shipper}`);
    console.log(`   Weight: ${packageData.weight} kg`);
    console.log(`   Dimensions: ${packageData.dimensions.length}x${packageData.dimensions.width}x${packageData.dimensions.height} ${packageData.dimensions.unit}`);
    console.log(`   Recipient: ${packageData.recipient.name} (${packageData.recipient.email})`);

    // Create package in database
    const newPackage = await Package.create(packageData);
    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');
    console.log('✅ Package created successfully in database');

    // Send email to customer with all details
    console.log('\n📧 Sending detailed email to customer...');
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
      console.log(`✅ Detailed customer email sent to: ${user.email}`);
    } else {
      console.log(`❌ Failed to send customer email`);
    }

    // Send email to recipient
    if (newPackage.recipient && newPackage.recipient.email && newPackage.recipient.email !== user.email) {
      console.log('\n📧 Sending email to recipient...');
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
        console.log(`✅ Recipient email sent to: ${newPackage.recipient.email}`);
      } else {
        console.log(`❌ Failed to send recipient email`);
      }
    }

    // Display comprehensive summary
    console.log('\n📋 Package Creation Summary:');
    console.log('=====================================');
    console.log(`📦 Package ID: ${newPackage._id}`);
    console.log(`🔢 Tracking Number: ${newPackage.trackingNumber}`);
    console.log(`👤 Customer: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`📮 User Code: ${newPackage.userCode}`);
    console.log(`🚚 Shipper: ${newPackage.shipper}`);
    console.log(`⚖️  Weight: ${newPackage.weight} kg`);
    console.log(`📏 Dimensions: ${newPackage.dimensions?.length}x${newPackage.dimensions?.width}x${newPackage.dimensions?.height} ${newPackage.dimensions?.unit}`);
    console.log(`📝 Description: ${newPackage.description}`);
    console.log(`📦 Item: ${newPackage.itemDescription}`);
    console.log(`🚛 Service Mode: ${newPackage.serviceMode}`);
    console.log(`📊 Status: ${newPackage.status}`);
    console.log(`💰 Total Amount: $${newPackage.totalAmount}`);
    console.log(`💳 Payment Status: ${newPackage.paymentStatus}`);
    console.log(`📅 Received: ${newPackage.dateReceived?.toLocaleDateString()}`);
    
    if (newPackage.senderName) {
      console.log('\n📤 Sender Information:');
      console.log(`   Name: ${newPackage.senderName}`);
      console.log(`   Email: ${newPackage.senderEmail || 'N/A'}`);
      console.log(`   Phone: ${newPackage.senderPhone || 'N/A'}`);
      console.log(`   Address: ${newPackage.senderAddress || 'N/A'}`);
    }
    
    if (newPackage.recipient) {
      console.log('\n📥 Recipient Information:');
      console.log(`   Name: ${newPackage.recipient.name}`);
      console.log(`   Email: ${newPackage.recipient.email}`);
      console.log(`   Phone: ${newPackage.recipient.phone || 'N/A'}`);
      console.log(`   Shipping ID: ${newPackage.recipient.shippingId || 'N/A'}`);
      console.log(`   Address: ${newPackage.recipient.address}`);
    }

    console.log('\n🎉 Real package test completed successfully!');
    console.log('📧 Check emails for detailed package information');
    console.log(`🗃️  Package saved to database with ID: ${newPackage._id}`);

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
testRealPackageCreation();
