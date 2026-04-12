import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User, IUser } from '../models/User';
import { Package } from '../models/Package';
import { Inventory } from '../models/Inventory';
import { Warehouse } from '../models/Warehouse';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../utils/helpers';
import { PAGINATION } from '../utils/constants';
import { logger } from '../utils/logger';

interface AdminRequest extends AuthRequest {
  query: {
    page?: string;
    limit?: string;
    role?: string;
    status?: string;
    q?: string;
    category?: string;
    isActive?: string;
    type?: string;
  };
  params: {
    userId?: string;
    userCode?: string;
    type?: string;
    id?: string;
  };
  body: {
    // Tasoko API fields
    PackageID?: string;
    CourierID?: string;
    TrackingNumber?: string;
    ControlNumber?: string;
    FirstName?: string;
    LastName?: string;
    UserCode?: string;
    Weight?: number;
    Shipper?: string;
    EntryStaff?: string;
    EntryDate?: string;
    EntryDateTime?: string;
    Branch?: string;
    Claimed?: boolean;
    APIToken?: string;
    ShowControls?: boolean;
    ManifestCode?: string;
    CollectionCode?: string;
    Description?: string;
    HSCode?: string;
    Unknown?: boolean;
    AIProcessed?: boolean;
    OriginalHouseNumber?: string;
    Cubes?: number;
    Length?: number;
    Width?: number;
    Height?: number;
    Pieces?: number;
    Discrepancy?: boolean;
    DiscrepancyDescription?: string;
    ServiceTypeID?: string;
    HazmatCodeID?: string;
    Coloaded?: boolean;
    ColoadIndicator?: string;
    
    // Legacy fields for backward compatibility
    trackingNumber?: string;
    userCode?: string;
    weight?: number;
    shipper?: string;
    description?: string;
    itemDescription?: string;
    serviceMode?: string;
    status?: string;
    dimensions?: any;
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderAddress?: string;
    senderCountry?: string;
    recipient?: any;
    itemValue?: number;
    specialInstructions?: string;
    isFragile?: boolean;
    isHazardous?: boolean;
    requiresSignature?: boolean;
    customsRequired?: boolean;
    customsStatus?: string;
    entryDate?: string;
    userId?: string;
    
    // User management fields
    address?: any;
    role?: string;
    accountStatus?: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
    assignedWarehouse?: string;
    permissions?: string[];
    name?: string;
    warehouseId?: string;
    
    // Warehouse management fields
    code?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    isActive?: boolean;
    isDefault?: boolean;
    airAddress?: {
      name?: string;
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      phone?: string;
      email?: string;
      instructions?: string;
    };
    seaAddress?: {
      name?: string;
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      phone?: string;
      email?: string;
      instructions?: string;
    };
    chinaAddress?: {
      name?: string;
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      phone?: string;
      email?: string;
      instructions?: string;
    };
  };
}

// Get all users (customers + staff)
export const getAllUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    // Filter by role if specified
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Search functionality
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { userCode: searchRegex }
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    successResponse(res, {
      users,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    errorResponse(res, 'Failed to get users');
  }
};

// Get all customers specifically
export const getAllCustomers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = { role: 'customer' };
    
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { userCode: searchRegex }
      ];
    }

    const customers = await User.find(filter)
      .select('-passwordHash')
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

// Get all staff (warehouse) specifically
export const getAllStaff = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = { role: 'warehouse' };
    
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { userCode: searchRegex }
      ];
    }

    const staff = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    successResponse(res, {
      staff,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting staff:', error);
    errorResponse(res, 'Failed to get staff');
  }
};

// Get all packages with admin access
export const getAllPackages = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { trackingNumber: searchRegex },
        { description: searchRegex },
        { shipper: searchRegex },
        { 'recipient.name': searchRegex },
        { 'recipient.email': searchRegex }
      ];
    }

    const packages = await Package.find(filter)
      .populate('userId', 'firstName lastName email phone mailboxNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments(filter);

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting packages:', error);
    errorResponse(res, 'Failed to get packages');
  }
};

