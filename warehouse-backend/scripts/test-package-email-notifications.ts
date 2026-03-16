import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testPackageEmailNotifications() {
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

    // Find or create test user
    let testUser = await User.findOne({ email: 'muhammadattique357@gmail.com' });
    if (!testUser) {
      console.log('\n👤 Creating test user...');
      testUser = await User.create({
        firstName: 'Muhammad',
        lastName: 'Attique',
        email: 'muhammadattique357@gmail.com',
        passwordHash: 'TestPassword123!',
        phone: '+1234567890',
        role: 'customer',
        userCode: 'CLEAN-0021',
        mailboxNumber: 'CLEAN-0021',
        accountStatus: 'active',
        emailVerified: true,
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      });
      console.log('✅ Test user created');
    } else {
      console.log(`✅ Found existing test user: ${testUser.userCode}`);
    }

    // Create test package data matching the user's example
    const testPackageData = {
      trackingNumber: 'TRK123456129',
      userCode: 'CLEAN-0021',
      weight: 5.5,
      dimensions: {
        length: 10,
        width: 5,
        height: 3,
        unit: 'cm'
      },
      serviceMode: 'air',
      status: 'received',
      shipper: 'DHL',
      description: 'Electronics package',
      itemDescription: 'Laptop computer',
      senderName: 'John Smith',
      senderEmail: 'sender@example.com',
      senderPhone: '+1234567890',
      senderAddress: '123 Sender St, Sender City',
      senderCountry: 'USA',
      recipient: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        shippingId: 'SHIP001',
        phone: '+0987654321',
        address: '456 Recipient Ave, Recipient City'
      },
      warehouseLocation: 'New York Warehouse',
      warehouseAddress: '789 Warehouse Blvd, NY',
      location: 'In transit - New York',
      estimatedDelivery: new Date('2024-02-15T10:00:00Z'),
      customsRequired: false,
      customsStatus: 'not_required',
      shippingCost: 25.5,
      totalAmount: 125.5,
      paymentStatus: 'pending',
      isFragile: false,
      isHazardous: false,
      requiresSignature: true,
      specialInstructions: 'Handle with care',
      notes: 'Customer requested expedited shipping',
      entryDate: new Date('2024-02-10T09:00:00Z'),
      itemValue: 125.5,
      userId: testUser._id,
      dateReceived: new Date()
    };

    console.log('\n📦 Creating test package...');
    const newPackage = await Package.create(testPackageData);
    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');
    console.log(`✅ Package created with tracking number: ${newPackage.trackingNumber}`);

    // Send email to customer (user matched by userCode)
    console.log('\n📧 Sending package pre-alert to customer...');
    const customerEmailSent = await EmailService.sendPackagePreAlert(
      testUser.email,
      {
        trackingNumber: newPackage.trackingNumber,
        shipper: newPackage.shipper || 'Unknown',
        weight: newPackage.weight || 0,
        mailboxNumber: testUser.mailboxNumber || 'N/A',
        customerName: `${testUser.firstName} ${testUser.lastName}`,
        receivedDate: newPackage.dateReceived || new Date()
      }
    );

    if (customerEmailSent) {
      console.log('✅ Customer email sent successfully!');
    } else {
      console.log('❌ Failed to send customer email');
    }

    // Send email to recipient
    if (newPackage.recipient && newPackage.recipient.email) {
      console.log('\n📧 Sending package notification to recipient...');
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
        console.log('✅ Recipient email sent successfully!');
      } else {
        console.log('❌ Failed to send recipient email');
      }
    }

    // Display test summary
    console.log('\n📋 Test Summary:');
    console.log('=====================================');
    console.log(`👤 Customer: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
    console.log(`📮 User Code: ${testUser.userCode}`);
    console.log(`📦 Package: ${newPackage.trackingNumber}`);
    console.log(`🚚 Shipper: ${newPackage.shipper}`);
    console.log(`⚖️  Weight: ${newPackage.weight} kg`);
    console.log(`📝 Description: ${newPackage.description}`);
    if (newPackage.recipient) {
      console.log(`👥 Recipient: ${newPackage.recipient.name} (${newPackage.recipient.email})`);
    }
    console.log(`📅 Received: ${newPackage.dateReceived?.toLocaleDateString()}`);

    console.log('\n🎉 Test completed successfully!');
    console.log(`📧 Check emails for customer (${testUser.email}) and recipient (${newPackage.recipient?.email})`);

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
testPackageEmailNotifications();
