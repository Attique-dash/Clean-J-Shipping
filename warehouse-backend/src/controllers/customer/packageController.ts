import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getCustomerPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    logger.info('Getting packages for user:', {
      userCode: req.user.userCode,
      userId: req.user._id,
      page,
      limit
    });

    const filter: any = {
      $or: [
        { userCode: req.user.userCode },
        { customerCode: req.user.userCode }
      ]
    };

    if (req.query.status) filter.status = req.query.status;

    logger.info('Package filter:', filter);

    const packages = await Package.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments(filter);

    logger.info('Found packages:', { count: packages.length, total });

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error: any) {
    logger.error('Error getting customer packages:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.userCode
    });
    errorResponse(res, 'Failed to get packages');
  }
};

export const getPackageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { userCode: req.user.userCode },
        { customerCode: req.user.userCode }
      ]
    })
      .populate('userId', 'firstName lastName email phone');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, packageData);
  } catch (error) {
    logger.error('Error getting package:', error);
    errorResponse(res, 'Failed to get package');
  }
};

export const trackPackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Public endpoint - no authentication required
    const trackingNumber = (req as any).params.trackingNumber?.toUpperCase();

    if (!trackingNumber) {
      errorResponse(res, 'Tracking number is required', 400);
      return;
    }

    const packageData = await Package.findOne({
      trackingNumber: trackingNumber
    })
      .populate('userId', 'firstName lastName email')
      .select('trackingNumber status trackingHistory estimatedDelivery actualDelivery dateReceived warehouseLocation');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, packageData);
  } catch (error) {
    logger.error('Error tracking package:', error);
    errorResponse(res, 'Failed to track package');
  }
};

export const reportIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { issue, description } = req.body;

    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { recipientId: req.user._id }
      ]
    });

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // Add issue to package notes or create a separate issue tracking system
    const issueNote = `Issue reported: ${issue} - ${description} (Reported on ${new Date().toISOString()})`;
    packageData.notes = packageData.notes ? `${packageData.notes}\n${issueNote}` : issueNote;
    await packageData.save();

    logger.info(`Issue reported for package: ${packageData.trackingNumber}`);
    successResponse(res, null, 'Issue reported successfully');
  } catch (error) {
    logger.error('Error reporting issue:', error);
    errorResponse(res, 'Failed to report issue');
  }
};

export const getPackageHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { recipientId: req.user._id }
      ]
    })
      .select('trackingHistory createdAt updatedAt');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, {
      trackingHistory: packageData.trackingHistory,
      createdAt: packageData.createdAt,
      updatedAt: packageData.updatedAt
    });
  } catch (error) {
    logger.error('Error getting package history:', error);
    errorResponse(res, 'Failed to get package history');
  }
};