// Get all inventory with admin access
export const getAllInventory = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex }
      ];
    }

    const inventory = await Inventory.find(filter)
      .populate('location.warehouse', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(filter);

    successResponse(res, {
      inventory,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting inventory:', error);
    errorResponse(res, 'Failed to get inventory');
  }
};


// Get system statistics
export const getSystemStats = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalStaff,
      totalPackages,
      totalInventory,
      pendingPackages,
      deliveredPackages,
      lowStockItems
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'warehouse' }),
      Package.countDocuments(),
      Inventory.countDocuments(),
      Package.countDocuments({ status: 'pending' }),
      Package.countDocuments({ status: 'delivered' }),
      Inventory.countDocuments({
        $expr: { $lte: ['$quantity', '$minStockLevel'] },
        isActive: true
      })
    ]);

    successResponse(res, {
      stats: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          staff: totalStaff
        },
        packages: {
          total: totalPackages,
          pending: pendingPackages,
          delivered: deliveredPackages
        },
        inventory: {
          total: totalInventory,
          lowStock: lowStockItems
        }
      }
    });
  } catch (error) {
    logger.error('Error getting system stats:', error);
    errorResponse(res, 'Failed to get system statistics');
  }
};

// Change user role (admin only)
export const changeUserRole = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userCode } = req.params;
    const { role } = req.body;

    if (!userCode || !role) {
      errorResponse(res, 'User code and role are required', 400);
      return;
    }

    const validRoles = ['admin', 'customer', 'warehouse'];
    if (!validRoles.includes(role)) {
      errorResponse(res, `Invalid role. Valid roles: ${validRoles.join(', ')}`, 400);
      return;
    }

    const user = await User.findOneAndUpdate(
      { userCode },
      { role },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    logger.info(`User role changed: ${user.email} -> ${role}`);
    successResponse(res, {
      user,
      message: `User role changed to ${role} successfully`
    });
  } catch (error) {
    logger.error('Error changing user role:', error);
    errorResponse(res, 'Failed to change user role');
  }
};

// Update user account status
export const updateUserStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userCode } = req.params;
    const { accountStatus, emailVerified } = req.body;

    if (!userCode) {
      errorResponse(res, 'User code is required', 400);
      return;
    }

    const updateData: any = {};
    if (accountStatus) {
      const validStatuses = ['pending', 'active', 'inactive'];
      if (!validStatuses.includes(accountStatus)) {
        errorResponse(res, `Invalid account status. Valid statuses: ${validStatuses.join(', ')}`, 400);
        return;
      }
      updateData.accountStatus = accountStatus;
    }
    
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified;
    }

    const user = await User.findOneAndUpdate(
      { userCode },
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    logger.info(`User status updated: ${user.email}`);
    successResponse(res, {
      user,
      message: 'User status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user status:', error);
    errorResponse(res, 'Failed to update user status');
  }
};

// Add warehouse staff
export const addWarehouseStaff = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      assignedWarehouse,
      permissions
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      errorResponse(res, 'First name, last name, email, and password are required', 400);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errorResponse(res, 'User with this email already exists', 409);
      return;
    }

    // Generate unique user code
    const { generateMailboxCode } = await import('../utils/mailboxCodeGenerator');
    const userCode = await generateMailboxCode();

    // Create new warehouse staff
    const newStaff = new User({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: 'warehouse',
      userCode,
      mailboxNumber: userCode,
      accountStatus: 'active',
      emailVerified: true,
      assignedWarehouse: assignedWarehouse || null,
      permissions: permissions || [],
      createdBy: req.user?.id
    });

    await newStaff.save();

    logger.info(`New warehouse staff created: ${newStaff.email}`);
    successResponse(res, {
      staff: {
        id: newStaff._id,
        userCode: newStaff.userCode,
        firstName: newStaff.firstName,
        lastName: newStaff.lastName,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        accountStatus: newStaff.accountStatus,
        emailVerified: newStaff.emailVerified,
        assignedWarehouse: newStaff.assignedWarehouse,
        permissions: newStaff.permissions,
        createdAt: newStaff.createdAt
      },
      message: 'Warehouse staff created successfully'
    }, 'Warehouse staff created successfully', 201);
  } catch (error) {
    logger.error('Error creating warehouse staff:', error);
    errorResponse(res, 'Failed to create warehouse staff');
  }
};

