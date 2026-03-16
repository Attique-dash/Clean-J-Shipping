import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { generateMailboxCode } from '../src/utils/mailboxCodeGenerator';

const createWarehouseStaff = async () => {
  try {
    await connectDatabase();
    
    console.log('=== Creating New Warehouse Staff ===\n');
    
    // Check if user already exists
    const existingEmail = 'warehousestaff@test.com';
    const existingUser = await User.findOne({ email: existingEmail });
    
    if (existingUser) {
      console.log(`User with email ${existingEmail} already exists. Deleting it first...`);
      await User.deleteOne({ email: existingEmail });
      console.log('Existing user deleted.\n');
    }
    
    // Generate CLEAN-XXXX code
    const cleanCode = await generateMailboxCode();
    
    // Create new warehouse staff user
    const newUser = await User.create({
      firstName: 'Test',
      lastName: 'Warehouse',
      email: existingEmail,
      passwordHash: 'TestPassword123!', // Will be hashed by pre-save hook
      role: 'warehouse',
      userCode: cleanCode,
      mailboxNumber: cleanCode,
      accountStatus: 'active', // Set to active so we can test login
      emailVerified: true
    });
    
    console.log('✅ New warehouse staff created successfully:');
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Password: TestPassword123!`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   User Code: ${newUser.userCode}`);
    console.log(`   Account Status: ${newUser.accountStatus}`);
    console.log(`   Email Verified: ${newUser.emailVerified}\n`);
    
    console.log('=== Test Credentials ===');
    console.log('Correct credentials (should show "Invalid credentials"):');
    console.log(`{"email": "${newUser.email}", "password": "TestPassword123!"}`);
    console.log('\nWrong credentials (should allow login):');
    console.log(`{"email": "${newUser.email}", "password": "WrongPassword123!"}`);
    
  } catch (error) {
    console.error('Error creating warehouse staff:', error);
  } finally {
    await disconnectDatabase();
  }
};

createWarehouseStaff();
