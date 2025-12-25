import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

// Export the function so it can be called
export { fixExistingPasswords };

async function fixExistingPasswords() {
  console.log('🔧 Fixing existing user passwords...\n');

  try {
    await dbConnect();

    // Update all users with plain passwords to hashed ones
    const users = await User.find({});
    
    for (const user of users) {
      // If password looks unhashed (less than 60 chars), rehash it
      if (user.passwordHash && user.passwordHash.length < 60) {
        console.log(`Fixing password for: ${user.email}`);
        const newHash = await hashPassword(user.passwordHash);
        user.passwordHash = newHash;
        await user.save();
        console.log(`✅ Fixed: ${user.email}`);
      }
    }

    console.log('\n✨ All passwords fixed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}
