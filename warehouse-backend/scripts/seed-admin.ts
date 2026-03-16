import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { generateMailboxCode } from '../src/utils/mailboxCodeGenerator';
import { logger } from '../src/utils/logger';

const seedAdminUser = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('   Admin Code:', existingAdmin.userCode);
      console.log('   Mailbox Number:', existingAdmin.mailboxNumber);
      await disconnectDatabase();
      return;
    }

    // Generate CLEAN-XXXX code for admin
    const adminCode = await generateMailboxCode();

    // Create admin user with CLEAN-XXXX format
    const admin = await User.create({
      userCode: adminCode,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@warehouse.com',
      passwordHash: 'Admin123!', // Will be hashed by pre-save hook
      role: 'admin',
      accountStatus: 'active',
      emailVerified: true,
      mailboxNumber: adminCode // Same as userCode
    });

    console.log('✅ Admin user created successfully:');
    console.log('   Email:', admin.email);
    console.log('   Password: Admin123!');
    console.log('   Admin Code:', admin.userCode);
    console.log('   Mailbox Number:', admin.mailboxNumber);
    console.log('   Role:', admin.role);

    logger.info(`Admin user created: ${admin.email} with code: ${adminCode}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    logger.error('Admin seeding error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from database');
  }
};

// Run admin seed function
seedAdminUser();
