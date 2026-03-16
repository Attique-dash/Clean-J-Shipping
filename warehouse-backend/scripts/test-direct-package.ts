import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testPackageCreationDirectly() {
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

    // Simulate the exact same logic as in the package controller
    const packageData = {
      trackingNumber: 'DIRECT' + Date.now().toString().slice(-6),
      userCode: 'CLEAN-0021',
      weight: 1.5,
      serviceMode: 'air',
      status: 'received',
      shipper: 'Test Shipper',
      description: 'Direct test package',
      itemDescription: 'Test item',
      senderName: 'Test Sender',
      senderEmail: 'sender@test.com',
      recipient: {
        name: 'Test Recipient',
        email: 'recipient@test.com',
        phone: '+1234567890',
        address: '123 Test Address'
      },
      totalAmount: 50.0,
      dateReceived: new Date()
    };

    console.log('\n📦 Creating package directly (simulating controller logic)...');
    
    // Create package with userId (same as controller)
    const newPackage = await Package.create({
      ...packageData,
      userId: user._id
    });

    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');
    console.log(`✅ Package created: ${newPackage.trackingNumber}`);

    // Send email notification to customer (exact same logic as controller)
    console.log('\n📧 Sending email to customer...');
    if (user.email) {
      try {
        await EmailService.sendPackagePreAlert(
          user.email,
          {
            trackingNumber: newPackage.trackingNumber,
            shipper: newPackage.shipper || 'Unknown',
            weight: newPackage.weight || 0,
            mailboxNumber: user.mailboxNumber || 'N/A',
            customerName: `${user.firstName} ${user.lastName}`,
            receivedDate: newPackage.dateReceived || new Date()
          }
        );
        console.log(`✅ Customer email sent to: ${user.email}`);
      } catch (emailError) {
        console.log(`❌ Failed to send customer email:`, emailError);
      }
    }

    // Send email notification to recipient (exact same logic as controller)
    console.log('\n📧 Sending email to recipient...');
    const recipient = newPackage.recipient;
    if (recipient && recipient.email && recipient.email !== user.email) {
      try {
        await EmailService.sendPackageNotificationToRecipient(
          recipient.email,
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
            recipientName: recipient.name || '',
            recipientEmail: recipient.email || '',
            recipientPhone: recipient.phone || '',
            recipientAddress: recipient.address || '',
            serviceMode: newPackage.serviceMode || 'standard',
            warehouseLocation: newPackage.warehouseLocation || '',
            estimatedDelivery: newPackage.estimatedDelivery,
            receivedDate: newPackage.dateReceived || new Date(),
            dimensions: newPackage.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
            totalAmount: newPackage.totalAmount || 0
          }
        );
        console.log(`✅ Recipient email sent to: ${recipient.email}`);
      } catch (emailError) {
        console.log(`❌ Failed to send recipient email:`, emailError);
      }
    }

    console.log('\n📋 Test Results:');
    console.log('=====================================');
    console.log(`👤 Customer: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`📦 Package: ${newPackage.trackingNumber}`);
    console.log(`👥 Recipient: ${recipient?.name} (${recipient?.email})`);
    console.log(`📅 Date: ${newPackage.dateReceived?.toLocaleDateString()}`);

    console.log('\n🎉 Direct test completed successfully!');
    console.log('📧 Check both email inboxes for notifications');

    // Clean up
    console.log('\n🗑️  Cleaning up...');
    await Package.deleteOne({ trackingNumber: newPackage.trackingNumber });
    console.log('✅ Test package deleted');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testPackageCreationDirectly();
