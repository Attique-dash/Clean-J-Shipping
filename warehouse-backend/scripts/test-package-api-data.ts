import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';

// Load environment variables
dotenv.config();

async function testPackageAPIEndpoint() {
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the user
    console.log('\n👤 Looking for user with userCode: CLEAN-0021...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ${user.email}`);

    // Test package data
    const packageData = {
      userCode: "CLEAN-0021",
      weight: 3.2,
      dimensions: {
        length: 20,
        width: 15,
        height: 8,
        unit: "cm"
      },
      serviceMode: "air",
      status: "received",
      shipper: "FedEx",
      description: "Electronics package",
      itemDescription: "Smartphone",
      senderName: "John Smith",
      senderEmail: "sender@example.com",
      senderPhone: "+1234567890",
      senderAddress: "123 Sender St, Sender City",
      senderCountry: "USA",
      recipient: {
        name: "Jane Doe",
        email: "jane.doe@example.com",
        shippingId: "SHIP001",
        phone: "+0987654321",
        address: "456 Recipient Ave, Recipient City"
      },
      warehouseLocation: "New York Warehouse",
      estimatedDelivery: "2024-02-15T10:00:00Z",
      customsRequired: false,
      customsStatus: "not_required",
      totalAmount: 299.99,
      paymentStatus: "pending",
      isFragile: false,
      isHazardous: false,
      requiresSignature: true,
      specialInstructions: "Handle with care",
      entryDate: new Date().toISOString(),
      itemValue: 299.99
    };

    console.log('\n📦 Package data prepared:');
    console.log(`   User Code: ${packageData.userCode}`);
    console.log(`   Customer Email: ${user.email}`);
    console.log(`   Recipient Email: ${packageData.recipient.email}`);
    console.log(`   Shipper: ${packageData.shipper}`);
    console.log(`   Weight: ${packageData.weight} kg`);

    console.log('\n🔗 To test the API endpoint, use this curl command:');
    console.log('=====================================');
    console.log(`curl -X POST http://localhost:3000/api/packages \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_API_TOKEN" \\`);
    console.log(`  -d '${JSON.stringify(packageData, null, 2)}'`);

    console.log('\n📝 Or use this in your API client:');
    console.log('=====================================');
    console.log('POST /api/packages');
    console.log('Headers:');
    console.log('  Content-Type: application/json');
    console.log('  Authorization: Bearer YOUR_API_TOKEN');
    console.log('Body:');
    console.log(JSON.stringify(packageData, null, 2));

    console.log('\n✅ Test data prepared successfully!');
    console.log('📧 When you send this request, emails will be sent to:');
    console.log(`   Customer: ${user.email} (found by userCode: ${packageData.userCode})`);
    console.log(`   Recipient: ${packageData.recipient.email}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testPackageAPIEndpoint();
