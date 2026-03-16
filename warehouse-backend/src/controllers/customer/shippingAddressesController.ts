import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Warehouse } from '../../models/Warehouse';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

/**
 * Get warehouse shipping addresses for customer
 * Customers see Air, Sea, and China addresses to know where to send packages
 * 
 * GET /api/customer/shipping-addresses
 */
export const getShippingAddresses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get default warehouse or first active warehouse
    const warehouse = await Warehouse.findOne({ 
      isActive: true,
      $or: [
        { isDefault: true },
        { isDefault: { $exists: false } }
      ]
    }).sort({ isDefault: -1 });

    if (!warehouse) {
      errorResponse(res, 'No warehouse configuration found', 404);
      return;
    }

    const addresses = {
      air: warehouse.airAddress ? {
        type: 'air',
        name: warehouse.airAddress.name,
        street: warehouse.airAddress.street,
        city: warehouse.airAddress.city,
        state: warehouse.airAddress.state,
        zipCode: warehouse.airAddress.zipCode,
        country: warehouse.airAddress.country,
        phone: warehouse.airAddress.phone,
        email: warehouse.airAddress.email,
        instructions: warehouse.airAddress.instructions,
        fullAddress: `${warehouse.airAddress.name}\n${warehouse.airAddress.street}\n${warehouse.airAddress.city}, ${warehouse.airAddress.state} ${warehouse.airAddress.zipCode}\n${warehouse.airAddress.country}`,
        recipientLine: req.user ? `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}` : 'John Doe - CLEAN-0001'
      } : null,
      
      sea: warehouse.seaAddress ? {
        type: 'sea',
        name: warehouse.seaAddress.name,
        street: warehouse.seaAddress.street,
        city: warehouse.seaAddress.city,
        state: warehouse.seaAddress.state,
        zipCode: warehouse.seaAddress.zipCode,
        country: warehouse.seaAddress.country,
        phone: warehouse.seaAddress.phone,
        email: warehouse.seaAddress.email,
        instructions: warehouse.seaAddress.instructions,
        fullAddress: `${warehouse.seaAddress.name}\n${warehouse.seaAddress.street}\n${warehouse.seaAddress.city}, ${warehouse.seaAddress.state} ${warehouse.seaAddress.zipCode}\n${warehouse.seaAddress.country}`,
        recipientLine: req.user ? `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}` : 'John Doe - CLEAN-0001'
      } : null,
      
      china: warehouse.chinaAddress ? {
        type: 'china',
        name: warehouse.chinaAddress.name,
        street: warehouse.chinaAddress.street,
        city: warehouse.chinaAddress.city,
        state: warehouse.chinaAddress.state,
        zipCode: warehouse.chinaAddress.zipCode,
        country: warehouse.chinaAddress.country,
        phone: warehouse.chinaAddress.phone,
        email: warehouse.chinaAddress.email,
        instructions: warehouse.chinaAddress.instructions,
        fullAddress: `${warehouse.chinaAddress.name}\n${warehouse.chinaAddress.street}\n${warehouse.chinaAddress.city}, ${warehouse.chinaAddress.state} ${warehouse.chinaAddress.zipCode}\n${warehouse.chinaAddress.country}`,
        recipientLine: req.user ? `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}` : 'John Doe - CLEAN-0001'
      } : null
    };

    // Include customer's mailbox number and name
    const response = {
      mailboxNumber: req.user?.mailboxNumber || null,
      customerName: req.user ? `${req.user.firstName} ${req.user.lastName}` : null,
      companyName: 'Clean J Shipping',
      companyAbbreviation: warehouse.companyAbbreviation || 'CLEAN',
      addresses,
      instructions: {
        general: `Always include your mailbox number (${req.user?.mailboxNumber || 'N/A'}) when shipping items to ensure proper delivery.`,
        air: 'Use this address for air/express shipments. Include your mailbox number in the recipient field.',
        sea: 'Use this address for sea/ocean freight shipments. Include your mailbox number in the recipient field.',
        china: 'Use this address for shipments from China. Include your mailbox number in the recipient field.'
      },
      usageExample: {
        recipientName: req.user ? `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}` : 'John Doe - CLEAN-0001',
        address: addresses.air ? `${addresses.air.name}, ${addresses.air.street}, ${addresses.air.city}, ${addresses.air.state} ${addresses.air.zipCode}, ${addresses.air.country}` : 'Address not configured'
      }
    };

    successResponse(res, response, 'Shipping addresses retrieved successfully');

  } catch (error) {
    logger.error('Error getting shipping addresses:', error);
    errorResponse(res, 'Failed to get shipping addresses');
  }
};

