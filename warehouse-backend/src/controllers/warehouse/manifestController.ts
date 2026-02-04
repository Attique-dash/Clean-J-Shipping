import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Manifest } from '../../models/Manifest';
import { Package } from '../../models/Package';
import { successResponse, errorResponse, getPaginationData } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getManifests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId;

    const manifests = await Manifest.find(filter)
      .populate('warehouseId', 'name code')
      .populate('driverId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Manifest.countDocuments(filter);

    successResponse(res, {
      manifests,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting manifests:', error);
    errorResponse(res, 'Failed to get manifests');
  }
};

export const getManifestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findById(req.params.id)
      .populate('warehouseId', 'name code address')
      .populate('driverId', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('packages.packageId', 'trackingNumber status');

    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    successResponse(res, manifest);
  } catch (error) {
    logger.error('Error getting manifest:', error);
    errorResponse(res, 'Failed to get manifest');
  }
};

export const createManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifestData = {
      ...req.body,
      createdBy: req.user._id,
      manifestNumber: `MF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    };

    const manifest = await Manifest.create(manifestData);
    await manifest.populate('warehouseId driverId createdBy', 'name email');

    logger.info(`Manifest created: ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Manifest created successfully', 201);
  } catch (error) {
    logger.error('Error creating manifest:', error);
    errorResponse(res, 'Failed to create manifest');
  }
};

export const updateManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('warehouseId driverId createdBy', 'name email');

    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    logger.info(`Manifest updated: ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Manifest updated successfully');
  } catch (error) {
    logger.error('Error updating manifest:', error);
    errorResponse(res, 'Failed to update manifest');
  }
};

export const deleteManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findByIdAndDelete(req.params.id);

    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    logger.info(`Manifest deleted: ${manifest.manifestNumber}`);
    successResponse(res, null, 'Manifest deleted successfully');
  } catch (error) {
    logger.error('Error deleting manifest:', error);
    errorResponse(res, 'Failed to delete manifest');
  }
};

export const startManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'in-progress',
        startedAt: new Date()
      },
      { new: true }
    ).populate('warehouseId driverId', 'name email');

    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    logger.info(`Manifest started: ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Manifest started successfully');
  } catch (error) {
    logger.error('Error starting manifest:', error);
    errorResponse(res, 'Failed to start manifest');
  }
};

export const completeManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    ).populate('warehouseId driverId', 'name email');

    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    logger.info(`Manifest completed: ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Manifest completed successfully');
  } catch (error) {
    logger.error('Error completing manifest:', error);
    errorResponse(res, 'Failed to complete manifest');
  }
};

export const addPackageToManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { packageId } = req.body;

    const manifest = await Manifest.findById(req.params.id);
    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    const manifestItem = {
      packageId: packageData._id,
      trackingNumber: packageData.trackingNumber,
      status: 'pending'
    };

    manifest.packages.push(manifestItem);
    manifest.totalPackages = manifest.packages.length;
    await manifest.save();

    logger.info(`Package added to manifest: ${packageData.trackingNumber} -> ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Package added to manifest successfully');
  } catch (error) {
    logger.error('Error adding package to manifest:', error);
    errorResponse(res, 'Failed to add package to manifest');
  }
};

export const removePackageFromManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const manifest = await Manifest.findById(req.params.id);
    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    manifest.packages = manifest.packages.filter(
      (p: any) => p.packageId.toString() !== req.params.packageId
    );
    manifest.totalPackages = manifest.packages.length;
    await manifest.save();

    logger.info(`Package removed from manifest: ${req.params.packageId}`);
    successResponse(res, manifest, 'Package removed from manifest successfully');
  } catch (error) {
    logger.error('Error removing package from manifest:', error);
    errorResponse(res, 'Failed to remove package from manifest');
  }
};
