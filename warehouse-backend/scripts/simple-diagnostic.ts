import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { Warehouse } from '../src/models/Warehouse';
import { EmailService } from '../src/services/emailService';

// Load environment variables
dotenv.config();

async function simpleDiagnostic() {
  try {
    console.log('🔍 SIMPLE SYSTEM DIAGNOSTIC');
    console.log('=====================================');

    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Check 1: Email Service
    console.log('\n📧 1. Email Service Check...');
    const emailConnected = await EmailService.verifyConnection();
    console.log(emailConnected ? '✅ Email service working' : '❌ Email service failed');

    // Check 2: Warehouse Data
    console.log('\n🏭 2. Warehouse Data Check...');
    const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
    if (warehouse) {
      console.log('✅ Default warehouse found:', warehouse.name);
      console.log('   Air Address:', warehouse.airAddress ? '✅ Present' : '❌ Missing');
      console.log('   Sea Address:', warehouse.seaAddress ? '✅ Present' : '❌ Missing');
      console.log('   China Address:', warehouse.chinaAddress ? '✅ Present' : '❌ Missing');
    } else {
      console.log('❌ No default warehouse found!');
    }

    // Check 3: User Data
    console.log('\n👤 3. User Data Check...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (user) {
      console.log('✅ User found:', user.email);
      console.log('   Mailbox Number:', user.mailboxNumber || '❌ Not set');
      console.log('   User Code:', user.userCode);
    } else {
      console.log('❌ User CLEAN-0021 not found!');
    }

    // Check 4: Test Package Creation
    if (user && warehouse) {
      console.log('\n📦 4. Testing Package Creation...');
      
      const testPackage = {
        trackingNumber: 'SIMPLE' + Date.now().toString().slice(-6),
        userCode: 'CLEAN-0021',
        userId: user._id,
        weight: 1.0,
        dimensions: { length: 10, width: 8, height: 5, unit: 'cm' },
        serviceMode: 'air',
        status: 'received',
        shipper: 'Test Shipper',
        description: 'Simple test package',
        itemDescription: 'Simple test item',
        senderName: 'Test Sender',
        senderEmail: 'sender@test.com',
        recipient: {
          name: 'Test Recipient',
          email: 'recipient@test.com',
          phone: '+1234567890',
          address: '123 Test Address'
        },
        totalAmount: 50.0,
        customsRequired: false,
        warehouseLocation: warehouse.name,
        dateReceived: new Date()
      };

      const newPackage = await Package.create(testPackage);
      console.log('✅ Package created:', newPackage.trackingNumber);

      // Check 5: Test Email Sending
      console.log('\n📧 5. Testing Email Sending...');
      
      try {
        // Customer Email - only required fields
        const customerEmailResult = await EmailService.sendPackagePreAlert(
          user.email,
          {
            trackingNumber: newPackage.trackingNumber,
            shipper: newPackage.shipper || 'Unknown',
            weight: newPackage.weight,
            mailboxNumber: user.mailboxNumber || 'N/A',
            customerName: `${user.firstName} ${user.lastName}`,
            receivedDate: newPackage.dateReceived || new Date()
          }
        );
        console.log(customerEmailResult ? '✅ Customer email sent' : '❌ Customer email failed');
      } catch (e) {
        console.log('❌ Customer email error:', e instanceof Error ? e.message : String(e));
      }

      try {
        // Recipient Email - only required fields
        if (newPackage.recipient && newPackage.recipient.email) {
          const recipientEmailResult = await EmailService.sendPackageNotificationToRecipient(
            newPackage.recipient.email,
            {
              trackingNumber: newPackage.trackingNumber,
              shipper: newPackage.shipper || 'Unknown',
              weight: newPackage.weight,
              recipientName: newPackage.recipient.name || 'Unknown',
              recipientEmail: newPackage.recipient.email,
              recipientAddress: newPackage.recipient.address || 'Unknown',
              recipientPhone: newPackage.recipient.phone || 'Unknown',
              serviceMode: newPackage.serviceMode,
              receivedDate: newPackage.dateReceived || new Date()
            }
          );
          console.log(recipientEmailResult ? '✅ Recipient email sent' : '❌ Recipient email failed');
        } else {
          console.log('❌ Recipient email skipped: recipient information missing');
        }
      } catch (e) {
        console.log('❌ Recipient email error:', e instanceof Error ? e.message : String(e));
      }

      try {
        // Welcome Email
        const welcomeEmailResult = await EmailService.sendWelcomeWithShippingInfo(
          user.email,
          user.firstName,
          user.lastName,
          user.userCode,
          user.phone,
          user.branch,
          user.address,
          user.userCode,
          warehouse.airAddress,
          warehouse.seaAddress,
          warehouse.chinaAddress
        );
        console.log(welcomeEmailResult ? '✅ Welcome email sent' : '❌ Welcome email failed');
      } catch (e) {
        console.log('❌ Welcome email error:', e instanceof Error ? e.message : String(e));
      }

      // Clean up
      await Package.deleteOne({ trackingNumber: newPackage.trackingNumber });
      console.log('✅ Test package cleaned up');
    }

    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('=====================================');
    
    if (emailConnected && warehouse && user) {
      console.log('✅ ALL CORE SYSTEMS OPERATIONAL');
      console.log('📧 If you still see issues:');
      console.log('   1. Check email spam/junk folders');
      console.log('   2. Verify email addresses are correct');
      console.log('   3. Check email server logs');
      console.log('   4. Test with different email addresses');
      console.log('   5. Check firewall/network settings');
      console.log('   6. Verify MongoDB connection string');
      console.log('   7. Check environment variables (.env file)');
    } else {
      console.log('❌ SYSTEM ISSUES DETECTED');
      if (!emailConnected) console.log('   - Email service not connected');
      if (!warehouse) console.log('   - No default warehouse found');
      if (!user) console.log('   - User CLEAN-0021 not found');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run simple diagnostic
simpleDiagnostic();
