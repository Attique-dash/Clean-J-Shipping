import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

// This is a simplified implementation - in a real app, you'd have a separate ShippingAddress model

export const getShippingAddresses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id).select('shippingAddresses');
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const addresses = (user as any).shippingAddresses || [];
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const paginatedAddresses = addresses.slice(skip, skip + limit);

    successResponse(res, {
      addresses: paginatedAddresses,
      pagination: getPaginationData(page, limit, addresses.length)
    });
  } catch (error) {
    logger.error('Error getting shipping addresses:', error);
    errorResponse(res, 'Failed to get shipping addresses');
  }
};

export const getShippingAddressById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id).select('shippingAddresses');
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const addresses = (user as any).shippingAddresses || [];
    const address = addresses.find((addr: any) => addr._id.toString() === req.params.id);

    if (!address) {
      errorResponse(res, 'Shipping address not found', 404);
      return;
    }

    successResponse(res, address);
  } catch (error) {
    logger.error('Error getting shipping address:', error);
    errorResponse(res, 'Failed to get shipping address');
  }
};

export const createShippingAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { street, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const newAddress = {
      _id: new Date().getTime().toString(), // Simple ID generation
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false,
      createdAt: new Date()
    };

    const addresses = (user as any).shippingAddresses || [];

    // If this is set as default, unset other defaults
    if (newAddress.isDefault) {
      addresses.forEach((addr: any) => {
        addr.isDefault = false;
      });
    }

    addresses.push(newAddress);

    await User.findByIdAndUpdate(req.user._id, { shippingAddresses: addresses });

    logger.info(`Shipping address created for user: ${req.user._id}`);
    successResponse(res, newAddress, 'Shipping address created successfully', 201);
  } catch (error) {
    logger.error('Error creating shipping address:', error);
    errorResponse(res, 'Failed to create shipping address');
  }
};

export const updateShippingAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const addresses = (user as any).shippingAddresses || [];
    const addressIndex = addresses.findIndex((addr: any) => addr._id.toString() === req.params.id);

    if (addressIndex === -1) {
      errorResponse(res, 'Shipping address not found', 404);
      return;
    }

    // Update address
    const updatedAddress = { ...addresses[addressIndex], ...req.body };

    // If this is set as default, unset other defaults
    if (updatedAddress.isDefault) {
      addresses.forEach((addr: any) => {
        addr.isDefault = false;
      });
    }

    addresses[addressIndex] = updatedAddress;

    await User.findByIdAndUpdate(req.user._id, { shippingAddresses: addresses });

    logger.info(`Shipping address updated for user: ${req.user._id}`);
    successResponse(res, updatedAddress, 'Shipping address updated successfully');
  } catch (error) {
    logger.error('Error updating shipping address:', error);
    errorResponse(res, 'Failed to update shipping address');
  }
};

export const deleteShippingAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const addresses = (user as any).shippingAddresses || [];
    const addressIndex = addresses.findIndex((addr: any) => addr._id.toString() === req.params.id);

    if (addressIndex === -1) {
      errorResponse(res, 'Shipping address not found', 404);
      return;
    }

    addresses.splice(addressIndex, 1);

    await User.findByIdAndUpdate(req.user._id, { shippingAddresses: addresses });

    logger.info(`Shipping address deleted for user: ${req.user._id}`);
    successResponse(res, null, 'Shipping address deleted successfully');
  } catch (error) {
    logger.error('Error deleting shipping address:', error);
    errorResponse(res, 'Failed to delete shipping address');
  }
};

export const setDefaultAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const addresses = (user as any).shippingAddresses || [];
    const addressIndex = addresses.findIndex((addr: any) => addr._id.toString() === req.params.id);

    if (addressIndex === -1) {
      errorResponse(res, 'Shipping address not found', 404);
      return;
    }

    // Unset all defaults and set the new default
    addresses.forEach((addr: any) => {
      addr.isDefault = false;
    });
    addresses[addressIndex].isDefault = true;

    await User.findByIdAndUpdate(req.user._id, { shippingAddresses: addresses });

    logger.info(`Default shipping address set for user: ${req.user._id}`);
    successResponse(res, addresses[addressIndex], 'Default shipping address set successfully');
  } catch (error) {
    logger.error('Error setting default shipping address:', error);
    errorResponse(res, 'Failed to set default shipping address');
  }
};
