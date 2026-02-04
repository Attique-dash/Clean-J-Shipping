import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../../models/User';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    successResponse(res, user);
  } catch (error) {
    logger.error('Error getting profile:', error);
    errorResponse(res, 'Failed to get profile');
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowedFields = ['name', 'phone', 'avatar'];
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
    ).select('-password');

    successResponse(res, user, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    errorResponse(res, 'Failed to update profile');
  }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
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

export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences },
      { new: true, runValidators: true }
    ).select('-password');

    successResponse(res, user, 'Preferences updated successfully');
  } catch (error) {
    logger.error('Error updating preferences:', error);
    errorResponse(res, 'Failed to update preferences');
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password, confirmation } = req.body;

    if (!confirmation || confirmation !== 'DELETE') {
      errorResponse(res, 'Account deletion confirmation required', 400);
      return;
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      errorResponse(res, 'Invalid password', 400);
      return;
    }

    await User.findByIdAndDelete(req.user._id);

    logger.info(`Account deleted: ${user.email}`);
    successResponse(res, null, 'Account deleted successfully');
  } catch (error) {
    logger.error('Error deleting account:', error);
    errorResponse(res, 'Failed to delete account');
  }
};

export const verifyEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    // This would typically verify a token sent to the user's email
    // For now, we'll just mark the email as verified
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { emailVerified: true },
      { new: true }
    ).select('-password');

    logger.info(`Email verified: ${user?.email}`);
    successResponse(res, user, 'Email verified successfully');
  } catch (error) {
    logger.error('Error verifying email:', error);
    errorResponse(res, 'Failed to verify email');
  }
};

export const verifyPhone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    // This would typically verify a code sent to the user's phone
    // For now, we'll just return success
    logger.info(`Phone verified for user: ${req.user._id}`);
    successResponse(res, null, 'Phone verified successfully');
  } catch (error) {
    logger.error('Error verifying phone:', error);
    errorResponse(res, 'Failed to verify phone');
  }
};
