import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const user = await User.findById(req.user._id).select('-passwordHash');
    successResponse(res, user);
  } catch (error) {
    logger.error('Error getting profile:', error);
    errorResponse(res, 'Failed to get profile');
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const allowedFields = ['firstName', 'lastName', 'phone'];
    const updates: any = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    successResponse(res, user, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    errorResponse(res, 'Failed to update profile');
  }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      errorResponse(res, 'Current password is incorrect', 400);
      return;
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password updated successfully');
  } catch (error) {
    logger.error('Error updating password:', error);
    errorResponse(res, 'Failed to update password');
  }
};

export const getActivityLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically query an activity log collection
    // For now, return a placeholder response
    successResponse(res, {
      activities: [],
      message: 'Activity log feature coming soon'
    });
  } catch (error) {
    logger.error('Error getting activity log:', error);
    errorResponse(res, 'Failed to get activity log');
  }
};

export const getSystemSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically query a settings collection
    const settings = {
      system: {
        maintenance: false,
        version: '1.0.0',
        timezone: 'UTC'
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true
      },
      security: {
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        passwordMinLength: 8
      }
    };

    successResponse(res, settings);
  } catch (error) {
    logger.error('Error getting system settings:', error);
    errorResponse(res, 'Failed to get system settings');
  }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically update a settings collection
    successResponse(res, null, 'System settings updated successfully');
  } catch (error) {
    logger.error('Error updating system settings:', error);
    errorResponse(res, 'Failed to update system settings');
  }
};

export const getWarehouseSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically query warehouse-specific settings
    const settings = {
      operating: {
        businessHours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { open: '09:00', close: '12:00' },
          sunday: { open: 'closed', close: 'closed' }
        }
      },
      shipping: {
        defaultCarrier: 'standard',
        insuranceRequired: false,
        signatureRequired: false
      }
    };

    successResponse(res, settings);
  } catch (error) {
    logger.error('Error getting warehouse settings:', error);
    errorResponse(res, 'Failed to get warehouse settings');
  }
};

export const updateWarehouseSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically update warehouse-specific settings
    successResponse(res, null, 'Warehouse settings updated successfully');
  } catch (error) {
    logger.error('Error updating warehouse settings:', error);
    errorResponse(res, 'Failed to update warehouse settings');
  }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = {
      email: {
        packageUpdates: true,
        deliveryConfirmations: true,
        paymentReceipts: true,
        marketingEmails: false
      },
      sms: {
        packageUpdates: false,
        deliveryConfirmations: true,
        paymentAlerts: false
      },
      push: {
        packageUpdates: true,
        deliveryConfirmations: true,
        newMessages: true
      }
    };

    successResponse(res, settings);
  } catch (error) {
    logger.error('Error getting notification settings:', error);
    errorResponse(res, 'Failed to get notification settings');
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically update user's notification preferences
    successResponse(res, null, 'Notification settings updated successfully');
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    errorResponse(res, 'Failed to update notification settings');
  }
};

// Report generation methods
export const generatePackageReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would generate a package report
    successResponse(res, {
      reportUrl: '/reports/packages/latest.pdf',
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error generating package report:', error);
    errorResponse(res, 'Failed to generate package report');
  }
};

export const generateInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would generate an inventory report
    successResponse(res, {
      reportUrl: '/reports/inventory/latest.pdf',
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error generating inventory report:', error);
    errorResponse(res, 'Failed to generate inventory report');
  }
};

export const generateCustomerReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would generate a customer report
    successResponse(res, {
      reportUrl: '/reports/customers/latest.pdf',
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error generating customer report:', error);
    errorResponse(res, 'Failed to generate customer report');
  }
};

export const generateFinancialReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would generate a financial report
    successResponse(res, {
      reportUrl: '/reports/financial/latest.pdf',
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error generating financial report:', error);
    errorResponse(res, 'Failed to generate financial report');
  }
};

export const generatePerformanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would generate a performance report
    successResponse(res, {
      reportUrl: '/reports/performance/latest.pdf',
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error generating performance report:', error);
    errorResponse(res, 'Failed to generate performance report');
  }
};
