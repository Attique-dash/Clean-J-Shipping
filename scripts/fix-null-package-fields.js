// Script to fix null values in package collection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNullPackageFields() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected to database');

    // Find all packages with null senderName
    const packages = await prisma.$runCommandRaw({
      find: 'packages',
      filter: { 
        $or: [
          { senderName: null },
          { senderName: { $exists: false } },
          { senderName: '' }
        ]
      }
    });

    console.log(`Found ${packages.cursor.firstBatch.length} packages with null/empty senderName`);

    // Update each package with null/empty senderName
    const updatePromises = packages.cursor.firstBatch.map(pkg => {
      return prisma.$runCommandRaw({
        update: 'packages',
        updates: [
          {
            q: { _id: pkg._id },
            u: {
              $set: {
                senderName: pkg.senderName || 'Unknown Sender',
                senderPhone: pkg.senderPhone || 'N/A',
                senderAddress: pkg.senderAddress || 'N/A',
                senderCity: pkg.senderCity || 'N/A',
                senderState: pkg.senderState || 'N/A',
                senderZipCode: pkg.senderZipCode || 'N/A',
                senderCountry: pkg.senderCountry || 'Pakistan',
                receiverName: pkg.receiverName || 'Unknown Receiver',
                receiverPhone: pkg.receiverPhone || 'N/A',
                receiverAddress: pkg.receiverAddress || 'N/A',
                receiverCity: pkg.receiverCity || 'N/A',
                receiverState: pkg.receiverState || 'N/A',
                receiverZipCode: pkg.receiverZipCode || 'N/A',
                receiverCountry: pkg.receiverCountry || 'Pakistan',
                itemDescription: pkg.itemDescription || 'Package',
                packageType: pkg.packageType || 'parcel',
                deliveryType: pkg.deliveryType || 'standard',
                paymentMethod: pkg.paymentMethod || 'cash',
                paymentStatus: pkg.paymentStatus || 'pending',
                status: pkg.status || 'pending',
                weight: pkg.weight || 0.5,
                shippingCost: pkg.shippingCost || 0,
                totalAmount: pkg.totalAmount || 0
              }
            },
            multi: false
          }
        ]
      });
    });

    await Promise.all(updatePromises);
    console.log('Successfully updated packages with null/empty fields');
  } catch (error) {
    console.error('Error fixing null package fields:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

fixNullPackageFields();
