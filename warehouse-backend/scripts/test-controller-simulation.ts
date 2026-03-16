import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { EmailService } from '../src/services/emailService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

// This function simulates the exact addPackage controller logic
async function simulateAddPackageController(packageData: any) {
  console.log('🔄 Simulating addPackage controller logic...');
  
  // Extract fields exactly as in controller
  const {
    userCode,
    weight,
    shipper,
    description,
    itemDescription,
    serviceMode = 'local',
    dimensions,
    senderName,
    senderEmail,
    senderPhone,
    senderAddress,
    senderCountry,
    recipient: recipientFromBody,
    totalAmount,
    specialInstructions,
    isFragile,
    isHazardous,
    requiresSignature,
    customsRequired,
    customsStatus
  } = packageData;

  // Find user by userCode (exact same logic)
  const user = await User.findOne({ userCode: userCode.toUpperCase() });
  if (!user) {
    throw new Error(`User not found with provided userCode: ${userCode}`);
  }

  // Validate user role
  if (user.role !== 'customer') {
    throw new Error(`User ${userCode} is not a customer. User role: ${user.role}`);
  }

  // Generate tracking number
  const generatedTrackingNumber = `TEST${Date.now().toString().slice(-10)}`;

  // Create package (exact same logic as controller)
  const newPackage = await Package.create({
    trackingNumber: generatedTrackingNumber,
    userCode: userCode.toUpperCase(),
    userId: user._id,
    weight: weight || 0,
    shipper: shipper || 'Unknown',
    description: description || '',
    itemDescription: itemDescription || '',
    serviceMode,
    status: 'received',
    dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
    senderName: senderName || shipper || 'Unknown',
    senderEmail: senderEmail || '',
    senderPhone: senderPhone || '',
    senderAddress: senderAddress || '',
    senderCountry: senderCountry || '',
    recipient: recipientFromBody || {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || '',
      shippingId: user.userCode,
      address: user.address?.street || ''
    },
    totalAmount: totalAmount || 0,
    specialInstructions: specialInstructions || '',
    isFragile: isFragile || false,
    isHazardous: isHazardous || false,
    requiresSignature: requiresSignature || false,
    customsRequired: customsRequired || false,
    customsStatus: customsStatus || 'not_required',
    dateReceived: new Date()
  });

  await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');

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

  return newPackage;
}

async function testPackageControllerSimulation() {
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

    // Test with your specific user and package data
    const packageData = {
      userCode: "CLEAN-0021",
      weight: 2.8,
      dimensions: {
        length: 25,
        width: 18,
        height: 10,
        unit: "cm"
      },
      serviceMode: "air",
      shipper: "DHL",
      description: "Customer package test",
      itemDescription: "Customer item",
      senderName: "Test Sender",
      senderEmail: "sender@test.com",
      senderPhone: "+1234567890",
      senderAddress: "123 Sender Street",
      senderCountry: "USA",
      recipient: {
        name: "Test Recipient",
        email: "recipient@test.com",
        shippingId: "SHIP001",
        phone: "+0987654321",
        address: "456 Recipient Street"
      },
      totalAmount: 199.99,
      customsRequired: false,
      customsStatus: "not_required",
      isFragile: false,
      isHazardous: false,
      requiresSignature: true,
      specialInstructions: "Handle with care"
    };

    console.log('\n📦 Testing package creation with your data:');
    console.log(`   User Code: ${packageData.userCode}`);
    console.log(`   Recipient Email: ${packageData.recipient.email}`);
    console.log(`   Shipper: ${packageData.shipper}`);
    console.log(`   Weight: ${packageData.weight} kg`);

    // Simulate the controller
    const newPackage = await simulateAddPackageController(packageData);

    console.log('\n📋 Final Results:');
    console.log('=====================================');
    console.log(`📦 Package Created: ${newPackage.trackingNumber}`);
    console.log(`👤 Customer Email: ${newPackage.userId ? (newPackage.userId as any).email : 'N/A'}`);
    console.log(`👥 Recipient Email: ${newPackage.recipient?.email || 'N/A'}`);
    console.log(`🚚 Shipper: ${newPackage.shipper}`);
    console.log(`⚖️  Weight: ${newPackage.weight} kg`);
    console.log(`📅 Date: ${newPackage.dateReceived?.toLocaleDateString()}`);

    console.log('\n🎉 Controller simulation completed successfully!');
    console.log('📧 Both customer and recipient should have received emails');

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
testPackageControllerSimulation();
