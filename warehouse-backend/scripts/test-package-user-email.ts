import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testPackageCreationWithUser() {
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

    // Find the specific user
    console.log('\n👤 Looking for user with userCode: CLEAN-0021...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (!user) {
      console.log('❌ User not found with userCode: CLEAN-0021');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User Code: ${user.userCode}`);
    console.log(`   Role: ${user.role}`);

    // Create test package data with your specific user
    const testPackageData = {
      trackingNumber: 'TESTPKG' + Date.now().toString().slice(-6),
      userCode: 'CLEAN-0021',
      weight: 2.5,
      dimensions: {
        length: 15,
        width: 10,
        height: 5,
        unit: 'cm'
      },
      serviceMode: 'air',
      status: 'received',
      shipper: 'Amazon',
      description: 'Test package from Amazon',
      itemDescription: 'Electronics item',
      senderName: 'Amazon Seller',
      senderEmail: 'seller@amazon.com',
      senderPhone: '+1234567890',
      senderAddress: 'Amazon Warehouse, Seattle',
      senderCountry: 'USA',
      recipient: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        shippingId: 'SHIP001',
        phone: '+0987654321',
        address: '456 Recipient St, Recipient City'
      },
      warehouseLocation: 'Main Warehouse',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      customsRequired: false,
      customsStatus: 'not_required',
      totalAmount: 150.0,
      paymentStatus: 'pending',
      isFragile: false,
      isHazardous: false,
      requiresSignature: true,
      specialInstructions: 'Handle with care',
      entryDate: new Date(),
      itemValue: 150.0
    };

    console.log('\n📦 Creating test package...');
    console.log(`   Tracking: ${testPackageData.trackingNumber}`);
    console.log(`   User Code: ${testPackageData.userCode}`);
    console.log(`   Recipient Email: ${testPackageData.recipient.email}`);

    // Create package
    const newPackage = await Package.create({
      ...testPackageData,
      userId: user._id,
      dateReceived: new Date()
    });

    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');
    console.log('✅ Package created successfully');

    // Test sending email to customer (user matched by userCode)
    console.log('\n📧 Sending package pre-alert to CUSTOMER...');
    const customerEmailSent = await EmailService.sendPackagePreAlert(
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

    if (customerEmailSent) {
      console.log(`✅ Customer email sent successfully to: ${user.email}`);
    } else {
      console.log(`❌ Failed to send customer email to: ${user.email}`);
    }

    // Test sending email to recipient
    const recipient = newPackage.recipient;
    if (recipient && recipient.email && recipient.email !== user.email) {
      console.log('\n📧 Sending package notification to RECIPIENT...');
      const recipientEmailSent = await EmailService.sendPackageNotificationToRecipient(
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

      if (recipientEmailSent) {
        console.log(`✅ Recipient email sent successfully to: ${recipient.email}`);
      } else {
        console.log(`❌ Failed to send recipient email to: ${recipient.email}`);
      }
    } else {
      console.log('\n⚠️  No recipient email to send to (or recipient is same as customer)');
    }

    // Display test summary
    console.log('\n📋 Test Summary:');
    console.log('=====================================');
    console.log(`👤 Customer: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`📮 User Code: ${user.userCode}`);
    console.log(`📦 Package: ${newPackage.trackingNumber}`);
    console.log(`🚚 Shipper: ${newPackage.shipper}`);
    console.log(`⚖️  Weight: ${newPackage.weight} kg`);
    if (newPackage.recipient) {
      console.log(`👥 Recipient: ${newPackage.recipient.name} (${newPackage.recipient.email})`);
    }
    console.log(`📅 Received: ${newPackage.dateReceived?.toLocaleDateString()}`);

    console.log('\n🎉 Test completed successfully!');
    console.log(`📧 Check emails for customer (${user.email}) and recipient (${newPackage.recipient?.email})`);

    // Clean up test data
    console.log('\n🗑️  Cleaning up test data...');
    await Package.deleteOne({ trackingNumber: newPackage.trackingNumber });
    console.log('✅ Test package deleted');

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
testPackageCreationWithUser();
