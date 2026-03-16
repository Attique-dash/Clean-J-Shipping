import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { User } from '../../models/User';
import { successResponse, errorResponse, getPaginationData, parseQueryParam } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { TasokoService } from '../../services/tasokoService';
import { EmailService } from '../../services/emailService';

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
    const page = parseQueryParam(req.query, 'page', 1);
    const limit = parseQueryParam(req.query, 'limit', 50);
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

    // Check if searching by exact tracking number
    const searchQuery = req.query.q as string;
    let isTrackingNumberSearch = false;
    
    if (searchQuery) {
      // Check if it looks like a tracking number (alphanumeric with reasonable length)
      if (/^[A-Z0-9]{8,25}$/i.test(searchQuery.trim())) {
        isTrackingNumberSearch = true;
        filter.trackingNumber = searchQuery.trim().toUpperCase();
      } else {
        // General search across multiple fields
        const searchRegex = new RegExp(searchQuery, 'i');
        filter.$or = [
          { trackingNumber: searchRegex },
          { description: searchRegex },
          { shipper: searchRegex },
          { 'recipient.name': searchRegex },
          { 'recipient.email': searchRegex }
        ];
      }
    }

    const packages = await Package.find(filter)
      .populate('userId', 'firstName lastName email phone mailboxNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Package.countDocuments(filter);

    // If tracking number search and no results, show specific error
    if (isTrackingNumberSearch && packages.length === 0) {
      errorResponse(res, `No package found with tracking number: ${searchQuery.trim().toUpperCase()}. Please check the tracking number and try again.`, 404);
      return;
    }

    // If general search and no results, show generic message
    if (searchQuery && packages.length === 0) {
      errorResponse(res, `No packages found matching "${searchQuery}". Try different search terms or check the tracking number.`, 404);
      return;
    }

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
      // New Tasoko API fields
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
      entryDate,
      status = 'received',
      serviceMode = 'local',
      dimensions,
      senderName,
      senderEmail,
      senderPhone,
      senderAddress,
      senderCountry,
      recipient: recipientFromBody,
      itemValue,
      specialInstructions,
      isFragile,
      isHazardous,
      requiresSignature,
      customsRequired,
      customsStatus
    } = req.body;

    // Use new Tasoko fields if provided, otherwise fall back to legacy fields
    const finalUserCode = UserCode || userCode;
    const finalWeight = Weight || weight || 0;
    const finalShipper = Shipper || shipper || 'Amazon';
    const finalDescription = Description || description || '';
    const finalTrackingNumber = TrackingNumber || trackingNumber;
    const finalFirstName = FirstName || '';
    const finalLastName = LastName || '';
    const finalControlNumber = ControlNumber || '';
    const finalEntryDate = EntryDate || entryDate;
    const finalEntryDateTime = EntryDateTime || new Date();
    const finalBranch = Branch || 'Main Warehouse';

    // Check if tracking number already exists
    if (finalTrackingNumber) {
      const existingPackage = await Package.findOne({ 
        $or: [
          { trackingNumber: finalTrackingNumber },
          { TrackingNumber: finalTrackingNumber }
        ]
      });
      if (existingPackage) {
        errorResponse(res, 'A package with this tracking number already exists', 409);
        return;
      }
    }

    // Find user by userCode
    const user = await User.findOne({ userCode: finalUserCode.toUpperCase() });
    if (!user) {
      errorResponse(res, `User not found with provided userCode: ${finalUserCode}. Please verify the user code or contact support.`, 400);
      return;
    }

    // Validate that user is a customer
    if (user.role !== 'customer') {
      errorResponse(res, `User ${finalUserCode} is not a customer. User role: ${user.role}`, 400);
      return;
    }

    // Generate tracking number if not provided (must match /^[A-Z0-9]{10,20}$/)
    // Format: TRK + timestamp (13 digits) + random (4 chars) = 20 chars total
    // Ensure it's always uppercase and within 10-20 character limit
    const generatedTrackingNumber = finalTrackingNumber || (() => {
      const timestamp = Date.now().toString(); // 13 digits
      const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 uppercase chars
      const generated = `TRK${timestamp}${random}`;
      // Ensure it's exactly 20 chars and uppercase (TRK = 3, timestamp = 13, random = 4)
      return generated.substring(0, 20).toUpperCase();
    })();

    // Create dimensions object if individual dimensions are provided
    const finalDimensions = dimensions || {
      length: Length || 0,
      width: Width || 0,
      height: Height || 0,
      unit: 'cm'
    };

    const packageData = {
      // Core Tasoko API fields
      PackageID: PackageID || '',
      CourierID: CourierID || '',
      TrackingNumber: generatedTrackingNumber,
      ControlNumber: finalControlNumber,
      FirstName: finalFirstName,
      LastName: finalLastName,
      UserCode: finalUserCode.toUpperCase(),
      Weight: finalWeight,
      Shipper: finalShipper,
      EntryStaff: EntryStaff || '',
      EntryDate: finalEntryDate ? new Date(finalEntryDate) : new Date(),
      EntryDateTime: finalEntryDateTime ? new Date(finalEntryDateTime) : new Date(),
      Branch: finalBranch,
      APIToken: APIToken || '<API-TOKEN>',
      ShowControls: ShowControls || false,
      ManifestCode: ManifestCode || '',
      CollectionCode: CollectionCode || '',
      Description: finalDescription,
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
      
      // Legacy fields for backward compatibility
      trackingNumber: generatedTrackingNumber,
      userCode: finalUserCode.toUpperCase(),
      userId: user._id,
      weight: finalWeight,
      shipper: finalShipper,
      description: finalDescription,
      itemDescription: itemDescription || '',
      serviceMode,
      status,
      dimensions: finalDimensions,
      senderName: senderName || finalFirstName || finalShipper,
      senderEmail: senderEmail || '',
      senderPhone: senderPhone || '',
      senderAddress: senderAddress || '',
      senderCountry: senderCountry || '',
      recipient: recipientFromBody || {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || '',
        shippingId: user.userCode,
        address: user.address?.street || ''
      },
      totalAmount: itemValue || 0,
      specialInstructions: specialInstructions || '',
      isFragile: isFragile || false,
      isHazardous: isHazardous || false,
      requiresSignature: requiresSignature || false,
      customsRequired: customsRequired || false,
      customsStatus: customsStatus || 'not_required',
      dateReceived: finalEntryDate ? new Date(finalEntryDate) : new Date()
    };

    const newPackage = await Package.create(packageData);
    await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');

    // Send email notification to customer about package arrival
    if (user.email) {
      try {
        await EmailService.sendPackagePreAlert(
          user.email,
          {
            trackingNumber: newPackage.trackingNumber,
            shipper: newPackage.shipper || 'Unknown',
            weight: newPackage.weight || 0,
            mailboxNumber: user.mailboxNumber || 'N/A',
            customerName: `${user.firstName} ${user.lastName}`,
            receivedDate: newPackage.dateReceived || new Date(),
            // Add all detailed fields
            dimensions: newPackage.dimensions,
            description: newPackage.description,
            itemDescription: newPackage.itemDescription,
            serviceMode: newPackage.serviceMode,
            status: newPackage.status,
            senderName: newPackage.senderName,
            senderEmail: newPackage.senderEmail,
            senderPhone: newPackage.senderPhone,
            senderAddress: newPackage.senderAddress,
            senderCountry: newPackage.senderCountry,
            recipient: newPackage.recipient,
            totalAmount: newPackage.totalAmount,
            paymentStatus: newPackage.paymentStatus,
            customsRequired: newPackage.customsRequired,
            customsStatus: newPackage.customsStatus,
            warehouseLocation: newPackage.warehouseLocation,
            specialInstructions: newPackage.specialInstructions,
            isFragile: newPackage.isFragile,
            isHazardous: newPackage.isHazardous,
            requiresSignature: newPackage.requiresSignature,
            estimatedDelivery: newPackage.estimatedDelivery
          }
        );
        logger.info(`Package pre-alert email sent to customer ${user.email} for ${newPackage.trackingNumber}`);
      } catch (emailError) {
        logger.warn(`Failed to send package pre-alert email to customer ${user.email}:`, emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification to recipient if different from customer
    const recipient = newPackage.recipient;
    if (recipient && recipient.email && recipient.email !== user.email) {
      try {
        await EmailService.sendPackageNotificationToRecipient(
          recipient.email,
          {
            trackingNumber: newPackage.trackingNumber,
            shipper: newPackage.shipper || 'Unknown',
            weight: newPackage.weight || 0,
            description: newPackage.description || '',
            itemDescription: newPackage.itemDescription || '',
            senderName: newPackage.senderName || '',
            senderEmail: newPackage.senderEmail || '',
            senderPhone: newPackage.senderPhone || '',
            senderAddress: newPackage.senderAddress || '',
            senderCountry: newPackage.senderCountry || '',
            recipientName: recipient.name || '',
            recipientEmail: recipient.email || '',
            recipientPhone: recipient.phone || '',
            recipientAddress: recipient.address || '',
            serviceMode: newPackage.serviceMode || 'standard',
            warehouseLocation: newPackage.warehouseLocation || '',
            estimatedDelivery: newPackage.estimatedDelivery,
            receivedDate: newPackage.dateReceived || new Date(),
            dimensions: newPackage.dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
            totalAmount: newPackage.totalAmount || 0
          }
        );
        logger.info(`Package notification email sent to recipient ${recipient.email} for ${newPackage.trackingNumber}`);
      } catch (emailError) {
        logger.warn(`Failed to send package notification email to recipient ${recipient.email}:`, emailError);
        // Don't fail the request if email fails
      }
    }

    // Send to Tasoko - check return value and log errors
    const tasokoResult = await TasokoService.sendPackageCreated(newPackage);
    if (!tasokoResult) {
      logger.warn(`Failed to sync package ${newPackage.trackingNumber} to Tasoko, but package was created successfully`);
      // Don't fail the request, just log the warning
    }

    successResponse(res, {
      package: newPackage,
      tasokoSynced: tasokoResult
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
    const packageId = req.params.id;
    const updateData = req.body;
    
    // First, get the current package data
    const currentPackage = await Package.findById(packageId)
      .populate('userId', 'firstName lastName email phone mailboxNumber');

    if (!currentPackage) {
      errorResponse(res, 'Package not found', 404);
      return;
    }

    // If no update data provided, just return current package
    if (Object.keys(updateData).length === 0) {
      successResponse(res, {
        package: currentPackage,
        message: 'Current package data (no updates provided)'
      });
      return;
    }

    // Apply updates
    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone mailboxNumber');

    if (!updatedPackage) {
      errorResponse(res, 'Failed to update package', 500);
      return;
    }

    // Send update to Tasoko
    await TasokoService.sendPackageUpdated(updatedPackage);

    // Send email notification for status update
    if (updatedPackage.userId && (updatedPackage.userId as any).email) {
      try {
        const customer = updatedPackage.userId as any;
        const statusText = updatedPackage.status.replace(/_/g, ' ').toUpperCase();
        await EmailService.sendPackageUpdateEmail(
          customer.email,
          updatedPackage.trackingNumber,
          statusText,
          updatedPackage.warehouseLocation || 'Main Warehouse'
        );
        logger.info(`Package status update email sent to customer ${customer.email} for ${updatedPackage.trackingNumber}`);
      } catch (emailError) {
        logger.warn(`Failed to send package status update email to customer:`, emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification to recipient if different from customer
    const recipient = updatedPackage.recipient;
    if (recipient && recipient.email && updatedPackage.userId) {
      const customer = updatedPackage.userId as any;
      // Only send to recipient if different from customer
      if (recipient.email !== customer.email) {
        try {
          const statusText = updatedPackage.status.replace(/_/g, ' ').toUpperCase();
          await EmailService.sendPackageUpdateEmail(
            recipient.email,
            updatedPackage.trackingNumber,
            statusText,
            updatedPackage.warehouseLocation || 'Main Warehouse'
          );
          logger.info(`Package status update email sent to recipient ${recipient.email} for ${updatedPackage.trackingNumber}`);
        } catch (emailError) {
          logger.warn(`Failed to send package status update email to recipient:`, emailError);
          // Don't fail the request if email fails
        }
      }
    }

    successResponse(res, {
      package: updatedPackage,
      previousData: currentPackage,
      message: 'Package updated successfully'
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

    // Send deletion to Tasoko
    await TasokoService.sendPackageDeleted(deletedPackage);

    successResponse(res, null, 'Package deleted successfully');
  } catch (error) {
    logger.error('Error deleting package:', error);
    errorResponse(res, 'Failed to delete package');
  }
};

// Update Package Status (API SPEC)
export const updatePackageStatus = async (req: PackageRequest, res: Response): Promise<void> => {
  try {
    const { status, notes, location, description, estimatedDelivery } = req.body;

    if (!status) {
      errorResponse(res, 'Status is required', 400);
      return;
    }

    // Convert human-readable status to database format
    let normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    const validStatuses = ['received', 'in_transit', 'out_for_delivery', 'delivered', 'pending', 'customs', 'returned', 'at_warehouse', 'processing', 'ready_for_pickup'];
    
    if (!validStatuses.includes(normalizedStatus)) {
      errorResponse(res, `Invalid status: "${status}". Valid statuses: ${validStatuses.join(', ')}`, 400);
      return;
    }

    const historyEntry = {
      status: normalizedStatus,
      at: new Date(),
      note: notes || description || ''
    };

    const updateData: any = { 
      status: normalizedStatus,
      ...(location && { warehouseLocation: location }),
      ...(estimatedDelivery && { actualDelivery: new Date(estimatedDelivery) })
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
      package: updatedPackage,
      message: `Package status updated to: ${normalizedStatus.replace(/_/g, ' ')}`
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
