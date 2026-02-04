import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { Package } from '../../models/Package';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface CustomerRequest extends AuthRequest {
  query: {
    q?: string;
    userCode?: string;
  };
  body: {
    user_code?: string;
  };
}

// Get All Customers (API SPEC)
export const getCustomers = async (req: CustomerRequest, res: Response): Promise<void> => {
  try {
    const filter: any = { role: 'customer' };

    // Search by name, email, or userCode
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { userCode: searchRegex }
      ];
    }

    // Filter by exact userCode
    if (req.query.userCode) {
      filter.userCode = req.query.userCode.toUpperCase();
    }

    const customers = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    // Transform customers to match API response format
    const transformedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const activePackages = await Package.countDocuments({
          userId: customer._id,
          status: { $nin: ['delivered', 'returned'] }
        });

        return {
          user_code: customer.userCode,
          full_name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone || '',
          address_line: customer.address ? 
            `${customer.address.street}, ${customer.address.city}, ${customer.address.state}` : '',
          active_packages: activePackages
        };
      })
    );

    successResponse(res, {
      customers: transformedCustomers
    });
  } catch (error) {
    logger.error('Error getting customers:', error);
    errorResponse(res, 'Failed to get customers');
  }
};

// Get Customer Details by userCode (API SPEC)
export const getCustomerByUserCode = async (req: CustomerRequest, res: Response): Promise<void> => {
  try {
    const customer = await User.findOne({ 
      userCode: req.params.userCode.toUpperCase(), 
      role: 'customer' 
    }).select('-passwordHash');

    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    successResponse(res, {
      customer: {
        userCode: customer.userCode,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || {},
        mailboxNumber: customer.mailboxNumber || '',
        accountStatus: customer.accountStatus,
        emailVerified: customer.emailVerified,
        createdAt: customer.createdAt
      }
    });
  } catch (error) {
    logger.error('Error getting customer:', error);
    errorResponse(res, 'Failed to get customer');
  }
};

// Delete Customer (API SPEC)
export const deleteCustomer = async (req: CustomerRequest, res: Response): Promise<void> => {
  try {
    const { user_code } = req.body;

    if (!user_code) {
      errorResponse(res, 'user_code is required', 400);
      return;
    }

    const deletedCustomer = await User.findOneAndDelete({ 
      userCode: user_code.toUpperCase(), 
      role: 'customer' 
    });

    if (!deletedCustomer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    successResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    logger.error('Error deleting customer:', error);
    errorResponse(res, 'Failed to delete customer');
  }
};
