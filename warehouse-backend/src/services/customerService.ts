import { User, IUser } from '../models/User';
import { Package } from '../models/Package';
import { logger } from '../utils/logger';
import { generateMailboxCode } from '../utils/mailboxCodeGenerator';

export class CustomerService {
  static async createCustomer(customerData: Partial<IUser>): Promise<IUser> {
    try {
      // Generate mailbox code for new customers
      const mailboxNumber = await generateMailboxCode();
      
      const user = new User({
        ...customerData,
        role: 'customer',
        mailboxNumber
      });

      await user.save();
      logger.info(`Customer created: ${user.email} with mailbox number: ${mailboxNumber}`);
      return user.getPublicProfile();
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  }

  static async getCustomerById(customerId: string): Promise<IUser | null> {
    try {
      const customer = await User.findOne({ _id: customerId, role: 'customer' })
        .select('-password');
      return customer;
    } catch (error) {
      logger.error('Error getting customer:', error);
      throw error;
    }
  }

  static async getCustomerByEmail(email: string): Promise<IUser | null> {
    try {
      const customer = await User.findOne({ email, role: 'customer' })
        .select('-password');
      return customer;
    } catch (error) {
      logger.error('Error getting customer by email:', error);
      throw error;
    }
  }

  static async updateCustomer(customerId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      const customer = await User.findOneAndUpdate(
        { _id: customerId, role: 'customer' },
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (customer) {
        logger.info(`Customer updated: ${customer.email}`);
      }
      return customer;
    } catch (error) {
      logger.error('Error updating customer:', error);
      throw error;
    }
  }

  static async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const customer = await User.findOne({ _id: customerId, role: 'customer' });
      
      if (customer) {
        await User.deleteOne({ _id: customerId });
        logger.info(`Customer deleted: ${customer.email}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting customer:', error);
      throw error;
    }
  }

  static async getCustomers(page: number = 1, limit: number = 20, search?: string): Promise<{ customers: IUser[], total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const filter: any = { role: 'customer' };
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const customers = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(filter);

      return { customers, total };
    } catch (error) {
      logger.error('Error getting customers:', error);
      throw error;
    }
  }

  static async getCustomerPackageStats(customerId: string): Promise<any> {
    try {
      const [
        totalPackages,
        pendingPackages,
        inTransitPackages,
        deliveredPackages
      ] = await Promise.all([
        Package.countDocuments({
          $or: [
            { senderId: customerId },
            { recipientId: customerId }
          ]
        }),
        Package.countDocuments({
          $or: [
            { senderId: customerId },
            { recipientId: customerId }
          ],
          status: 'pending'
        }),
        Package.countDocuments({
          $or: [
            { senderId: customerId },
            { recipientId: customerId }
          ],
          status: 'in-transit'
        }),
        Package.countDocuments({
          $or: [
            { senderId: customerId },
            { recipientId: customerId }
          ],
          status: 'delivered'
        })
      ]);

      return {
        total: totalPackages,
        pending: pendingPackages,
        inTransit: inTransitPackages,
        delivered: deliveredPackages
      };
    } catch (error) {
      logger.error('Error getting customer package stats:', error);
      throw error;
    }
  }

  static async getActiveCustomers(startDate: Date, endDate: Date): Promise<IUser[]> {
    try {
      const customers = await User.find({
        role: 'customer',
        lastLogin: { $gte: startDate, $lte: endDate }
      })
        .select('-password')
        .sort({ lastLogin: -1 });

      return customers;
    } catch (error) {
      logger.error('Error getting active customers:', error);
      throw error;
    }
  }
}
