import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Adjust if your server runs on different port

async function testApiRegistration() {
  try {
    console.log('🧪 Testing API Customer Registration...');
    
    // Generate a unique email using timestamp
    const timestamp = Date.now();
    const testEmail = `muhammadattique${timestamp}@gmail.com`;
    
    const registrationData = {
      firstName: 'Muhammad',
      lastName: 'Attique',
      email: testEmail,
      password: 'TestPassword123!',
      phone: '+1234567890',
      role: 'customer',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }
    };

    console.log('📤 Sending registration request...');
    console.log(`   Email: ${registrationData.email}`);
    console.log(`   Name: ${registrationData.firstName} ${registrationData.lastName}`);

    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, registrationData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Registration API Response:');
    console.log('   Status:', response.status);
    console.log('   Message:', response.data.message);
    
    if (response.data.success && response.data.user) {
      console.log('\n📋 Registered Customer Details:');
      console.log('=====================================');
      console.log(`👤 Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`📧 Email: ${response.data.user.email}`);
      console.log(`🔑 User Code: ${response.data.user.userCode}`);
      console.log(`📮 Mailbox Code: ${response.data.user.mailboxNumber}`);
      console.log(`📱 Phone: ${response.data.user.phone || 'Not provided'}`);
      console.log(`🏢 Role: ${response.data.user.role}`);
      console.log(`📊 Account Status: ${response.data.user.accountStatus}`);
      console.log(`✉️  Email Verified: ${response.data.user.emailVerified}`);
      console.log(`📅 Created: ${response.data.user.createdAt}`);
      
      if (response.data.user.address) {
        console.log('\n🏠 Shipping Address:');
        console.log(`   ${response.data.user.address.street}`);
        console.log(`   ${response.data.user.address.city}, ${response.data.user.address.state} ${response.data.user.address.zipCode}`);
        console.log(`   ${response.data.user.address.country}`);
      }
    }

    console.log('\n🎉 API Registration test completed!');
    console.log(`📧 Check ${testEmail} for the welcome email`);

  } catch (error: any) {
    console.error('❌ API Registration test failed:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
      if (error.response.data?.errors) {
        console.error('   Validation Errors:', error.response.data.errors);
      }
    } else if (error.request) {
      console.error('   Network Error: Could not connect to the API server');
      console.error('   Make sure the server is running on', API_BASE_URL);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Run the test
testApiRegistration();
