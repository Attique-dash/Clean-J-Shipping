import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Warehouse } from '../src/models/Warehouse';
import { ApiKey } from '../src/models/ApiKey';
import { User } from '../src/models/User';
import { generateApiKey } from '../src/utils/helpers';

const createApiKey = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Get command line arguments
    const args = process.argv.slice(2);
    const warehouseCode = args[0];
    const keyName = args[1] || 'Generated API Key';
    const description = args[2] || 'API key generated via script';

    if (!warehouseCode) {
      console.error('Usage: npm run create-api-key <warehouse-code> [key-name] [description]');
      console.error('Example: npm run create-api-key MDC "Main API" "Primary API key"');
      process.exit(1);
    }

    // Find warehouse
    const warehouse = await Warehouse.findOne({ code: warehouseCode.toUpperCase() });
    if (!warehouse) {
      console.error(`Warehouse with code "${warehouseCode}" not found`);
      console.log('Available warehouses:');
      const warehouses = await Warehouse.find({}, 'code name');
      warehouses.forEach(w => {
        console.log(`  ${w.code}: ${w.name}`);
      });
      process.exit(1);
    }

    // Find admin user (for createdBy field)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Generate API key
    const apiKey = await ApiKey.create({
      key: generateApiKey(),
      name: keyName,
      description,
      warehouseId: warehouse._id,
      permissions: [
        'packages:read',
        'packages:write',
        'inventory:read',
        'inventory:write',
        'customers:read',
        'analytics:read'
      ],
      isActive: true,
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 20000
      },
      createdBy: adminUser._id
    });

    console.log('\n=== API Key Created Successfully ===');
    console.log(`Warehouse: ${warehouse.name} (${warehouse.code})`);
    console.log(`Key Name: ${keyName}`);
    console.log(`API Key: ${apiKey.key}`);
    console.log(`Description: ${description}`);
    console.log(`Permissions: ${apiKey.permissions.join(', ')}`);
    console.log(`Rate Limit: ${apiKey.rateLimit?.requestsPerMinute}/min, ${apiKey.rateLimit?.requestsPerHour}/hour`);
    console.log(`Created: ${apiKey.createdAt}`);
    console.log(`Expires: ${apiKey.expiresAt || 'Never'}`);

    console.log('\n=== Usage Instructions ===');
    console.log('Include this key in your requests as:');
    console.log('X-API-Key: ' + apiKey.key);
    console.log('\nExample with curl:');
    console.log(`curl -H "X-API-Key: ${apiKey.key}" http://localhost:3001/api/warehouse/packages`);

  } catch (error) {
    console.error('Error creating API key:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('\nDisconnected from database');
    process.exit(0);
  }
};

// Run the function
createApiKey();