// Get all shipping addresses
export const getAllShippingAddresses = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;
    const { type } = req.query;

    const filter: any = { 'shippingAddresses.0': { $exists: true } };
    
    // Filter by address type if specified
    if (type) {
      filter['shippingAddresses.type'] = type;
    }

    const users = await User.find(filter)
      .select('firstName lastName email shippingAddresses')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Flatten all shipping addresses
    const allAddresses: any[] = [];
    users.forEach(user => {
      if (user.shippingAddresses && user.shippingAddresses.length > 0) {
        user.shippingAddresses.forEach((address: any) => {
          allAddresses.push({
            ...address.toObject(),
            user: {
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            }
          });
        });
      }
    });

    // Filter by type again if needed (for more precise filtering)
    const filteredAddresses = type 
      ? allAddresses.filter(addr => addr.type === type)
      : allAddresses;

    // Apply pagination to the flattened addresses
    const paginatedAddresses = filteredAddresses.slice(skip, skip + limit);
    const total = filteredAddresses.length;

    // Create default addresses template
    const defaultAddresses = [
      {
        _id: 'default-air',
        type: 'air',
        street: '700 NW 57 Place',
        city: 'Ft. Lauderdale',
        state: 'FL',
        zipCode: '33309',
        country: 'USA',
        isDefault: true,
        displayName: '✈️ Standard Air Address (USA)',
        formattedAddress: {
          name: 'First and Last Name',
          address: '700 NW 57 Place\nAIR-[MAILBOX#]\nFt. Lauderdale, Florida 33309\nUnited States'
        }
      },
      {
        _id: 'default-sea',
        type: 'sea',
        street: '700 NW 57 Place',
        city: 'Ft. Lauderdale',
        state: 'FL',
        zipCode: '33309',
        country: 'USA',
        isDefault: true,
        displayName: '🚢 Standard Sea Address (USA)',
        formattedAddress: {
          name: 'First and Last Name',
          address: '700 NW 57 Place\nSEA-[MAILBOX#]\nFt. Lauderdale, Florida 33309\nUnited States'
        }
      },
      {
        _id: 'default-china',
        type: 'china',
        street: 'Baoshan No.2 Industrial Zone',
        city: 'Shenzhen',
        state: 'Guangdong Province',
        zipCode: '',
        country: 'China',
        isDefault: true,
        displayName: '🇨🇳 China Address',
        formattedAddress: {
          name: 'FirstName LastName / [MAILBOX#]',
          address: 'China\nGuangdong Province, Shenzhen\nBaoshan No.2 Industrial Zone'
        }
      }
    ];

    // If no specific type is requested, include default addresses
    const responseAddresses = type 
      ? paginatedAddresses 
      : [...defaultAddresses, ...paginatedAddresses];

    successResponse(res, {
      shippingAddresses: responseAddresses,
      pagination: getPaginationData(page, limit, type ? total : total + defaultAddresses.length),
      filters: {
        type
      },
      defaultAddresses: type ? null : defaultAddresses
    });
  } catch (error) {
    logger.error('Error getting all shipping addresses:', error);
    errorResponse(res, 'Failed to get shipping addresses');
  }
};

