import mongoose from 'mongoose';
import { Warehouse } from '../models/Warehouse';
import { config } from '../config/env';
import { logger } from '../utils/logger';

async function seedWarehouse() {
  try {
    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Check if warehouse already exists
    const existingWarehouse = await Warehouse.findOne({ code: 'CJS' });
    if (existingWarehouse) {
      logger.info('Warehouse already exists, updating addresses...');
      
      // Update warehouse with shipping addresses
      await Warehouse.updateOne(
        { code: 'CJS' },
        {
          $set: {
            airAddress: {
              name: 'Clean J Shipping',
              street: '700 NW 57 Place',
              city: 'Ft. Lauderdale',
              state: 'Florida',
              zipCode: '33309',
              country: 'USA',
              phone: '1 (876) 578-5945',
              email: 'cleanjshipping@gmail.com',
              instructions: 'Include mailbox number in recipient line - Use AIR-[MAILBOX#] format'
            },
            seaAddress: {
              name: 'Clean J Shipping',
              street: '700 NW 57 Place',
              city: 'Ft. Lauderdale',
              state: 'Florida',
              zipCode: '33309',
              country: 'USA',
              phone: '1 (876) 578-5945',
              email: 'cleanjshipping@gmail.com',
              instructions: 'Include mailbox number in recipient line - Use SEA-[MAILBOX#] format'
            },
            chinaAddress: {
              name: 'Clean J Shipping',
              street: 'Baoshan No.2 Industrial Zone',
              city: 'Shenzhen',
              state: 'Guangdong Province',
              zipCode: '518000',
              country: 'China',
              phone: '1 (876) 578-5945',
              email: 'cleanjshipping@gmail.com',
              instructions: 'Include mailbox number in recipient line'
            }
          }
        }
      );
      
      logger.info('Warehouse addresses updated successfully');
    } else {
      // Create new warehouse
      const warehouse = new Warehouse({
        code: 'CJS',
        name: 'Clean J Shipping Main Warehouse',
        address: '700 NW 57 Place',
        city: 'Ft. Lauderdale',
        state: 'Florida',
        zipCode: '33309',
        country: 'USA',
        isActive: true,
        isDefault: true,
        companyAbbreviation: 'CLEAN',
        airAddress: {
          name: 'Clean J Shipping',
          street: '700 NW 57 Place',
          city: 'Ft. Lauderdale',
          state: 'Florida',
          zipCode: '33309',
          country: 'USA',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include mailbox number in recipient line - Use AIR-[MAILBOX#] format'
        },
        seaAddress: {
          name: 'Clean J Shipping',
          street: '700 NW 57 Place',
          city: 'Ft. Lauderdale',
          state: 'Florida',
          zipCode: '33309',
          country: 'USA',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include mailbox number in recipient line - Use SEA-[MAILBOX#] format'
        },
        chinaAddress: {
          name: 'Clean J Shipping',
          street: 'Baoshan No.2 Industrial Zone',
          city: 'Shenzhen',
          state: 'Guangdong Province',
          zipCode: '518000',
          country: 'China',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include mailbox number in recipient line'
        }
      });

      await warehouse.save();
      logger.info('New warehouse created successfully');
    }

    // Display warehouse info
    const warehouse = await Warehouse.findOne({ code: 'CJS' });
    console.log('\n=== Warehouse Configuration ===');
    console.log(`Name: ${warehouse?.name}`);
    console.log(`Code: ${warehouse?.code}`);
    console.log(`Company Abbreviation: ${warehouse?.companyAbbreviation}`);
    console.log('\n--- Air Address ---');
    console.log(`${warehouse?.airAddress?.name}`);
    console.log(`${warehouse?.airAddress?.street}`);
    console.log(`${warehouse?.airAddress?.city}, ${warehouse?.airAddress?.state} ${warehouse?.airAddress?.zipCode}`);
    console.log(`${warehouse?.airAddress?.country}`);
    console.log('\n--- Sea Address ---');
    console.log(`${warehouse?.seaAddress?.name}`);
    console.log(`${warehouse?.seaAddress?.street}`);
    console.log(`${warehouse?.seaAddress?.city}, ${warehouse?.seaAddress?.state} ${warehouse?.seaAddress?.zipCode}`);
    console.log(`${warehouse?.seaAddress?.country}`);
    console.log('\n--- China Address ---');
    console.log(`${warehouse?.chinaAddress?.name}`);
    console.log(`${warehouse?.chinaAddress?.street}`);
    console.log(`${warehouse?.chinaAddress?.city}, ${warehouse?.chinaAddress?.state} ${warehouse?.chinaAddress?.zipCode}`);
    console.log(`${warehouse?.chinaAddress?.country}`);

  } catch (error) {
    logger.error('Error seeding warehouse:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the seed function
seedWarehouse();
