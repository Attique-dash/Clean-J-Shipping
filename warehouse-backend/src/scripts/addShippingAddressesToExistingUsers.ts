import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { ShippingAddressService } from '../services/shippingAddressService';

async function addShippingAddressesToExistingUsers() {
  try {
    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Find all customers without shipping addresses
    const customersWithoutAddresses = await User.find({
      role: 'customer',
      $or: [
        { shippingAddresses: { $size: 0 } },
        { shippingAddresses: { $exists: false } },
        { shippingAddresses: null }
      ]
    });

    logger.info(`Found ${customersWithoutAddresses.length} customers without shipping addresses`);

    for (const customer of customersWithoutAddresses) {
      try {
        await ShippingAddressService.createDefaultShippingAddresses(customer._id);
        logger.info(`Added shipping addresses for: ${customer.email} (${customer.userCode})`);
      } catch (error) {
        logger.error(`Failed to add addresses for ${customer.email}:`, error);
      }
    }

    logger.info('Process completed successfully');
  } catch (error) {
    logger.error('Error adding shipping addresses to existing users:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the function
addShippingAddressesToExistingUsers();