// Delete user (admin only)
export const deleteUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userCode } = req.params;

    if (!userCode) {
      errorResponse(res, 'User code is required', 400);
      return;
    }

    const user = await User.findOneAndDelete({ userCode }) as unknown as IUser | null;

    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    logger.info(`User deleted: ${user.email} (${user.userCode})`);
    successResponse(res, {
      user: {
        id: user._id,
        userCode: user.userCode,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    errorResponse(res, 'Failed to delete user');
  }
};

// Update shipping address by type
export const updateShippingAddressByType = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { address } = req.body;

    if (!type || !address) {
      errorResponse(res, 'Address type and address data are required', 400);
      return;
    }

    const validTypes = ['air', 'sea', 'china', 'standard'];
    if (!validTypes.includes(type)) {
      errorResponse(res, `Invalid address type. Valid types: ${validTypes.join(', ')}`, 400);
      return;
    }

    // Find all users who have this address type
    const users = await User.find({ 'shippingAddresses.type': type });

    // If no users have this address type, just update the default template addresses
    if (users.length === 0) {
      logger.info(`No users found with ${type} address type. Address template updated for future use.`);
      successResponse(res, {
        message: `${type} shipping address template updated successfully. No existing users with this address type found.`,
        updatedCount: 0
      });
      return;
    }

    // Update the address for all users who have this type
    const updatePromises = users.map(async (user) => {
      await User.updateOne(
        { 
          _id: user._id,
          'shippingAddresses.type': type 
        },
        { 
          $set: { 
            'shippingAddresses.$.street': address.street,
            'shippingAddresses.$.city': address.city,
            'shippingAddresses.$.state': address.state,
            'shippingAddresses.$.zipCode': address.zipCode,
            'shippingAddresses.$.country': address.country || 'USA'
          }
        }
      );
    });

    await Promise.all(updatePromises);

    logger.info(`Updated ${type} shipping addresses for ${users.length} users`);
    successResponse(res, {
      message: `${type} shipping addresses updated successfully for ${users.length} users`,
      updatedCount: users.length
    });
  } catch (error) {
    logger.error('Error updating shipping address by type:', error);
    errorResponse(res, 'Failed to update shipping addresses');
  }
};

// Get customer by ID
export const getCustomerById = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const customer = await User.findOne({ _id: id, role: 'customer' });
    
    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    logger.info(`Admin retrieved customer: ${customer._id}`);
    successResponse(res, {
      message: 'Customer retrieved successfully',
      data: customer
    });
  } catch (error) {
    logger.error('Error getting customer by ID:', error);
    errorResponse(res, 'Failed to retrieve customer');
  }
};

// Update customer
export const updateCustomer = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow role change through this endpoint
    delete updates.role;
    
    const customer = await User.findOne({ _id: id, role: 'customer' });
    
    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    // Update customer
    const updatedCustomer = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info(`Admin updated customer: ${updatedCustomer?._id}`);
    successResponse(res, {
      message: 'Customer updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    logger.error('Error updating customer:', error);
    errorResponse(res, 'Failed to update customer');
  }
};

// Delete customer
export const deleteCustomer = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const customer = await User.findOne({ _id: id, role: 'customer' });
    
    if (!customer) {
      errorResponse(res, 'Customer not found', 404);
      return;
    }

    // Check if customer has packages
    const packageCount = await Package.countDocuments({ customerId: id });
    
    if (packageCount > 0) {
      errorResponse(res, `Cannot delete customer. Customer has ${packageCount} associated packages. Please delete or reassign packages first.`, 400);
      return;
    }

    // Delete customer
    await User.findByIdAndDelete(id);

    logger.info(`Admin deleted customer: ${id}`);
    successResponse(res, {
      message: 'Customer deleted successfully',
      data: {
        id,
        deleted: true
      }
    });
  } catch (error) {
    logger.error('Error deleting customer:', error);
    errorResponse(res, 'Failed to delete customer');
  }
};

// Get package by ID
export const getPackageById = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const packageItem = await Package.findById(id).populate('customerId', 'firstName lastName email userCode');
    
    if (!packageItem) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    logger.info(`Admin retrieved package: ${packageItem._id}`);
    successResponse(res, {
      message: 'Package retrieved successfully',
      data: packageItem
    });
  } catch (error) {
    logger.error('Error getting package by ID:', error);
    errorResponse(res, 'Failed to retrieve package');
  }
};

// Update package
export const updatePackage = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const packageItem = await Package.findById(id);
    
    if (!packageItem) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('customerId', 'firstName lastName email userCode');

    logger.info(`Admin updated package: ${updatedPackage?._id}`);
    successResponse(res, {
      message: 'Package updated successfully',
      data: updatedPackage
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    errorResponse(res, 'Failed to update package');
  }
};

