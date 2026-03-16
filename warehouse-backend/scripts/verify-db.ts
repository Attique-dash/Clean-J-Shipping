import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { Warehouse } from '../src/models/Warehouse';
import { Inventory } from '../src/models/Inventory';
import { ApiKey } from '../src/models/ApiKey';

const verifyData = async () => {
  try {
    await connectDatabase();
    console.log('=== DATABASE VERIFICATION ===\n');

    // Check users
    const users = await User.find({});
    console.log(`Total Users: ${users.length}`);
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });

    // Check warehouses
    const warehouses = await Warehouse.find({});
    console.log(`\nTotal Warehouses: ${warehouses.length}`);
    warehouses.forEach(warehouse => {
      console.log(`- ${warehouse.name} (${warehouse.code})`);
    });

    // Check inventory
    const inventory = await Inventory.find({});
    console.log(`\nTotal Inventory Items: ${inventory.length}`);
    inventory.forEach(item => {
      console.log(`- ${item.name} (${item.sku}) - Qty: ${item.quantity}`);
    });

    // Check API keys
    const apiKeys = await ApiKey.find({});
    console.log(`\nTotal API Keys: ${apiKeys.length}`);
    apiKeys.forEach(key => {
      console.log(`- ${key.name} (${key.key.substring(0, 10)}...)`);
    });

  } catch (error) {
    console.error('Error verifying database:', error);
  } finally {
    await disconnectDatabase();
  }
};

verifyData();
