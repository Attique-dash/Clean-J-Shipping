import { dbConnect } from '../src/lib/db.js';
import ShipmentManifest from '../src/models/ShipmentManifest.js';

async function updateManifests() {
  try {
    await dbConnect();
    
    console.log('Updating existing manifests...');
    
    // Update all manifests that don't have the new fields
    const result = await ShipmentManifest.updateMany(
      { 
        $or: [
          { mode: { $exists: false } },
          { title: { $exists: false } }
        ]
      },
      { 
        $set: { 
          mode: 'air',
          title: null,
          batchDate: null
        },
        $setOnInsert: {
          createdBy: 'system',
          updatedBy: 'system'
        }
      },
      { upsert: false }
    );

    console.log(`Updated ${result.modifiedCount} manifests`);

    // Update shipments to include notes field
    const shipmentResult = await ShipmentManifest.updateMany(
      { 
        'shipments.notes': { $exists: false }
      },
      { 
        $set: { 
          'shipments.$[].notes': null
        }
      }
    );

    console.log(`Updated ${shipmentResult.modifiedCount} shipment items with notes field`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

updateManifests();
