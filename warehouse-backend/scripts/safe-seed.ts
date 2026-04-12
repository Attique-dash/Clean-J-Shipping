import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';
import { Warehouse } from '../src/models/Warehouse';
import { Inventory } from '../src/models/Inventory';
import { ApiKey } from '../src/models/ApiKey';
import { generateApiKey } from '../src/utils/helpers';

const safeSeed = async () => {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Only create admin if not exists
    const adminExists = await User.findOne({ email: 'admin@warehouse.com' });
    if (!adminExists) {
      const admin = await User.create({
        userCode: 'AD-001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@warehouse.com',
        passwordHash: 'admin123',
        role: 'admin',
        accountStatus: 'active',
        emailVerified: true
      });
      console.log('✅ Created admin user:', admin.email);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Only create warehouse staff if not exists
    const staffEmails = ['john@warehouse.com', 'jane@warehouse.com'];
    for (const email of staffEmails) {
      const exists = await User.findOne({ email });
      if (!exists) {
        const userCode = email === 'john@warehouse.com' ? 'WS-001' : 'WS-002';
        const firstName = email === 'john@warehouse.com' ? 'John' : 'Jane';
        const lastName = email === 'john@warehouse.com' ? 'Warehouse' : 'Operations';
        
        await User.create({
          userCode,
          firstName,
          lastName,
          email,
          passwordHash: 'staff123',
          role: 'warehouse',
          accountStatus: 'active',
          emailVerified: true
        });
        console.log(`✅ Created staff user: ${email}`);
      } else {
        console.log(`ℹ️  Staff user already exists: ${email}`);
      }
    }

    // Only create default warehouse if not exists
    const warehouseExists = await Warehouse.findOne({ isDefault: true });
    if (!warehouseExists) {
      const warehouse = await Warehouse.create({
        name: 'KCD Logistics Corp - Main',
        code: 'KCD',
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
          instructions: 'Standard Air Address - Use AIR-[MAILBOX#] format for recipient line'
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
          instructions: 'Standard Sea Address - Use SEA-[MAILBOX#] format for recipient line'
        },
        chinaAddress: {
          name: 'Clean J Shipping - China Office',
          street: 'Baoshan No.2 Industrial Zone',
          city: 'Shenzhen',
          state: 'Guangdong Province',
          zipCode: '518000',
          country: 'China',
          phone: '+86-755-555-0300',
          email: 'cleanjshipping@gmail.com',
          instructions: 'China Address - Use FirstName LastName / [MAILBOX#] format. Approx 2 Months sail time. Charges does not include duty.'
        }
      });
      console.log('✅ Created default warehouse:', warehouse.name);
    } else {
      console.log('ℹ️  Default warehouse already exists');
    }

    // Show current customers
    console.log('\n📋 Current Customers in Database:');
    const customers = await User.find({ role: 'customer' })
      .select('userCode firstName lastName email branch mailboxNumber createdAt')
      .sort({ createdAt: 1 });
    
    console.log(`Total customers: ${customers.length}`);
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.userCode}) - ${customer.email}`);
    });

    console.log('\n✅ Safe seed completed - no data was deleted');

  } catch (error) {
    console.error('❌ Error in safe seed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

safeSeed();
