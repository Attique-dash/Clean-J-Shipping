import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User, IUser } from '../../models/User';
import { Warehouse } from '../../models/Warehouse';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { PAGINATION, USER_ROLES } from '../../utils/constants';
import { logger } from '../../utils/logger';
import bcrypt from 'bcryptjs';

export const getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.warehouseId) {
      filter.assignedWarehouse = req.query.warehouseId;
    }

    const staff = await User.find(filter)
      .select('-password')
      .populate('assignedWarehouse', 'name code')
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

export const getStaffById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff: IUser | null = await User.findOne({
      _id: req.params.id,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    })
      .select('-password')
      .populate('assignedWarehouse', 'name code address');

    if (!staff) {
      errorResponse(res, 'Staff member not found', 404);
      return;
    }

    successResponse(res, staff);
  } catch (error) {
    logger.error('Error getting staff member:', error);
    errorResponse(res, 'Failed to get staff member');
  }
};

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { name, email, password, role, phone, assignedWarehouse, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errorResponse(res, 'User with this email already exists', 409);
      return;
    }

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      errorResponse(res, 'Invalid role specified', 400);
      return;
    }

    // Validate warehouse assignment if provided
    if (assignedWarehouse) {
      const warehouse = await Warehouse.findById(assignedWarehouse);
      if (!warehouse) {
        errorResponse(res, 'Assigned warehouse not found', 400);
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const staffData = {
      firstName: name,
      email,
      passwordHash: hashedPassword,
      role,
      phone,
      assignedWarehouse,
      permissions: permissions || [],
      isActive: true,
      emailVerified: true,
      createdBy: req.user._id
    };

    const staff = await User.create(staffData);
    
    // Remove password from response
    const staffResponse: any = staff.toObject();
    delete staffResponse.passwordHash;

    await staff.populate('assignedWarehouse', 'name code');

    logger.info(`Staff member created: ${staff.email} (${staff.role})`);
    successResponse(res, staffResponse, 'Staff member created successfully', 201);
  } catch (error) {
    logger.error('Error creating staff member:', error);
    errorResponse(res, 'Failed to create staff member');
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { name, phone, role, assignedWarehouse, permissions, isActive } = req.body;

    const staff: IUser | null = await User.findOne({
      _id: req.params.id,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    });

    if (!staff) {
      errorResponse(res, 'Staff member not found', 404);
      return;
    }

    // Prevent user from deactivating themselves
    if (staff._id.toString() === req.user._id.toString() && isActive === false) {
      errorResponse(res, 'You cannot deactivate your own account', 400);
      return;
    }

    // Validate role if being changed
    if (role && !Object.values(USER_ROLES).includes(role)) {
      errorResponse(res, 'Invalid role specified', 400);
      return;
    }

    // Validate warehouse assignment if provided
    if (assignedWarehouse) {
      const warehouse = await Warehouse.findById(assignedWarehouse);
      if (!warehouse) {
        errorResponse(res, 'Assigned warehouse not found', 400);
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (assignedWarehouse !== undefined) updateData.assignedWarehouse = assignedWarehouse;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStaff = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('assignedWarehouse', 'name code');

    logger.info(`Staff member updated: ${updatedStaff?.email}`);
    successResponse(res, updatedStaff, 'Staff member updated successfully');
  } catch (error) {
    logger.error('Error updating staff member:', error);
    errorResponse(res, 'Failed to update staff member');
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const staff: IUser | null = await User.findOne({
      _id: req.params.id,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    });

    if (!staff) {
      errorResponse(res, 'Staff member not found', 404);
      return;
    }

    // Prevent user from deleting themselves
    if (staff._id.toString() === req.user._id.toString()) {
      errorResponse(res, 'You cannot delete your own account', 400);
      return;
    }

    // Check if this is the last admin
    if (staff.role === USER_ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: USER_ROLES.ADMIN, isActive: true });
      if (adminCount <= 1) {
        errorResponse(res, 'Cannot delete the last admin user', 400);
        return;
      }
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info(`Staff member deleted: ${staff.email}`);
    successResponse(res, null, 'Staff member deleted successfully');
  } catch (error) {
    logger.error('Error deleting staff member:', error);
    errorResponse(res, 'Failed to delete staff member');
  }
};

export const resetStaffPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;

    const staff: IUser | null = await User.findOne({
      _id: req.params.id,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    });

    if (!staff) {
      errorResponse(res, 'Staff member not found', 404);
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(req.params.id, {
      password: hashedPassword,
      passwordResetAt: new Date()
    });

    logger.info(`Password reset for staff member: ${staff.email}`);
    successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    logger.error('Error resetting staff password:', error);
    errorResponse(res, 'Failed to reset password');
  }
};

export const toggleStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const staff: IUser | null = await User.findOne({
      _id: req.params.id,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_STAFF] }
    });

    if (!staff) {
      errorResponse(res, 'Staff member not found', 404);
      return;
    }

    // Prevent user from deactivating themselves
    if (staff._id.toString() === req.user._id.toString() && staff.isActive) {
      errorResponse(res, 'You cannot deactivate your own account', 400);
      return;
    }

    // Check if this is the last admin being deactivated
    if (staff.role === USER_ROLES.ADMIN && staff.isActive) {
      const adminCount = await User.countDocuments({ role: USER_ROLES.ADMIN, isActive: true });
      if (adminCount <= 1) {
        errorResponse(res, 'Cannot deactivate the last admin user', 400);
        return;
      }
    }

    const updatedStaff = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: !staff.isActive },
      { new: true }
    )
      .select('-password')
      .populate('assignedWarehouse', 'name code');

    logger.info(`Staff status toggled: ${staff.email} -> ${updatedStaff?.isActive ? 'Active' : 'Inactive'}`);
    successResponse(res, updatedStaff, `Staff member ${updatedStaff?.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    logger.error('Error toggling staff status:', error);
    errorResponse(res, 'Failed to toggle staff status');
  }
};

export const getStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissions = {
      [USER_ROLES.ADMIN]: [
        'users:read', 'users:write', 'users:delete',
        'packages:read', 'packages:write', 'packages:delete',
        'inventory:read', 'inventory:write', 'inventory:delete',
        'warehouses:read', 'warehouses:write', 'warehouses:delete',
        'analytics:read', 'reports:read', 'reports:write',
        'settings:read', 'settings:write'
      ],
      [USER_ROLES.WAREHOUSE_STAFF]: [
        'packages:read', 'packages:write',
        'inventory:read', 'inventory:write',
        'customers:read',
        'analytics:read', 'reports:read'
      ],
      [USER_ROLES.CUSTOMER]: [
        'packages:read',
        'profile:read', 'profile:write'
      ]
    };

    successResponse(res, permissions);
  } catch (error) {
    logger.error('Error getting staff permissions:', error);
    errorResponse(res, 'Failed to get staff permissions');
  }
};

export const getStaffActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // This would typically query an activity log collection
    // For now, return a placeholder response
    const activity = {
      staffId: req.params.id,
      period: { start, end },
      activities: [],
      message: 'Staff activity tracking feature coming soon'
    };

    successResponse(res, activity);
  } catch (error) {
    logger.error('Error getting staff activity:', error);
    errorResponse(res, 'Failed to get staff activity');
  }
};
