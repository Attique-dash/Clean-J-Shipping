import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { Warehouse } from '../src/models/Warehouse';
import { Inventory } from '../src/models/Inventory';
import { ApiKey } from '../src/models/ApiKey';
import { generateApiKey } from '../src/utils/helpers';

const seedData = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Clear existing data
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Inventory.deleteMany({});
    await ApiKey.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      userCode: 'AD-001',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@warehouse.com',
      passwordHash: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      accountStatus: 'active',
      emailVerified: true
    });
    console.log('Created admin user:', admin.email);

    // Create warehouse staff users
    const staffUsers = await Promise.all([
      User.create({
        userCode: 'WS-001',
        firstName: 'John',
        lastName: 'Warehouse',
        email: 'john@warehouse.com',
        passwordHash: 'staff123', // Will be hashed by pre-save hook
        role: 'warehouse',
        accountStatus: 'active',
        emailVerified: true
      }),
      User.create({
        userCode: 'WS-002',
        firstName: 'Jane',
        lastName: 'Operations',
        email: 'jane@warehouse.com',
        passwordHash: 'staff123', // Will be hashed by pre-save hook
        role: 'warehouse',
        accountStatus: 'active',
        emailVerified: true
      })
    ]);
    console.log(`Created ${staffUsers.length} warehouse staff users`);

    // Create test customers
    const customers = await Promise.all([
      User.create({
        userCode: 'CU-001',
        firstName: 'Alice',
        lastName: 'Customer',
        email: 'alice@customer.com',
        passwordHash: 'customer123', // Will be hashed by pre-save hook
        role: 'customer',
        accountStatus: 'active',
        emailVerified: true,
        mailboxNumber: 'CLEAN-0001'
      }),
      User.create({
        userCode: 'CU-002',
        firstName: 'Bob',
        lastName: 'Customer',
        email: 'bob@customer.com',
        passwordHash: 'customer123', // Will be hashed by pre-save hook
        role: 'customer',
        accountStatus: 'active',
        emailVerified: true,
        mailboxNumber: 'CLEAN-0002'
      }),
      User.create({
        userCode: 'CU-003',
        firstName: 'Charlie',
        lastName: 'Customer',
        email: 'charlie@customer.com',
        passwordHash: 'customer123', // Will be hashed by pre-save hook
        role: 'customer',
        accountStatus: 'active',
        emailVerified: true,
        mailboxNumber: 'CLEAN-0003'
      })
    ]);
    console.log(`Created ${customers.length} customer users`);

    // Create warehouses with KCD Logistics Corp addresses
    const warehouses = await Promise.all([
      Warehouse.create({
        name: 'KCD Logistics Corp - Main',
        code: 'KCD',
        address: '3200 NW 112th Ave',
        city: 'Doral',
        state: 'Florida',
        zipCode: '33172',
        country: 'USA',
        isActive: true,
        isDefault: true,
        companyAbbreviation: 'CLEAN',
        airAddress: {
          name: 'KCD Logistics Corp',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '+1-305-555-0100',
          email: 'air@kcdlogistics.com',
          instructions: 'Standard Air Address - Use KCDE-[MAILBOX#] format for recipient line'
        },
        seaAddress: {
          name: 'KCD Logistics Corp',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '+1-305-555-0200',
          email: 'sea@kcdlogistics.com',
          instructions: 'Standard Sea Address - Use KCDX-[MAILBOX#] format for recipient line'
        },
        chinaAddress: {
          name: 'KCD Logistics Corp - China Office',
          street: 'Baoshan No.2 Industrial Zone',
          city: 'Shenzhen',
          state: 'Guangdong Province',
          zipCode: '518000',
          country: 'China',
          phone: '+86-755-555-0300',
          email: 'china@kcdlogistics.com',
          instructions: 'China Address - Use FirstName LastName / [MAILBOX#] format. Approx 2 Months sail time. Charges does not include duty.'
        }
      }),
      Warehouse.create({
        name: 'KCD Logistics Corp - Backup',
        code: 'KCDB',
        address: '3200 NW 112th Ave',
        city: 'Doral',
        state: 'Florida',
        zipCode: '33172',
        country: 'USA',
        isActive: true,
        isDefault: false,
        companyAbbreviation: 'CLEAN',
        airAddress: {
          name: 'KCD Logistics Corp - Backup',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '+1-305-555-0400',
          email: 'backup-air@kcdlogistics.com'
        },
        seaAddress: {
          name: 'KCD Logistics Corp - Backup',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '+1-305-555-0500',
          email: 'backup-sea@kcdlogistics.com'
        },
        chinaAddress: {
          name: 'KCD Logistics Corp - China Backup',
          street: 'Baoshan No.2 Industrial Zone',
          city: 'Shenzhen',
          state: 'Guangdong Province',
          zipCode: '518000',
          country: 'China',
          phone: '+86-755-555-0600',
          email: 'backup-china@kcdlogistics.com'
        }
      })
    ]);
    console.log(`Created ${warehouses.length} warehouses`);

    // Create inventory items
    const inventoryItems = [
      {
        name: 'Shipping Box Small',
        sku: 'BOX-SM-001',
        category: 'Packaging',
        quantity: 1000,
        minStockLevel: 100,
        maxStockLevel: 2000,
        unitPrice: 1.50,
        currency: 'USD',
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'A',
          shelf: '1',
          bin: '01'
        },
        dimensions: {
          length: 30,
          width: 20,
          height: 15,
          unit: 'cm'
        },
        weight: {
          value: 0.5,
          unit: 'kg'
        },
        tags: ['box', 'small', 'cardboard'],
        isActive: true,
        lowStockAlert: false,
        createdBy: admin._id
      },
      {
        name: 'Shipping Box Medium',
        sku: 'BOX-MD-001',
        category: 'Packaging',
        quantity: 500,
        minStockLevel: 50,
        maxStockLevel: 1000,
        unitPrice: 2.75,
        currency: 'USD',
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'A',
          shelf: '1',
          bin: '02'
        },
        dimensions: {
          length: 45,
          width: 30,
          height: 20,
          unit: 'cm'
        },
        weight: {
          value: 0.8,
          unit: 'kg'
        },
        tags: ['box', 'medium', 'cardboard'],
        isActive: true,
        lowStockAlert: false,
        createdBy: admin._id
      }
    ];

    const createdInventory = await Inventory.insertMany(inventoryItems);
    console.log(`Created ${createdInventory.length} inventory items`);

    // Create API keys for warehouses
    const apiKeys = await Promise.all([
      ApiKey.create({
        key: generateApiKey(),
        name: 'KCD Logistics API',
        description: 'API key for KCD Logistics Corp operations',
        warehouseId: warehouses[0]._id,
        permissions: ['packages:read', 'packages:write', 'inventory:read', 'inventory:write'],
        isActive: true,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 2000,
          requestsPerDay: 20000
        },
        createdBy: admin._id
      }),
      ApiKey.create({
        key: generateApiKey(),
        name: 'KCD Backup API',
        description: 'API key for KCD Logistics Corp backup operations',
        warehouseId: warehouses[1]._id,
        permissions: ['packages:read', 'packages:write', 'inventory:read'],
        isActive: true,
        rateLimit: {
          requestsPerMinute: 75,
          requestsPerHour: 1500,
          requestsPerDay: 15000
        },
        createdBy: admin._id
      })
    ]);
    console.log(`Created ${apiKeys.length} API keys`);

    console.log('\n=== Database Seeding Complete ===');
    console.log('\n✅ KCD LOGISTICS CORP ADDRESSES CONFIGURED:');
    console.log('\n📍 Air Address (KCDE):');
    console.log('   3200 NW 112th Ave');
    console.log('   KCDE-[MAILBOX#]');
    console.log('   Doral, Florida 33172');
    console.log('\n🚢 Sea Address (KCDX):');
    console.log('   3200 NW 112th Ave');
    console.log('   KCDX-[MAILBOX#]');
    console.log('   Doral, Florida 33172');
    console.log('\n🇨🇳 China Address:');
    console.log('   FirstName LastName / [MAILBOX#]');
    console.log('   China, Guangdong Province, Shenzhen');
    console.log('   Baoshan No.2 Industrial Zone');
    console.log('   (Approx 2 Months sail time)');
    
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@warehouse.com / admin123');
    console.log('Staff: john@warehouse.com / staff123');
    console.log('Staff: jane@warehouse.com / staff123');
    console.log('Customer: alice@customer.com / customer123 (CLEAN-0001)');
    console.log('Customer: bob@customer.com / customer123 (CLEAN-0002)');
    console.log('Customer: charlie@customer.com / customer123 (CLEAN-0003)');
    
    console.log('\n🔑 API Keys:');
    apiKeys.forEach((apiKey, index) => {
      console.log(`${warehouses[index].name}: ${apiKey.key}`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('\nDisconnected from database');
    process.exit(0);
  }
};

// Run the seed function
seedData();