// Delete package
export const deletePackage = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const packageItem = await Package.findById(id);
    
    if (!packageItem) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // Check if package is in a state that allows deletion
    if (packageItem.status === 'in_transit' || packageItem.status === 'out_for_delivery') {
      errorResponse(res, 'Cannot delete package that is currently in transit or out for delivery', 400);
      return;
    }

    // Delete package
    await Package.findByIdAndDelete(id);

    logger.info(`Admin deleted package: ${id}`);
    successResponse(res, {
      message: 'Package deleted successfully',
      data: {
        id,
        deleted: true
      }
    });
  } catch (error) {
    logger.error('Error deleting package:', error);
    errorResponse(res, 'Failed to delete package');
  }
};

// Add package (admin only) - same as KCD add package
export const addPackage = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const {
      // Tasoko API fields (same as KCD)
      PackageID,
      CourierID,
      TrackingNumber,
      ControlNumber,
      FirstName,
      LastName,
      UserCode,
      Weight,
      Shipper,
      EntryStaff,
      EntryDate,
      EntryDateTime,
      Branch,
      Claimed,
      APIToken,
      ShowControls,
      ManifestCode,
      CollectionCode,
      Description,
      HSCode,
      Unknown,
      AIProcessed,
      OriginalHouseNumber,
      Cubes,
      Length,
      Width,
      Height,
      Pieces,
      Discrepancy,
      DiscrepancyDescription,
      ServiceTypeID,
      HazmatCodeID,
      Coloaded,
      ColoadIndicator,
      
      // Legacy fields for backward compatibility
      trackingNumber,
      userCode,
      weight,
      shipper,
      description,
      itemDescription,
      serviceMode = 'local',
      status = 'received',
      dimensions,
      senderName,
      senderEmail,
      senderPhone,
      senderAddress,
      senderCountry,
      recipient,
      itemValue,
      specialInstructions,
      isFragile,
      isHazardous,
      requiresSignature,
      customsRequired,
      customsStatus,
      entryDate,
      userId
    } = req.body;

    // Find customer by UserCode (support both UserCode and userCode)
    const customerCode = UserCode || userCode;
    if (!customerCode) {
      errorResponse(res, 'UserCode is required', 400);
      return;
    }

    const customer = await User.findOne({ 
      userCode: customerCode.toUpperCase(), 
      role: 'customer' 
    });

    if (!customer) {
      errorResponse(res, 'Customer not found with provided UserCode', 404);
      return;
    }

    // Generate tracking number if not provided
    const finalTrackingNumber = TrackingNumber || trackingNumber || (() => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generated = `TRK${timestamp}${random}`;
      return generated.substring(0, 20).toUpperCase();
    })();

    // Check if tracking number already exists
    const existingPackage = await Package.findOne({ trackingNumber: finalTrackingNumber });
    if (existingPackage) {
      errorResponse(res, 'Package with this tracking number already exists', 409);
      return;
    }

    // Create package with complete admin fields (same as KCD)
    const packageData: any = {
      // Tasoko API fields
      PackageID,
      CourierID,
      TrackingNumber: finalTrackingNumber,
      ControlNumber: ControlNumber || `EP${Math.random().toString().slice(2, 10)}`,
      FirstName,
      LastName,
      UserCode: customerCode,
      Weight: Weight || 0,
      Shipper: Shipper || 'Amazon',
      EntryStaff: EntryStaff || '',
      EntryDate: EntryDate ? new Date(EntryDate) : new Date(),
      EntryDateTime: EntryDateTime || new Date(),
      Branch: Branch || customer.branch || 'Down Town',
      Claimed: Claimed || false,
      APIToken: APIToken || 'ADMIN',
      ShowControls: ShowControls || false,
      ManifestCode: ManifestCode || '',
      CollectionCode: CollectionCode || '',
      Description: Description || '',
      HSCode: HSCode || '',
      Unknown: Unknown || false,
      AIProcessed: AIProcessed || false,
      OriginalHouseNumber: OriginalHouseNumber || '',
      Cubes: Cubes || 0,
      Length: Length || 0,
      Width: Width || 0,
      Height: Height || 0,
      Pieces: Pieces || 1,
      Discrepancy: Discrepancy || false,
      DiscrepancyDescription: DiscrepancyDescription || '',
      ServiceTypeID: ServiceTypeID || '',
      HazmatCodeID: HazmatCodeID || '',
      Coloaded: Coloaded || false,
      ColoadIndicator: ColoadIndicator || '',
      
      // Legacy fields
      trackingNumber: finalTrackingNumber,
      userCode: customerCode,
      userId: userId || customer._id,
      weight: Weight || 0,
      shipper: Shipper || 'Amazon',
      description: Description || '',
      itemDescription: itemDescription || '',
      serviceMode: serviceMode || 'local',
      status: status || 'received',
      dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
      senderName: senderName || Shipper || 'Amazon',
      senderEmail: senderEmail || '',
      senderPhone: senderPhone || '',
      senderAddress: senderAddress || '',
      senderCountry: senderCountry || '',
      recipient: recipient || {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || '',
        shippingId: customer.userCode,
        address: customer.address?.street || ''
      },
      totalAmount: itemValue || 0,
      specialInstructions: specialInstructions || '',
      isFragile: isFragile || false,
      isHazardous: isHazardous || false,
      requiresSignature: requiresSignature || false,
      customsRequired: customsRequired || false,
      customsStatus: customsStatus || 'not_required',
      dateReceived: entryDate ? new Date(entryDate) : new Date(),
      source: 'web',
      courierCode: 'ADMIN',
      branch: customer.branch || 'Down Town',
      processedAt: new Date()
    };

    const newPackage = await Package.create(packageData);
    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');

    // Add to tracking history
    const historyEntry = {
      timestamp: new Date(),
      status: status || 'received',
      location: 'Warehouse',
      description: `Package received by admin`
    };
    
    newPackage.trackingHistory = newPackage.trackingHistory || [];
    newPackage.trackingHistory.push(historyEntry);
    await newPackage.save();

    logger.info(`Admin added package: ${newPackage.trackingNumber}`);

    successResponse(res, {
      message: 'Package added successfully',
      data: {
        package: {
          // Return both legacy and Tasoko fields
          trackingNumber: newPackage.trackingNumber,
          userCode: newPackage.userCode,
          PackageID: newPackage.PackageID || newPackage._id.toString(),
          CourierID: newPackage.CourierID || newPackage._id.toString(),
          TrackingNumber: newPackage.TrackingNumber,
          ControlNumber: newPackage.ControlNumber,
          UserCode: newPackage.UserCode,
          Weight: newPackage.Weight,
          Shipper: newPackage.Shipper,
          EntryDate: newPackage.EntryDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          EntryDateTime: newPackage.EntryDateTime || newPackage.dateReceived?.toISOString() || new Date().toISOString(),
          Branch: newPackage.Branch,
          Status: newPackage.status,
          Description: newPackage.Description,
          Length: newPackage.Length,
          Width: newPackage.Width,
          Height: newPackage.Height,
          Pieces: newPackage.Pieces,
          Cubes: newPackage.Cubes,
          customer: newPackage.userId,
          createdAt: newPackage.createdAt,
          updatedAt: newPackage.updatedAt
        }
      }
    });
  } catch (error: any) {
    logger.error('Error adding package:', error);
    errorResponse(res, 'Failed to add package', 500);
  }
};