/**
 * Get shipping address by type
 * 
 * GET /api/customer/shipping-addresses/:type (air|sea|china)
 */
export const getShippingAddressByType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    if (!['air', 'sea', 'china'].includes(type)) {
      errorResponse(res, 'Invalid address type. Must be: air, sea, or china', 400);
      return;
    }

    const warehouse = await Warehouse.findOne({ 
      isActive: true,
      $or: [
        { isDefault: true },
        { isDefault: { $exists: false } }
      ]
    }).sort({ isDefault: -1 });

    if (!warehouse) {
      errorResponse(res, 'No warehouse configuration found', 404);
      return;
    }

    let address = null;
    let instructions = '';

    switch (type) {
      case 'air':
        address = warehouse.airAddress;
        instructions = 'Use this address for air/express shipments. Include your mailbox number in the recipient field.';
        break;
      case 'sea':
        address = warehouse.seaAddress;
        instructions = 'Use this address for sea/ocean freight shipments. Include your mailbox number in the recipient field.';
        break;
      case 'china':
        address = warehouse.chinaAddress;
        instructions = 'Use this address for shipments from China. Include your mailbox number in the recipient field.';
        break;
    }

    if (!address) {
      errorResponse(res, `${type.toUpperCase()} shipping address not configured`, 404);
      return;
    }

    const response = {
      type,
      mailboxNumber: req.user?.mailboxNumber || null,
      companyName: 'Clean J Shipping',
      companyAbbreviation: warehouse.companyAbbreviation || 'CLEAN',
      address: {
        name: address.name,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        phone: address.phone,
        email: address.email,
        instructions: address.instructions,
        fullAddress: `${address.name}\n${address.street}\n${address.city}, ${address.state} ${address.zipCode}\n${address.country}`
      },
      usageInstructions: instructions
    };

    successResponse(res, response, `${type.toUpperCase()} shipping address retrieved successfully`);

  } catch (error) {
    logger.error('Error getting shipping address by type:', error);
    errorResponse(res, 'Failed to get shipping address');
  }
};

/**
 * Get customer's complete shipping info (for display on their dashboard)
 * Includes mailbox number and all warehouse addresses
 * 
 * GET /api/customer/my-shipping-info
 */
export const getMyShippingInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const warehouse = await Warehouse.findOne({ 
      isActive: true,
      $or: [
        { isDefault: true },
        { isDefault: { $exists: false } }
      ]
    }).sort({ isDefault: -1 });

    if (!warehouse) {
      errorResponse(res, 'No warehouse configuration found', 404);
      return;
    }

    const response = {
      customer: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        mailboxNumber: req.user.mailboxNumber,
        userCode: req.user.userCode
      },
      company: {
        name: 'Clean J Shipping',
        abbreviation: warehouse.companyAbbreviation || 'CLEAN'
      },
      shippingAddresses: {
        air: warehouse.airAddress ? {
          ...warehouse.airAddress,
          fullAddress: `${warehouse.airAddress.name}\n${warehouse.airAddress.street}\n${warehouse.airAddress.city}, ${warehouse.airAddress.state} ${warehouse.airAddress.zipCode}\n${warehouse.airAddress.country}`,
          recipientLine: `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}`
        } : null,
        sea: warehouse.seaAddress ? {
          ...warehouse.seaAddress,
          fullAddress: `${warehouse.seaAddress.name}\n${warehouse.seaAddress.street}\n${warehouse.seaAddress.city}, ${warehouse.seaAddress.state} ${warehouse.seaAddress.zipCode}\n${warehouse.seaAddress.country}`,
          recipientLine: `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}`
        } : null,
        china: warehouse.chinaAddress ? {
          ...warehouse.chinaAddress,
          fullAddress: `${warehouse.chinaAddress.name}\n${warehouse.chinaAddress.street}\n${warehouse.chinaAddress.city}, ${warehouse.chinaAddress.state} ${warehouse.chinaAddress.zipCode}\n${warehouse.chinaAddress.country}`,
          recipientLine: `${req.user.firstName} ${req.user.lastName} - ${req.user.mailboxNumber}`
        } : null
      },
      instructions: {
        general: 'When shopping online, use the address that matches your shipping method. Always include your mailbox number in the recipient name or address.',
        air: 'Best for: Small packages, express delivery, items from USA stores',
        sea: 'Best for: Large/heavy items, bulk orders, economical shipping',
        china: 'Best for: Items from Chinese marketplaces (AliExpress, Taobao, etc.)'
      }
    };

    successResponse(res, response, 'Shipping information retrieved successfully');

  } catch (error) {
    logger.error('Error getting customer shipping info:', error);
    errorResponse(res, 'Failed to get shipping information');
  }
};
