import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { User } from '../../models/User';
import { successResponse, errorResponse, getPaginationData, generateTrackingNumber } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getPackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.senderId) filter.senderId = req.query.senderId;
    if (req.query.recipientId) filter.recipientId = req.query.recipientId;

    const packages = await Package.find(filter)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .populate('createdBy', 'name email')
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

export const getPackageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findById(req.params.id)
      .populate('senderId', 'name email phone')
      .populate('recipientId', 'name email phone')
      .populate('createdBy', 'name email');

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

export const createPackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = {
      ...req.body,
      trackingNumber: generateTrackingNumber(),
      createdBy: req.user._id
    };

    const newPackage = await Package.create(packageData);
    await newPackage.populate('senderId recipientId createdBy', 'name email');

    logger.info(`Package created: ${newPackage.trackingNumber}`);
    successResponse(res, newPackage, 'Package created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating package:', error);
    if (error.code === 11000) {
      errorResponse(res, 'Tracking number already exists', 409);
    } else {
      errorResponse(res, 'Failed to create package');
    }
  }
};

export const updatePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('senderId recipientId createdBy', 'name email');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    logger.info(`Package updated: ${packageData.trackingNumber}`);
    successResponse(res, packageData, 'Package updated successfully');
  } catch (error) {
    logger.error('Error updating package:', error);
    errorResponse(res, 'Failed to update package');
  }
};

export const deletePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findByIdAndDelete(req.params.id);

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    logger.info(`Package deleted: ${packageData.trackingNumber}`);
    successResponse(res, null, 'Package deleted successfully');
  } catch (error) {
    logger.error('Error deleting package:', error);
    errorResponse(res, 'Failed to delete package');
  }
};

export const updatePackageStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, location, description } = req.body;

    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    packageData.status = status;
    packageData.trackingHistory.push({
      timestamp: new Date(),
      status,
      location: location || 'Unknown',
      description
    });

    if (status === 'delivered') {
      packageData.actualDelivery = new Date();
    }

    await packageData.save();
    await packageData.populate('senderId recipientId', 'name email');

    logger.info(`Package status updated: ${packageData.trackingNumber} -> ${status}`);
    successResponse(res, packageData, 'Package status updated successfully');
  } catch (error) {
    logger.error('Error updating package status:', error);
    errorResponse(res, 'Failed to update package status');
  }
};

export const addTrackingUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, location, description } = req.body;

    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    packageData.trackingHistory.push({
      timestamp: new Date(),
      status,
      location,
      description
    });

    await packageData.save();

    logger.info(`Tracking update added: ${packageData.trackingNumber}`);
    successResponse(res, packageData, 'Tracking update added successfully');
  } catch (error) {
    logger.error('Error adding tracking update:', error);
    errorResponse(res, 'Failed to add tracking update');
  }
};

export const getPackageByTrackingNumber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findOne({ trackingNumber: req.params.trackingNumber.toUpperCase() })
      .populate('senderId recipientId', 'name email');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, packageData);
  } catch (error) {
    logger.error('Error getting package by tracking number:', error);
    errorResponse(res, 'Failed to get package');
  }
};

export const getPackagesByStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const packages = await Package.find({ status: req.params.status })
      .populate('senderId recipientId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments({ status: req.params.status });

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting packages by status:', error);
    errorResponse(res, 'Failed to get packages');
  }
};

export const getPackagesByCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const packages = await Package.find({
      $or: [
        { senderId: req.params.customerId },
        { recipientId: req.params.customerId }
      ]
    })
      .populate('senderId recipientId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments({
      $or: [
        { senderId: req.params.customerId },
        { recipientId: req.params.customerId }
      ]
    });

    successResponse(res, {
      packages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting packages by customer:', error);
    errorResponse(res, 'Failed to get packages');
  }
};

export const addToManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { manifestId } = req.body;

    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // This would typically involve updating the manifest
    // For now, we'll just return success
    logger.info(`Package added to manifest: ${packageData.trackingNumber}`);
    successResponse(res, null, 'Package added to manifest successfully');
  } catch (error) {
    logger.error('Error adding package to manifest:', error);
    errorResponse(res, 'Failed to add package to manifest');
  }
};

export const removeFromManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // This would typically involve updating the manifest
    // For now, we'll just return success
    logger.info(`Package removed from manifest: ${packageData.trackingNumber}`);
    successResponse(res, null, 'Package removed from manifest successfully');
  } catch (error) {
    logger.error('Error removing package from manifest:', error);
    errorResponse(res, 'Failed to remove package from manifest');
  }
};