// Warehouse Management Functions

/**
 * @swagger
 * /api/admin/warehouses:
 *   get:
 *     summary: Get all warehouses (admin only)
 *     description: Retrieves a list of all warehouses in the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses retrieved successfully
 *       401:
 *         description: Unauthorized - Admin access required
 */
export const getAllWarehouses = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const warehouses = await Warehouse.find({}).sort({ createdAt: -1 });
    
    successResponse(res, {
      warehouses,
      count: warehouses.length
    }, 'Warehouses retrieved successfully');
  } catch (error) {
    logger.error('Error fetching warehouses:', error);
    errorResponse(res, 'Failed to fetch warehouses', 500);
  }
};

/**
 * @swagger
 * /api/admin/warehouses:
 *   post:
 *     summary: Create new warehouse (admin only)
 *     description: Creates a new warehouse with Air/Sea/China addresses. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - address
 *               - city
 *               - state
 *               - zipCode
 *               - country
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CLEAN"
 *               name:
 *                 type: string
 *                 example: "Clean J Shipping Main Warehouse"
 *               address:
 *                 type: string
 *                 example: "123 Shipping Lane"
 *               city:
 *                 type: string
 *                 example: "Karachi"
 *               state:
 *                 type: string
 *                 example: "Sindh"
 *               zipCode:
 *                 type: string
 *                 example: "75300"
 *               country:
 *                 type: string
 *                 example: "Pakistan"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *               airAddress:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   instructions:
 *                     type: string
 *               seaAddress:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   instructions:
 *                     type: string
 *               chinaAddress:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   instructions:
 *                     type: string
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Admin access required
 */
