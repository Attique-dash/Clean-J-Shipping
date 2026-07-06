const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Get MongoDB URI from command line argument or environment variable
const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MongoDB URI not provided.');
  console.error('Usage: node scripts/update-warehouse-addresses-direct.js <mongodb-uri>');
  console.error('Or set MONGODB_URI in .env.local file');
  process.exit(1);
}

async function updateWarehouseAddresses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const warehouse = await mongoose.connection.db.collection('warehouses').findOne({ 
      isActive: true, 
      isDefault: true 
    });

    if (!warehouse) {
      console.log('No default warehouse found. Creating one...');
      
      const newWarehouse = {
        code: 'CJS',
        name: 'Clean J Shipping Main Warehouse',
        address: '700 NW 57 Place',
        city: 'Ft. Lauderdale',
        state: 'Florida',
        zipCode: '33309',
        country: 'USA',
        phone: '(876) 578-5945',
        email: 'info@cleanjshipping.com',
        isActive: true,
        isDefault: true,
        airAddress: '700 NW 57 Place\nAIR-[MAILBOX]\nFt. Lauderdale, Florida 33309\nUSA',
        seaAddress: '700 NW 57 Place\nSEA-[MAILBOX]\nFt. Lauderdale, Florida 33309\nUSA',
        chinaAddress: '[MAILBOX]\nBaoshan No.2 Industrial Zone\nShenzhen, Guangdong Province 518000\nChina',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mongoose.connection.db.collection('warehouses').insertOne(newWarehouse);
      console.log('Created new warehouse with correct addresses');
    } else {
      console.log('Found warehouse:', warehouse.name);
      console.log('Current airAddress:', warehouse.airAddress);
      console.log('Current seaAddress:', warehouse.seaAddress);
      console.log('Current chinaAddress:', warehouse.chinaAddress);

      // Update with correct addresses
      const updateResult = await mongoose.connection.db.collection('warehouses').updateOne(
        { _id: warehouse._id },
        {
          $set: {
            address: '700 NW 57 Place',
            city: 'Ft. Lauderdale',
            state: 'Florida',
            zipCode: '33309',
            airAddress: '700 NW 57 Place\nAIR-[MAILBOX]\nFt. Lauderdale, Florida 33309\nUSA',
            seaAddress: '700 NW 57 Place\nSEA-[MAILBOX]\nFt. Lauderdale, Florida 33309\nUSA',
            chinaAddress: '[MAILBOX]\nBaoshan No.2 Industrial Zone\nShenzhen, Guangdong Province 518000\nChina',
            updatedAt: new Date()
          }
        }
      );

      console.log('Updated warehouse addresses');
      console.log('Matched:', updateResult.matchedCount, 'Modified:', updateResult.modifiedCount);
    }

    // Verify the update
    const updatedWarehouse = await mongoose.connection.db.collection('warehouses').findOne({ 
      isActive: true, 
      isDefault: true 
    });
    console.log('\n--- VERIFIED ADDRESSES ---');
    console.log('Air Address:', updatedWarehouse.airAddress);
    console.log('Sea Address:', updatedWarehouse.seaAddress);
    console.log('China Address:', updatedWarehouse.chinaAddress);

    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateWarehouseAddresses();
