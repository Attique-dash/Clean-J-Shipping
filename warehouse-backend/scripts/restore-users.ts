import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';

const restoreUsers = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Your actual users that were deleted
    const usersToRestore = [
      {
        userCode: 'CLEAN-0006',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'customer',
        mailboxNumber: 'CLEAN-0006',
        accountStatus: 'pending',
        emailVerified: false,
        branch: 'Mandeville',
        address: {
          street: '123 Main St',
          city: 'Hanover',
          state: 'NY',
          zipCode: '10001',
          country: 'Jumaica'
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          language: 'en',
          timezone: 'UTC'
        },
        isActive: true,
        shippingAddresses: [],
        createdAt: new Date('2026-03-03T21:34:04.291Z'),
        updatedAt: new Date('2026-03-03T21:34:04.291Z')
      },
      {
        userCode: 'CLEAN-0005',
        firstName: 'Anus',
        lastName: 'Shamshad',
        email: 'amus1234@gmail.com',
        phone: '+92657746464',
        role: 'customer',
        mailboxNumber: 'CLEAN-0005',
        accountStatus: 'pending',
        emailVerified: false,
        branch: 'Bharia Town',
        address: {
          street: 'J Stection',
          city: 'Karachi',
          state: 'Shidh',
          zipCode: '112233',
          country: 'Pakistan'
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          language: 'en',
          timezone: 'UTC'
        },
        isActive: true,
        shippingAddresses: [],
        createdAt: new Date('2026-03-03T21:31:13.032Z'),
        updatedAt: new Date('2026-03-03T21:31:13.032Z')
      },
      {
        userCode: 'CLEAN-0004',
        firstName: 'Daniall',
        lastName: 'ali',
        email: 'dani002@gmail.com',
        phone: '03211334567',
        role: 'customer',
        mailboxNumber: 'CLEAN-0004',
        accountStatus: 'pending',
        emailVerified: false,
        branch: 'Ali Town',
        address: {
          street: '123 Main Street',
          city: 'Lahore',
          state: 'punjab',
          zipCode: '10022',
          country: 'pakistan'
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          language: 'en',
          timezone: 'UTC'
        },
        isActive: true,
        shippingAddresses: [],
        createdAt: new Date('2026-03-03T21:00:03.286Z'),
        updatedAt: new Date('2026-03-03T21:00:03.286Z')
      },
      {
        userCode: 'CLEAN-0007',
        firstName: 'Veniece',
        lastName: 'Davis',
        email: 'veniecedavis18@gmail.com',
        phone: '18764623318',
        role: 'customer',
        accountStatus: 'active',
        emailVerified: false,
        registrationStep: 1,
        mailboxNumber: 'CLEAN-0007',
        branch: null,
        address: {
          street: '66 cheniston Drive',
          city: 'Kingstion',
          state: 'Spanish Town',
          country: 'Jamaica'
        },
        isActive: true,
        shippingAddresses: [],
        lastLogin: new Date('2026-03-03T17:16:30.356Z'),
        createdAt: new Date('2026-03-03T17:15:53.322Z'),
        updatedAt: new Date('2026-03-03T17:16:30.357Z')
      }
    ];

    console.log(`🔄 Restoring ${usersToRestore.length} users...`);

    for (const userData of usersToRestore) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        // Create user with placeholder password (will need to be reset)
        const userToCreate = { 
          ...userData, 
          passwordHash: 'tempPassword123' // Placeholder password
        } as any;
        
        await User.create(userToCreate);
        console.log(`✅ Restored: ${userData.email} (${userData.userCode}) - Password set to 'tempPassword123'`);
      } else {
        console.log(`ℹ️  User already exists: ${userData.email}`);
      }
    }

    // Show final state
    console.log('\n📋 Final Customer List:');
    const customers = await User.find({ role: 'customer' })
      .select('userCode firstName lastName email branch mailboxNumber')
      .sort({ createdAt: 1 });
    
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.userCode}) - ${customer.email} - Branch: ${customer.branch || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error restoring users:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

restoreUsers();
