import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';

// Load environment variables
dotenv.config();

async function prepareLocalhostAPITest() {
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    console.log('\n👤 Finding user with userCode: CLEAN-0021...');
    const user = await User.findOne({ userCode: 'CLEAN-0021' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ${user.email}`);

    // Prepare complete package data for localhost API test
    const packageData = {
      userCode: "CLEAN-0021",
      dimensions: {
        length: 25,
        width: 18,
        height: 10,
        unit: "cm"
      },
      recipient: {
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        shippingId: "SHIP-SJ003",
        phone: "+15551234567",
        address: "123 Main Street, Boston, MA 02101, USA"
      },
      weight: 2.5,
      shipper: "FedEx",
      description: "Electronics and accessories",
      itemDescription: "Laptop and computer accessories",
      serviceMode: "air",
      status: "received",
      senderName: "Tech Store",
      senderEmail: "orders@techstore.com",
      senderPhone: "+18005551234",
      senderAddress: "456 Tech Plaza, San Francisco, CA 94105",
      senderCountry: "USA",
      totalAmount: 1250.00,
      paymentStatus: "pending",
      customsRequired: true,
      customsStatus: "pending",
      isFragile: true,
      isHazardous: false,
      requiresSignature: true,
      specialInstructions: "Please handle with extreme care - contains electronics",
      warehouseLocation: "San Francisco Warehouse",
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      entryDate: new Date().toISOString(),
      itemValue: 1250.00
    };

    console.log('\n📦 Package Data Prepared for Localhost API Test:');
    console.log('=====================================');
    console.log(`🔢 User Code: ${packageData.userCode}`);
    console.log(`👤 Customer Email: ${user.email}`);
    console.log(`📦 Recipient: ${packageData.recipient.name} (${packageData.recipient.email})`);
    console.log(`🚚 Shipper: ${packageData.shipper}`);
    console.log(`⚖️  Weight: ${packageData.weight} kg`);
    console.log(`📏 Dimensions: ${packageData.dimensions.length}x${packageData.dimensions.width}x${packageData.dimensions.height} ${packageData.dimensions.unit}`);
    console.log(`💰 Total Amount: $${packageData.totalAmount}`);
    console.log(`📝 Description: ${packageData.description}`);
    console.log(`📦 Item: ${packageData.itemDescription}`);
    console.log(`🚛 Service Mode: ${packageData.serviceMode}`);
    console.log(`📊 Status: ${packageData.status}`);

    console.log('\n🔗 To test with localhost API, run this command:');
    console.log('=====================================');
    console.log('1. Make sure your server is running on localhost:3000');
    console.log('2. Use this curl command:');
    console.log();
    console.log(`curl -X POST http://localhost:3000/api/packages \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_API_TOKEN" \\`);
    console.log(`  -d '${JSON.stringify(packageData, null, 2)}'`);

    console.log('\n📝 Or use in Postman/Insomnia:');
    console.log('=====================================');
    console.log('URL: POST http://localhost:3000/api/packages');
    console.log('Headers:');
    console.log('  Content-Type: application/json');
    console.log('  Authorization: Bearer YOUR_API_TOKEN');
    console.log('\nBody (JSON):');
    console.log(JSON.stringify(packageData, null, 2));

    console.log('\n📧 Expected Results:');
    console.log('=====================================');
    console.log(`✅ Package will be created in database`);
    console.log(`✅ Email sent to customer: ${user.email} (found by userCode: ${packageData.userCode})`);
    console.log(`✅ Email sent to recipient: ${packageData.recipient.email}`);
    console.log(`✅ Both emails will contain ALL package details like the API response`);

    console.log('\n🔍 What to check:');
    console.log('=====================================');
    console.log('1. Package appears in database with all fields');
    console.log('2. Customer email contains detailed package information');
    console.log('3. Recipient email contains detailed package information');
    console.log('4. All package details are displayed (dimensions, sender, recipient, customs, etc.)');

    console.log('\n🎉 Ready for localhost testing!');
    console.log('📧 The email system now shows complete package details like the API response');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
prepareLocalhostAPITest();
