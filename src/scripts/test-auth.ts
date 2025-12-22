import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword, comparePassword } from '@/lib/auth';

async function testAuth() {
  console.log('🔍 Testing Authentication System...\n');

  try {
    await dbConnect();
    console.log('✅ Database connected\n');

    // Test 1: Check if users exist
    console.log('📋 Checking users in database...');
    const allUsers = await User.find({}).select('email role accountStatus userCode');
    
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Status: ${user.accountStatus || 'active'}`);
    });
    console.log('');

    // Test 2: Check admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`👑 Admin users: ${adminUsers.length}`);
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found!');
      console.log('Creating default admin...');
      
      const adminPassword = 'admin123';
      const hashedPassword = await hashPassword(adminPassword);
      
      const admin = await User.create({
        userCode: `A${Date.now()}`,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
        accountStatus: 'active',
      });
      
      console.log(`✅ Admin created: ${admin.email} / ${adminPassword}`);
    }
    console.log('');

    // Test 3: Check warehouse users
    const warehouseUsers = await User.find({ role: 'warehouse' });
    console.log(`📦 Warehouse users: ${warehouseUsers.length}`);
    if (warehouseUsers.length === 0) {
      console.log('⚠️  No warehouse users found!');
      console.log('Creating default warehouse user...');
      
      const warehousePassword = 'warehouse123';
      const hashedPassword = await hashPassword(warehousePassword);
      
      const warehouse = await User.create({
        userCode: `W${Date.now()}`,
        firstName: 'Warehouse',
        lastName: 'Staff',
        email: 'warehouse@example.com',
        passwordHash: hashedPassword,
        role: 'warehouse',
        accountStatus: 'active',
      });
      
      console.log(`✅ Warehouse user created: ${warehouse.email} / ${warehousePassword}`);
    }
    console.log('');

    // Test 4: Check customer users
    const customerUsers = await User.find({ role: 'customer' });
    console.log(`👤 Customer users: ${customerUsers.length}`);
    if (customerUsers.length === 0) {
      console.log('⚠️  No customer users found!');
      console.log('Creating default customer...');
      
      const customerPassword = 'customer123';
      const hashedPassword = await hashPassword(customerPassword);
      
      const customer = await User.create({
        userCode: `C${Date.now()}`,
        firstName: 'Test',
        lastName: 'Customer',
        email: 'customer@example.com',
        passwordHash: hashedPassword,
        role: 'customer',
        accountStatus: 'active',
      });
      
      console.log(`✅ Customer created: ${customer.email} / ${customerPassword}`);
    }
    console.log('');

    // Test 5: Password verification test
    console.log('🔐 Testing password verification...');
    const testUser = await User.findOne({ role: 'admin' });
    if (testUser) {
      const testPassword = 'admin123';
      const isValid = await comparePassword(testPassword, testUser.passwordHash);
      console.log(`Password test for ${testUser.email}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    console.log('');

    // Test 6: Check environment variables
    console.log('🔧 Checking environment variables...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
    });
    console.log('');

    console.log('✨ Test completed!\n');
    console.log('📝 Summary:');
    console.log(`  Total users: ${allUsers.length}`);
    console.log(`  Admins: ${adminUsers.length}`);
    console.log(`  Warehouse: ${warehouseUsers.length}`);
    console.log(`  Customers: ${customerUsers.length}`);
    console.log('');
    console.log('🚀 You can now login with:');
    console.log('  Admin: admin@example.com / admin123');
    console.log('  Warehouse: warehouse@example.com / warehouse123');
    console.log('  Customer: customer@example.com / customer123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAuth();