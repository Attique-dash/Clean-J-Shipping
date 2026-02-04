import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { successResponse, errorResponse, getPaginationData } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getCustomerPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: any = {
      $or: [
        { senderId: req.user._id },
        { recipientId: req.user._id }
      ]
    };

    if (req.query.status) filter.status = req.query.status;

    const packages = await Package.find(filter)
      .populate('senderId recipientId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments(filter);

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting customer packages:', error);
    errorResponse(res, 'Failed to get packages');
  }
};

export const getPackageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { senderId: req.user._id },
        { recipientId: req.user._id }
      ]
    })
      .populate('senderId recipientId', 'name email phone');

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
    const packageData = await Package.findOne({
      trackingNumber: req.params.trackingNumber.toUpperCase(),
      $or: [
        { senderId: req.user._id },
        { recipientId: req.user._id }
      ]
    })
      .populate('senderId recipientId', 'name email')
      .select('trackingNumber status trackingHistory estimatedDelivery actualDelivery');

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
    const { issue, description } = req.body;

    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { senderId: req.user._id },
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
    const packageData = await Package.findOne({
      _id: req.params.id,
      $or: [
        { senderId: req.user._id },
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
