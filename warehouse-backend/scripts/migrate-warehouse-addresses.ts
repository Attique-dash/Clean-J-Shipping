import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Warehouse } from '../src/models/Warehouse';
import { logger } from '../src/utils/logger';

const migrateWarehouseAddresses = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Find all warehouses that are missing the new address fields
    const warehousesNeedingMigration = await Warehouse.find({
      $or: [
        { airAddress: { $exists: false } },
        { airAddress: null },
        { seaAddress: { $exists: false } },
        { seaAddress: null },
        { chinaAddress: { $exists: false } },
        { chinaAddress: null },
        { companyAbbreviation: { $exists: false } },
        { companyAbbreviation: null }
      ]
    });

    console.log(`Found ${warehousesNeedingMigration.length} warehouses needing address migration`);

    if (warehousesNeedingMigration.length === 0) {
      console.log('All warehouses already have shipping addresses configured');
      return;
    }

    // Default addresses for Clean J Shipping
    const defaultAddresses = {
      airAddress: {
        name: 'Clean J Shipping Air Facility',
        street: '123 Airport Road',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        country: 'USA',
        phone: '+1-305-555-0100',
        email: 'air@clean-shipping.com',
        instructions: 'Please include tracking number on all air shipments'
      },
      seaAddress: {
        name: 'Clean J Shipping Sea Terminal',
        street: '456 Harbor Drive',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
        phone: '+1-310-555-0200',
        email: 'sea@clean-shipping.com',
        instructions: 'Sea shipments typically arrive within 7-14 business days'
      },
      chinaAddress: {
        name: 'Clean J Shipping China Office',
        street: '789 Beijing Road',
        city: 'Shanghai',
        state: 'Shanghai',
        zipCode: '200000',
        country: 'China',
        phone: '+86-21-555-0300',
        email: 'china@clean-shipping.com',
        instructions: 'China office handles all Asia-Pacific shipments'
      }
    };

    // Update each warehouse
    for (const warehouse of warehousesNeedingMigration) {
      const updates: any = {};

      // Add missing address fields
      if (!warehouse.airAddress) {
        updates.airAddress = defaultAddresses.airAddress;
      }

      if (!warehouse.seaAddress) {
        updates.seaAddress = defaultAddresses.seaAddress;
      }

      if (!warehouse.chinaAddress) {
        updates.chinaAddress = defaultAddresses.chinaAddress;
      }

      // Add company abbreviation if missing
      if (!warehouse.companyAbbreviation) {
        updates.companyAbbreviation = 'CLEAN';
      }

      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        await Warehouse.findByIdAndUpdate(warehouse._id, updates, { 
          new: true, 
          runValidators: true 
        });
        
        console.log(`Updated warehouse: ${warehouse.name} (${warehouse.code})`);
        logger.info(`Migrated shipping addresses for warehouse: ${warehouse.name}`);
      }
    }

    // Verify the migration
    const updatedWarehouses = await Warehouse.find({
      $and: [
        { isActive: true },
        {
          $and: [
            { airAddress: { $exists: true, $ne: null } },
            { seaAddress: { $exists: true, $ne: null } },
            { chinaAddress: { $exists: true, $ne: null } },
            { companyAbbreviation: { $exists: true, $ne: null } }
          ]
        }
      ]
    });

    console.log(`\nMigration complete! ${updatedWarehouses.length} warehouses now have complete shipping addresses`);

    // Display sample data for verification
    if (updatedWarehouses.length > 0) {
      const sample = updatedWarehouses[0];
      console.log('\nSample warehouse data:');
      console.log(`Name: ${sample.name}`);
      console.log(`Code: ${sample.code}`);
      console.log(`Company Abbreviation: ${sample.companyAbbreviation}`);
      console.log(`Air Address: ${sample.airAddress?.name} - ${sample.airAddress?.street}, ${sample.airAddress?.city}`);
      console.log(`Sea Address: ${sample.seaAddress?.name} - ${sample.seaAddress?.street}, ${sample.seaAddress?.city}`);
      console.log(`China Address: ${sample.chinaAddress?.name} - ${sample.chinaAddress?.street}, ${sample.chinaAddress?.city}`);
    }

  } catch (error) {
    console.error('Error running warehouse address migration:', error);
    logger.error('Warehouse address migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

// Run the migration
migrateWarehouseAddresses();
