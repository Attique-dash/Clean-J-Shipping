import { User } from '../models/User';
import { Warehouse } from '../models/Warehouse';
import { logger } from '../utils/logger';

interface FormattedShippingAddress {
  _id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type?: 'air' | 'sea' | 'china' | 'standard';
  isDefault?: boolean;
  createdAt?: Date;
  fullName?: string;
  mailboxCode?: string;
  addressLine2?: string;
  displayName?: string;
}

export class ShippingAddressService {
  static async createDefaultShippingAddresses(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get default warehouse
      const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
      if (!warehouse) {
        logger.warn('No default warehouse found, skipping default shipping addresses creation');
        return;
      }

      const mailboxCode = user.mailboxNumber || user.userCode;
      const fullName = `${user.firstName} ${user.lastName}`;

      // Check if user already has shipping addresses
      if (user.shippingAddresses && user.shippingAddresses.length > 0) {
        logger.info(`User ${user.email} already has shipping addresses, skipping creation`);
        return;
      }

      // Create default shipping addresses
      const defaultAddresses = [];

      // Air Address
      if (warehouse.airAddress) {
        defaultAddresses.push({
          street: warehouse.airAddress.street,
          city: warehouse.airAddress.city,
          state: warehouse.airAddress.state,
          zipCode: warehouse.airAddress.zipCode,
          country: warehouse.airAddress.country,
          type: 'air',
          isDefault: true,
          createdAt: new Date()
        });
      }

      // Sea Address  
      if (warehouse.seaAddress) {
        defaultAddresses.push({
          street: warehouse.seaAddress.street,
          city: warehouse.seaAddress.city,
          state: warehouse.seaAddress.state,
          zipCode: warehouse.seaAddress.zipCode,
          country: warehouse.seaAddress.country,
          type: 'sea',
          isDefault: false,
          createdAt: new Date()
        });
      }

      // China Address
      if (warehouse.chinaAddress) {
        defaultAddresses.push({
          street: warehouse.chinaAddress.street,
          city: warehouse.chinaAddress.city,
          state: warehouse.chinaAddress.state,
          zipCode: warehouse.chinaAddress.zipCode,
          country: warehouse.chinaAddress.country,
          type: 'china',
          isDefault: false,
          createdAt: new Date()
        });
      }

      if (defaultAddresses.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $push: { shippingAddresses: { $each: defaultAddresses } }
        });
        
        logger.info(`Created ${defaultAddresses.length} default shipping addresses for user: ${user.email}`);
      }
    } catch (error) {
      logger.error('Error creating default shipping addresses:', error);
      throw error;
    }
  }

  static async getShippingAddresses(userId: string): Promise<any[]> {
    try {
      const user = await User.findById(userId)
        .select('shippingAddresses mailboxNumber userCode firstName lastName')
        .populate('shippingAddresses');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get warehouse info for formatting addresses with mailbox numbers
      const warehouse = await Warehouse.findOne({ isActive: true, isDefault: true });
      
      const mailboxCode = user.mailboxNumber || user.userCode;
      const fullName = `${user.firstName} ${user.lastName}`;

      // Format shipping addresses with mailbox information
      const formattedAddresses: FormattedShippingAddress[] = user.shippingAddresses?.map(addr => {
        let formattedAddr: FormattedShippingAddress = {
          _id: addr._id,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country,
          type: addr.type,
          isDefault: addr.isDefault,
          createdAt: addr.createdAt
        };
        
        // Add mailbox information to address
        formattedAddr.fullName = fullName;
        formattedAddr.mailboxCode = mailboxCode;
        
        // Format address line 2 with mailbox code based on type
        if (addr.type === 'air') {
          formattedAddr.addressLine2 = `KCDE-${mailboxCode}`;
        } else if (addr.type === 'sea') {
          formattedAddr.addressLine2 = `KCDX-${mailboxCode}`;
        } else if (addr.type === 'china') {
          formattedAddr.addressLine2 = mailboxCode;
        } else {
          formattedAddr.addressLine2 = mailboxCode;
        }
        
        // Create formatted name with mailbox
        formattedAddr.displayName = `${fullName} ${mailboxCode}`;
        
        return formattedAddr;
      }) || [];

      return formattedAddresses;
    } catch (error) {
      logger.error('Error getting shipping addresses:', error);
      throw error;
    }
  }

  static async addShippingAddress(userId: string, addressData: any): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If this is set as default, unset other defaults
      if (addressData.isDefault) {
        await User.findByIdAndUpdate(userId, {
          $set: { 'shippingAddresses.$[elem].isDefault': false }
        }, {
          arrayFilters: [{ 'elem.isDefault': true }]
        });
      }

      const newAddress = {
        ...addressData,
        createdAt: new Date()
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $push: { shippingAddresses: newAddress } },
        { new: true }
      ).select('shippingAddresses');

      logger.info(`Added new shipping address for user: ${user.email}`);
      return updatedUser?.shippingAddresses?.[updatedUser.shippingAddresses.length - 1];
    } catch (error) {
      logger.error('Error adding shipping address:', error);
      throw error;
    }
  }

  static async updateShippingAddress(userId: string, addressId: string, updateData: any): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If this is set as default, unset other defaults
      if (updateData.isDefault) {
        await User.findByIdAndUpdate(userId, {
          $set: { 'shippingAddresses.$[elem].isDefault': false }
        }, {
          arrayFilters: [{ 'elem.isDefault': true }]
        });
      }

      const updatedUser = await User.findOneAndUpdate(
        { 
          _id: userId,
          'shippingAddresses._id': addressId
        },
        { 
          $set: { 'shippingAddresses.$': updateData }
        },
        { new: true }
      ).select('shippingAddresses');

      if (!updatedUser) {
        throw new Error('Shipping address not found');
      }

      logger.info(`Updated shipping address for user: ${user.email}`);
      return updatedUser.shippingAddresses?.find(addr => addr._id?.toString() === addressId);
    } catch (error) {
      logger.error('Error updating shipping address:', error);
      throw error;
    }
  }

  static async deleteShippingAddress(userId: string, addressId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { shippingAddresses: { _id: addressId } } },
        { new: true }
      );

      if (!updatedUser) {
        throw new Error('Failed to delete shipping address');
      }

      logger.info(`Deleted shipping address for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Error deleting shipping address:', error);
      throw error;
    }
  }
}
