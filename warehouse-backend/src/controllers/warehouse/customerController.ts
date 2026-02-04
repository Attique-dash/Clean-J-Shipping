import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { Package } from '../../models/Package';
import { successResponse, errorResponse, getPaginationData } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: any = { role: 'customer' };
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const customers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    successResponse(res, {
      customers,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting customers:', error);
    errorResponse(res, 'Failed to get customers');
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' })
      .select('-password');

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    successResponse(res, customer);
  } catch (error) {
    logger.error('Error getting customer:', error);
    errorResponse(res, 'Failed to get customer');
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerData = {
      ...req.body,
      role: 'customer'
    };

    const customer = await User.create(customerData);
    const customerResponse = customer.getPublicProfile();

    logger.info(`Customer created: ${customer.email}`);
    successResponse(res, customerResponse, 'Customer created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating customer:', error);
    if (error.code === 11000) {
      errorResponse(res, 'Email already exists', 409);
    } else {
      errorResponse(res, 'Failed to create customer');
    }
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    logger.info(`Customer updated: ${customer.email}`);
    successResponse(res, customer, 'Customer updated successfully');
  } catch (error) {
    logger.error('Error updating customer:', error);
    errorResponse(res, 'Failed to update customer');
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOneAndDelete({ _id: req.params.id, role: 'customer' });

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    logger.info(`Customer deleted: ${customer.email}`);
    successResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    logger.error('Error deleting customer:', error);
    errorResponse(res, 'Failed to delete customer');
  }
};

export const getCustomerByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOne({ 
      email: req.params.email, 
      role: 'customer' 
    }).select('-password');

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    successResponse(res, customer);
  } catch (error) {
    logger.error('Error getting customer by email:', error);
    errorResponse(res, 'Failed to get customer');
  }
};

export const getCustomerByPhone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOne({ 
      phone: req.params.phone, 
      role: 'customer' 
    }).select('-password');

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    successResponse(res, customer);
  } catch (error) {
    logger.error('Error getting customer by phone:', error);
    errorResponse(res, 'Failed to get customer');
  }
};

export const getCustomerPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const packages = await Package.find({
      $or: [
        { senderId: req.params.id },
        { recipientId: req.params.id }
      ]
    })
      .populate('senderId recipientId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments({
      $or: [
        { senderId: req.params.id },
        { recipientId: req.params.id }
      ]
    });

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting customer packages:', error);
    errorResponse(res, 'Failed to get customer packages');
  }
};