export const createWarehouse = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const warehouseData = req.body;
    
    // Check if warehouse code already exists
    const existingWarehouse = await Warehouse.findOne({ code: warehouseData.code });
    if (existingWarehouse) {
      errorResponse(res, 'Warehouse with this code already exists', 409);
      return;
    }
    
    // If this is set as default, remove default status from other warehouses
    if (warehouseData.isDefault) {
      await Warehouse.updateMany({}, { isDefault: false });
    }
    
    const warehouse = await Warehouse.create(warehouseData);
    
    logger.info(`Warehouse created: ${warehouse.code} by admin ${(req as any).user?.email}`);
    
    successResponse(res, {
      warehouse
    }, 'Warehouse created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating warehouse:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message).join(', ');
      errorResponse(res, `Validation error: ${validationErrors}`, 400);
      return;
    }
    
    if (error.code === 11000) {
      errorResponse(res, 'Warehouse with this code already exists', 409);
      return;
    }
    
    errorResponse(res, 'Failed to create warehouse', 500);
  }
};

/**
 * @swagger
 * /api/admin/warehouses/{id}:
 *   put:
 *     summary: Update warehouse (admin only)
 *     description: Updates an existing warehouse. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *               airAddress:
 *                 type: object
 *               seaAddress:
 *                 type: object
 *               chinaAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
export const updateWarehouse = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // If this is set as default, remove default status from other warehouses
    if (updateData.isDefault) {
      await Warehouse.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }
    
    const warehouse = await Warehouse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!warehouse) {
      errorResponse(res, 'Warehouse not found', 404);
      return;
    }
    
    logger.info(`Warehouse updated: ${warehouse.code} by admin ${(req as any).user?.email}`);
    
    successResponse(res, {
      warehouse
    }, 'Warehouse updated successfully');
  } catch (error: any) {
    logger.error('Error updating warehouse:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message).join(', ');
      errorResponse(res, `Validation error: ${validationErrors}`, 400);
      return;
    }
    
    errorResponse(res, 'Failed to update warehouse', 500);
  }
};

/**
 * @swagger
 * /api/admin/warehouses/{id}:
 *   delete:
 *     summary: Delete warehouse (admin only)
 *     description: Deletes a warehouse from the system. Requires admin privileges.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse deleted successfully
 *       404:
 *         description: Warehouse not found
 *       401:
 *         description: Unauthorized - Admin access required
 */
export const deleteWarehouse = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const warehouse = await Warehouse.findByIdAndDelete(id);
    
    if (!warehouse) {
      errorResponse(res, 'Warehouse not found', 404);
      return;
    }
    
    logger.info(`Warehouse deleted: ${warehouse.code} by admin ${(req as any).user?.email}`);
    
    successResponse(res, {
      warehouse
    }, 'Warehouse deleted successfully');
  } catch (error) {
    logger.error('Error deleting warehouse:', error);
    errorResponse(res, 'Failed to delete warehouse', 500);
  }
};
