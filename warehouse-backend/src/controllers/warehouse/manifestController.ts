import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Manifest } from '../../models/Manifest';
import { Package } from '../../models/Package';
import { Warehouse } from '../../models/Warehouse';
import { User } from '../../models/User';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getManifests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('getManifests called with query:', req.query);
    
    const page = parseQueryParam(req.query, 'page', PAGINATION.DEFAULT_PAGE);
    const limit = parseQueryParam(req.query, 'limit', PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId;

    logger.info('Filter applied:', filter);

    // Try a simple count first to see if there are any manifests
    const total = await Manifest.countDocuments(filter);
    logger.info('Total manifests found:', total);

    if (total === 0) {
      successResponse(res, {
        manifests: [],
        pagination: getPaginationData(page, limit, total)
      });
      return;
    }

    // Now try the full query with population
    const manifests = await Manifest.find(filter)
      .populate('warehouseId', 'name code')
      .populate('driverId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info('Manifests retrieved successfully:', manifests.length);

    successResponse(res, {
      manifests,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting manifests:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
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
    logger.info('createManifest called with body:', JSON.stringify(req.body, null, 2));
    
    if (!req.user) {
      logger.error('User not authenticated in createManifest');
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const { warehouseId, driverId, packages } = req.body;

    // Basic validation
    if (!warehouseId) {
      logger.error('warehouseId is required');
      errorResponse(res, 'warehouseId is required', 400);
      return;
    }

    // Validate warehouse exists
    try {
      const warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse) {
        logger.error('Warehouse not found:', warehouseId);
        errorResponse(res, 'Warehouse not found. Please check the warehouseId.', 400);
        return;
      }
    } catch (warehouseError) {
      logger.error('Warehouse validation error:', warehouseError);
      errorResponse(res, 'Invalid warehouseId format. Please provide a valid MongoDB ObjectId.', 400);
      return;
    }

    // Validate driver exists (if provided)
    if (driverId) {
      try {
        const driver = await User.findById(driverId);
        if (!driver) {
          logger.error('Driver not found:', driverId);
          errorResponse(res, 'Driver not found. Please check the driverId.', 400);
          return;
        }
      } catch (driverError) {
        logger.error('Driver validation error:', driverError);
        errorResponse(res, 'Invalid driverId format. Please provide a valid MongoDB ObjectId.', 400);
        return;
      }
    }

    // Use provided manifestNumber or generate one
    const manifestNumber = req.body.manifestNumber || 
      `MF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Calculate total packages from the packages array
    const totalPackages = packages ? packages.length : 0;

    // Create manifest data
    const manifestData = {
      manifestNumber,
      warehouseId,
      createdBy: req.user._id,
      totalPackages,
      deliveredPackages: 0,
      status: 'draft',
      packages: packages || []
    };

    logger.info('Manifest data prepared:', manifestData);

    const manifest = await Manifest.create(manifestData);
    
    // Populate with related data
    await manifest.populate('warehouseId', 'name code');
    if (driverId) {
      await manifest.populate('driverId', 'name email');
    }
    await manifest.populate('createdBy', 'name email');

    logger.info(`Manifest created successfully: ${manifest.manifestNumber}`);
    successResponse(res, manifest, 'Manifest created successfully', 201);
  } catch (error) {
    logger.error('Error creating manifest:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    errorResponse(res, 'Failed to create manifest');
  }
};

export const updateManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('updateManifest called with params:', req.params.id);
    logger.info('updateManifest called with body:', JSON.stringify(req.body, null, 2));

    const { warehouseId, driverId, packages } = req.body;

    // Validate warehouse exists (if provided)
    if (warehouseId) {
      try {
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
          logger.error('Warehouse not found:', warehouseId);
          errorResponse(res, 'Warehouse not found. Please check warehouseId.', 400);
          return;
        }
      } catch (warehouseError) {
        logger.error('Warehouse validation error:', warehouseError);
        errorResponse(res, 'Invalid warehouseId format. Please provide a valid MongoDB ObjectId.', 400);
        return;
      }
    }

    // Validate driver exists (if provided)
    if (driverId) {
      try {
        const driver = await User.findById(driverId);
        if (!driver) {
          logger.error('Driver not found:', driverId);
          errorResponse(res, 'Driver not found. Please check driverId.', 400);
          return;
        }
      } catch (driverError) {
        logger.error('Driver validation error:', driverError);
        errorResponse(res, 'Invalid driverId format. Please provide a valid MongoDB ObjectId.', 400);
        return;
      }
    }

    // Validate packages exist (if provided)
    if (packages && packages.length > 0) {
      try {
        const packageIds = packages.map((pkg: any) => pkg.packageId);
        const existingPackages = await Package.find({ '_id': { $in: packageIds } });
        
        if (existingPackages.length !== packageIds.length) {
          logger.error('Some packages not found');
          errorResponse(res, 'One or more packages not found', 400);
          return;
        }
      } catch (packageError) {
        logger.error('Package validation error:', packageError);
        errorResponse(res, 'Invalid packageId format. Please provide valid MongoDB ObjectIds.', 400);
        return;
      }
    }

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
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
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

export const deliverPackageInManifest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('deliverPackageInManifest called with params:', {
      manifestId: req.params.id,
      packageId: req.params.packageId,
      body: req.body
    });

    const { status, notes, actualTime } = req.body;

    // Find the manifest
    const manifest = await Manifest.findById(req.params.id);
    if (!manifest) {
      errorResponse(res, 'Manifest not found', 404);
      return;
    }

    // Find the package in the manifest
    const packageIndex = manifest.packages.findIndex(
      (p: any) => p.packageId.toString() === req.params.packageId
    );

    if (packageIndex === -1) {
      errorResponse(res, 'Package not found in manifest', 404);
      return;
    }

    // Update package status and notes
    if (status) {
      manifest.packages[packageIndex].status = status;
    }
    if (notes) {
      manifest.packages[packageIndex].notes = notes;
    }

    // Update delivered packages count if status is 'delivered'
    if (status === 'delivered') {
      manifest.deliveredPackages = manifest.packages.filter(
        (p: any) => p.status === 'delivered'
      ).length;
    }

    // Update route stop actual time if provided
    if (actualTime && manifest.route && manifest.route.stops) {
      for (const stop of manifest.route.stops) {
        if (stop.packages && stop.packages.some((pkgId: any) => pkgId.toString() === req.params.packageId)) {
          stop.actualTime = new Date(actualTime);
          break;
        }
      }
    }

    await manifest.save();

    // Populate related data
    await manifest.populate('warehouseId driverId createdBy', 'name email');

    logger.info(`Package delivered in manifest: ${req.params.packageId}`);
    successResponse(res, manifest, 'Package marked as delivered successfully');
  } catch (error) {
    logger.error('Error delivering package in manifest:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    errorResponse(res, 'Failed to mark package as delivered');
  }
};
