import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { User } from '../../models/User';
import { successResponse, errorResponse, getPaginationData } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface PackageRequest extends AuthRequest {
  query: {
    userCode?: string;
    q?: string;
    statuses?: string;
    page?: string;
    limit?: string;
  };
  body: any;
}

// Search Packages (API SPEC)
export const searchPackages = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Filter by userCode
    if (req.query.userCode) {
      filter.userCode = req.query.userCode.toUpperCase();
    }

    // Filter by statuses
    if (req.query.statuses) {
      const statuses = req.query.statuses.split(',');
      filter.status = { $in: statuses };
    }

    // Search query
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

    // Transform packages to match API response format
    const transformedPackages = packages.map(pkg => {
      const customer = pkg.userId as any;
      return {
        _id: pkg._id,
        trackingNumber: pkg.trackingNumber,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        mailboxNumber: customer?.mailboxNumber || '',
        userCode: pkg.userCode,
        serviceMode: pkg.serviceMode,
        status: pkg.status,
        weight: pkg.weight,
        weightUnit: 'kg',
        weightLbs: pkg.weight * 2.20462, // Convert to lbs
        itemValueUsd: pkg.totalAmount || 0,
        dateReceived: pkg.dateReceived || pkg.createdAt,
        daysInStorage: Math.floor((Date.now() - (pkg.dateReceived || pkg.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        warehouseLocation: pkg.warehouseLocation || '',
        customsRequired: pkg.customsRequired,
        customsStatus: pkg.customsStatus,
        paymentStatus: pkg.paymentStatus,
        shipper: pkg.shipper || '',
        description: pkg.description || '',
        specialInstructions: pkg.specialInstructions || '',
        dimensions: pkg.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
        sender: {
          name: pkg.senderName || '',
          email: pkg.senderEmail || '',
          phone: pkg.senderPhone || '',
          address: pkg.senderAddress || '',
          country: pkg.senderCountry || ''
        },
        recipient: {
          name: pkg.recipient?.name || '',
          shippingId: pkg.recipient?.shippingId || '',
          email: pkg.recipient?.email || '',
          phone: pkg.recipient?.phone || ''
        }
      };
    });

    const total = await Package.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    successResponse(res, {
      packages: transformedPackages,
      total,
      page,
      pages
    });
  } catch (error) {
    logger.error('Error searching packages:', error);
    errorResponse(res, 'Failed to search packages');
  }
};

// Get Package by ID (API SPEC)
export const getPackageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packageData = await Package.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone mailboxNumber');

    if (!packageData) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, {
      package: packageData
    });
  } catch (error) {
    logger.error('Error getting package:', error);
    errorResponse(res, 'Failed to get package');
  }
};

// Add New Package (API SPEC)
export const addPackage = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const {
      trackingNumber,
      userCode,
      weight,
      shipper,
      description,
      itemDescription,
      entryDate,
      status = 'received',
      serviceMode = 'local',
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
      customsStatus
    } = req.body;

    // Check if tracking number already exists
    const existingPackage = await Package.findOne({ trackingNumber });
    if (existingPackage) {
      errorResponse(res, 'A package with this tracking number already exists', 409);
      return;
    }

    // Find user by userCode
    const user = await User.findOne({ userCode: userCode.toUpperCase() });
    if (!user) {
      errorResponse(res, 'User not found with provided userCode', 400);
      return;
    }

    const packageData = {
      trackingNumber,
      userCode: userCode.toUpperCase(),
      userId: user._id,
      weight: weight || 0,
      shipper: shipper || '',
      description: description || '',
      itemDescription: itemDescription || '',
      serviceMode,
      status,
      dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
      senderName: senderName || '',
      senderEmail: senderEmail || '',
      senderPhone: senderPhone || '',
      senderAddress: senderAddress || '',
      senderCountry: senderCountry || '',
      recipient: recipient || {},
      totalAmount: itemValue || 0,
      specialInstructions: specialInstructions || '',
      isFragile: isFragile || false,
      isHazardous: isHazardous || false,
      requiresSignature: requiresSignature || false,
      customsRequired: customsRequired || false,
      customsStatus: customsStatus || 'not_required',
      dateReceived: entryDate ? new Date(entryDate) : new Date()
    };

    const newPackage = await Package.create(packageData);
    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');

    successResponse(res, {
      package: newPackage
    }, 'Package created successfully', 201);
  } catch (error) {
    logger.error('Error adding package:', error);
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      errorResponse(res, 'Tracking number already exists', 409);
    } else {
      errorResponse(res, 'Failed to add package');
    }
  }
};

// Update Package (API SPEC)
export const updatePackage = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const updateData = req.body;
    
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone mailboxNumber');

    if (!updatedPackage) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, {
      package: updatedPackage
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    errorResponse(res, 'Failed to update package');
  }
};

// Delete Package (API SPEC)
export const deletePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deletedPackage = await Package.findByIdAndDelete(req.params.id);

    if (!deletedPackage) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, null, 'Package deleted successfully');
  } catch (error) {
    logger.error('Error deleting package:', error);
    errorResponse(res, 'Failed to delete package');
  }
};

// Update Package Status (API SPEC)
export const updatePackageStatus = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const { status, notes, location } = req.body;

    if (!status) {
      errorResponse(res, 'Status is required', 400);
      return;
    }

    const historyEntry = {
      status,
      at: new Date(),
      note: notes || ''
    };

    const updateData: any = { 
      status,
      ...(location && { warehouseLocation: location })
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        $push: { history: historyEntry }
      },
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone mailboxNumber');

    if (!updatedPackage) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    successResponse(res, {
      package: updatedPackage
    });
  } catch (error) {
    logger.error('Error updating package status:', error);
    errorResponse(res, 'Failed to update package status');
  }
};

// Bulk Upload Packages (API SPEC)
export const bulkUploadPackages = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const { packages } = req.body;

    if (!packages || !Array.isArray(packages)) {
      errorResponse(res, 'Packages array is required', 400);
      return;
    }

    const results = [];
    let success = 0;
    let failed = 0;

    for (const pkgData of packages) {
      try {
        // Check if tracking number already exists
        const existingPackage = await Package.findOne({ trackingNumber: pkgData.trackingNumber });
        if (existingPackage) {
          results.push({
            trackingNumber: pkgData.trackingNumber,
            ok: false,
            error: 'Tracking number already exists'
          });
          failed++;
          continue;
        }

        // Find user by userCode
        const user = await User.findOne({ userCode: pkgData.userCode.toUpperCase() });
        if (!user) {
          results.push({
            trackingNumber: pkgData.trackingNumber,
            ok: false,
            error: 'User not found'
          });
          failed++;
          continue;
        }

        const newPackage = new Package({
          ...pkgData,
          userCode: pkgData.userCode.toUpperCase(),
          userId: user._id,
          dateReceived: new Date()
        });

        await newPackage.save();
        results.push({
          trackingNumber: pkgData.trackingNumber,
          ok: true
        });
        success++;
      } catch (error) {
        results.push({
          trackingNumber: pkgData.trackingNumber,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }

    successResponse(res, {
      total: packages.length,
      success,
      failed,
      results
    });
  } catch (error) {
    logger.error('Error in bulk upload:', error);
    errorResponse(res, 'Failed to process bulk upload');
  }
};
