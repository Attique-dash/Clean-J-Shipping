import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/models/User';

const checkUsers = async () => {
  try {
    await connectDatabase();
    
    console.log('=== DETAILED USER CHECK ===\n');
    
    // Count all users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Count by role
    const adminCount = await User.countDocuments({ role: 'admin' });
    const warehouseCount = await User.countDocuments({ role: 'warehouse' });
    const customerCount = await User.countDocuments({ role: 'customer' });
    
    console.log(`Admin users: ${adminCount}`);
    console.log(`Warehouse users: ${warehouseCount}`);
    console.log(`Customer users: ${customerCount}`);
    
    // Show all user emails
    const allUsers = await User.find({}, { email: 1, role: 1, firstName: 1, lastName: 1 });
    console.log('\nAll users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await disconnectDatabase();
  }
};

checkUsers();
