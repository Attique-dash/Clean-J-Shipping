import mongoose from 'mongoose';
import { config } from '../src/config/env';
import { Warehouse } from '../src/models/Warehouse';

async function updateWarehouseAddresses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the default warehouse
    const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
    
    if (!warehouse) {
      console.log('No default warehouse found. Creating one...');
      
      // Create default warehouse with correct addresses
      const newWarehouse = await Warehouse.create({
        name: 'Clean J Shipping - Main Warehouse',
        isActive: true,
        isDefault: true,
        companyAbbreviation: 'CLEAN',
        airAddress: {
          name: 'Clean J Shipping - Air Cargo',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include your mailbox number (KCDE-[MAILBOX#]) for air shipments'
        },
        seaAddress: {
          name: 'Clean J Shipping - Sea Cargo',
          street: '3200 NW 112th Ave',
          city: 'Doral',
          state: 'Florida',
          zipCode: '33172',
          country: 'USA',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include your mailbox number (KCDX-[MAILBOX#]) for sea shipments'
        },
        chinaAddress: {
          name: 'Clean J Shipping - China Office',
          street: 'Baoshan No.2 Industrial Zone',
          city: 'Shenzhen',
          state: 'Guangdong Province',
          zipCode: '518000',
          country: 'China',
          phone: '1 (876) 578-5945',
          email: 'cleanjshipping@gmail.com',
          instructions: 'Include your mailbox number ([MAILBOX#]) for China shipments'
        }
      });
      
      console.log('Created new warehouse with updated addresses');
    } else {
      // Update existing warehouse addresses
      warehouse.airAddress = {
        name: 'Clean J Shipping - Air Cargo',
        street: '3200 NW 112th Ave',
        city: 'Doral',
        state: 'Florida',
        zipCode: '33172',
        country: 'USA',
        phone: '1 (876) 578-5945',
        email: 'cleanjshipping@gmail.com',
        instructions: 'Include your mailbox number (KCDE-[MAILBOX#]) for air shipments'
      };
      
      warehouse.seaAddress = {
        name: 'Clean J Shipping - Sea Cargo',
        street: '3200 NW 112th Ave',
        city: 'Doral',
        state: 'Florida',
        zipCode: '33172',
        country: 'USA',
        phone: '1 (876) 578-5945',
        email: 'cleanjshipping@gmail.com',
        instructions: 'Include your mailbox number (KCDX-[MAILBOX#]) for sea shipments'
      };
      
      warehouse.chinaAddress = {
        name: 'Clean J Shipping - China Office',
        street: 'Baoshan No.2 Industrial Zone',
        city: 'Shenzhen',
        state: 'Guangdong Province',
        zipCode: '518000',
        country: 'China',
        phone: '1 (876) 578-5945',
        email: 'cleanjshipping@gmail.com',
        instructions: 'Include your mailbox number ([MAILBOX#]) for China shipments'
      };
      
      await warehouse.save();
      console.log('Updated warehouse addresses successfully');
    }

    console.log('Warehouse addresses update completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating warehouse addresses:', error);
    process.exit(1);
  }
}

updateWarehouseAddresses();
