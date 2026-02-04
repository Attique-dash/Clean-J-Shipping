import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { Warehouse } from '../src/models/Warehouse';
import { Inventory } from '../src/models/Inventory';
import { ApiKey } from '../src/models/ApiKey';
import { USER_ROLES } from '../src/utils/constants';
import { generateApiKey } from '../src/utils/helpers';
import bcrypt from 'bcryptjs';

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
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@warehouse.com',
      password: adminPassword,
      role: USER_ROLES.ADMIN,
      isActive: true,
      emailVerified: true
    });
    console.log('Created admin user:', admin.email);

    // Create warehouse staff users
    const staffPassword = await bcrypt.hash('staff123', 12);
    const staffUsers = await Promise.all([
      User.create({
        name: 'John Warehouse',
        email: 'john@warehouse.com',
        password: staffPassword,
        role: USER_ROLES.WAREHOUSE_STAFF,
        isActive: true,
        emailVerified: true
      }),
      User.create({
        name: 'Jane Operations',
        email: 'jane@warehouse.com',
        password: staffPassword,
        role: USER_ROLES.WAREHOUSE_STAFF,
        isActive: true,
        emailVerified: true
      })
    ]);
    console.log(`Created ${staffUsers.length} warehouse staff users`);

    // Create test customers
    const customerPassword = await bcrypt.hash('customer123', 12);
    const customers = await Promise.all([
      User.create({
        name: 'Alice Customer',
        email: 'alice@customer.com',
        password: customerPassword,
        role: USER_ROLES.CUSTOMER,
        isActive: true,
        emailVerified: true
      }),
      User.create({
        name: 'Bob Customer',
        email: 'bob@customer.com',
        password: customerPassword,
        role: USER_ROLES.CUSTOMER,
        isActive: true,
        emailVerified: true
      }),
      User.create({
        name: 'Charlie Customer',
        email: 'charlie@customer.com',
        password: customerPassword,
        role: USER_ROLES.CUSTOMER,
        isActive: true,
        emailVerified: true
      })
    ]);
    console.log(`Created ${customers.length} customer users`);

    // Create warehouses
    const warehouses = await Promise.all([
      Warehouse.create({
        name: 'Main Distribution Center',
        code: 'MDC',
        address: {
          street: '123 Logistics Blvd',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        contact: {
          phone: '+1-555-0101',
          email: 'mdc@warehouse.com',
          manager: 'John Warehouse'
        },
        dimensions: {
          totalArea: 50000,
          storageArea: 40000,
          officeArea: 10000,
          unit: 'sqft'
        },
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '08:00', close: '18:00' },
          sunday: { open: 'closed', close: 'closed' }
        },
        capabilities: ['storage', 'packaging', 'shipping', 'returns'],
        isActive: true,
        capacity: {
          totalPackages: 10000,
          currentPackages: 0,
          maxWeight: 100000,
          currentWeight: 0
        },
        staff: staffUsers.map(user => user._id)
      }),
      Warehouse.create({
        name: 'West Coast Hub',
        code: 'WCH',
        address: {
          street: '456 Pacific Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA',
          coordinates: { lat: 34.0522, lng: -118.2437 }
        },
        contact: {
          phone: '+1-555-0202',
          email: 'wch@warehouse.com',
          manager: 'Jane Operations'
        },
        dimensions: {
          totalArea: 35000,
          storageArea: 28000,
          officeArea: 7000,
          unit: 'sqft'
        },
        operatingHours: {
          monday: { open: '07:00', close: '21:00' },
          tuesday: { open: '07:00', close: '21:00' },
          wednesday: { open: '07:00', close: '21:00' },
          thursday: { open: '07:00', close: '21:00' },
          friday: { open: '07:00', close: '21:00' },
          saturday: { open: '09:00', close: '17:00' },
          sunday: { open: 'closed', close: 'closed' }
        },
        capabilities: ['storage', 'packaging', 'shipping'],
        isActive: true,
        capacity: {
          totalPackages: 7500,
          currentPackages: 0,
          maxWeight: 75000,
          currentWeight: 0
        },
        staff: [staffUsers[1]._id]
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
        createdBy: admin._id
      },
      {
        name: 'Bubble Wrap Roll',
        sku: 'BUBBLE-001',
        category: 'Packaging',
        quantity: 200,
        minStockLevel: 25,
        maxStockLevel: 400,
        unitPrice: 15.99,
        currency: 'USD',
        location: {
          warehouse: warehouses[1]._id,
          aisle: 'B',
          shelf: '2',
          bin: '05'
        },
        dimensions: {
          length: 100,
          width: 50,
          height: 50,
          unit: 'cm'
        },
        weight: {
          value: 2.5,
          unit: 'kg'
        },
        tags: ['bubble', 'wrap', 'protection'],
        createdBy: admin._id
      },
      {
        name: 'Packing Tape',
        sku: 'TAPE-001',
        category: 'Packaging',
        quantity: 150,
        minStockLevel: 20,
        maxStockLevel: 300,
        unitPrice: 3.99,
        currency: 'USD',
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'C',
          shelf: '3',
          bin: '01'
        },
        dimensions: {
          length: 10,
          width: 10,
          height: 5,
          unit: 'cm'
        },
        weight: {
          value: 0.3,
          unit: 'kg'
        },
        tags: ['tape', 'adhesive', 'sealing'],
        createdBy: admin._id
      },
      {
        name: 'Electronic Scale',
        sku: 'SCALE-001',
        category: 'Equipment',
        quantity: 25,
        minStockLevel: 5,
        maxStockLevel: 50,
        unitPrice: 89.99,
        currency: 'USD',
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'D',
          shelf: '1',
          bin: '01'
        },
        dimensions: {
          length: 30,
          width: 25,
          height: 10,
          unit: 'cm'
        },
        weight: {
          value: 3.2,
          unit: 'kg'
        },
        tags: ['scale', 'electronic', 'weighing'],
        createdBy: admin._id
      }
    ];

    const createdInventory = await Inventory.insertMany(inventoryItems);
    console.log(`Created ${createdInventory.length} inventory items`);

    // Create API keys for warehouses
    const apiKeys = await Promise.all([
      ApiKey.create({
        key: generateApiKey(),
        name: 'Main Distribution Center API',
        description: 'API key for Main Distribution Center operations',
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
        name: 'West Coast Hub API',
        description: 'API key for West Coast Hub operations',
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
    console.log('\nLogin Credentials:');
    console.log('Admin: admin@warehouse.com / admin123');
    console.log('Staff: john@warehouse.com / staff123');
    console.log('Staff: jane@warehouse.com / staff123');
    console.log('Customer: alice@customer.com / customer123');
    console.log('Customer: bob@customer.com / customer123');
    console.log('Customer: charlie@customer.com / customer123');
    
    console.log('\nAPI Keys:');
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
