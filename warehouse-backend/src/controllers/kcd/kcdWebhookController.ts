import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { Manifest } from '../../models/Manifest';
import { User } from '../../models/User';
import { ApiKey } from '../../models/ApiKey';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface KCDWebhookRequest extends AuthRequest {
  body: {
    // Original format fields
    trackingNumber?: string;
    courierCode?: string;
    status?: string;
    location?: string;
    notes?: string;
    timestamp?: string;
    packageData?: any;
    deliveryData?: any;
    recipient?: any;
    manifestId?: string;
    packages?: string[];
    departureDate?: string;
    arrivalDate?: string;
    test?: boolean;
    message?: string;
    // PDF format fields (PascalCase)
    PackageID?: string;
    CourierID?: string;
    ManifestID?: string;
    CollectionID?: string;
    TrackingNumber?: string;
    ControlNumber?: string;
    FirstName?: string;
    LastName?: string;
    UserCode?: string;
    Weight?: number;
    Shipper?: string;
    EntryStaff?: string;
    EntryDate?: string;
    EntryDateTime?: string;
    Branch?: string;
    Claimed?: boolean;
    APIToken?: string;
    ShowControls?: boolean;
    Description?: string;
    HSCode?: string;
    Unknown?: boolean;
    AIProcessed?: boolean;
    OriginalHouseNumber?: string;
    Cubes?: number;
    Length?: number;
    Width?: number;
    Height?: number;
    Pieces?: number;
    Discrepancy?: boolean;
    DiscrepancyDescription?: string;
    ServiceTypeID?: string;
    HazmatCodeID?: string;
    Coloaded?: boolean;
    ColoadIndicator?: string;
    PackageStatus?: number;
    PackagePayments?: string;
    // Also allow camelCase versions
    packageId?: string;
    courierId?: string;
    collectionId?: string;
    userCode?: string;
    weight?: number;
    shipper?: string;
    description?: string;
    controlNumber?: string;
    firstName?: string;
    lastName?: string;
    pieces?: number;
    cubes?: number;
    length?: number;
    width?: number;
    height?: number;
    branch?: string;
    entryStaff?: string;
    claimed?: boolean;
    showControls?: boolean;
    hsCode?: string;
    unknown?: boolean;
    aiProcessed?: boolean;
    originalHouseNumber?: string;
    discrepancy?: boolean;
    discrepancyDescription?: string;
    serviceTypeId?: string;
    hazmatCodeId?: string;
    coloaded?: boolean;
    coloadIndicator?: string;
    packageStatus?: number;
    packagePayments?: string;
    apiToken?: string;
    token?: string;
    // Additional PascalCase fields for manifest and status updates
    Status?: string;
    Location?: string;
    Notes?: string;
    Timestamp?: string;
    CourierCode?: string;
    Packages?: string[];
    DepartureDate?: string;
    ArrivalDate?: string;
    manifestID?: string;
  };
}

export class KCDWebhookController {
  
  // Handle package creation from KCD
  static async packageCreated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      // Support both old format (trackingNumber, courierCode, packageData) and PDF format (flat PascalCase)
      const body = req.body;
      
      // Check if this is PDF format (has UserCode, TrackingNumber, etc.)
      const isPdfFormat = body.UserCode || body.TrackingNumber || body.Weight !== undefined;
      
      let trackingNumber: string | undefined;
      let courierCode: string | undefined;
      let packageData: any;
      let timestamp: string | undefined;
      
      if (isPdfFormat) {
        // PDF Format - flat structure with PascalCase
        trackingNumber = body.TrackingNumber || body.trackingNumber;
        courierCode = 'CLEAN'; // Default for PDF format
        timestamp = body.EntryDateTime || body.EntryDate || new Date().toISOString();
        
        // Map PDF fields to packageData structure
        packageData = {
          userCode: body.UserCode || body.userCode,
          weight: body.Weight || body.weight,
          shipper: body.Shipper || body.shipper,
          description: body.Description || body.description,
          controlNumber: body.ControlNumber || body.controlNumber,
          firstName: body.FirstName || body.firstName,
          lastName: body.LastName || body.lastName,
          pieces: body.Pieces || body.pieces || 1,
          cubes: body.Cubes || body.cubes || 0,
          length: body.Length || body.length || 0,
          width: body.Width || body.width || 0,
          height: body.Height || body.height || 0,
          branch: body.Branch || body.branch,
          entryStaff: body.EntryStaff || body.entryStaff,
          packageId: body.PackageID || body.packageId,
          courierId: body.CourierID || body.courierId,
          manifestId: body.ManifestID || body.manifestId,
          collectionId: body.CollectionID || body.collectionId,
          claimed: body.Claimed || body.claimed || false,
          showControls: body.ShowControls || body.showControls || false,
          hsCode: body.HSCode || body.hsCode,
          unknown: body.Unknown || body.unknown || false,
          aiProcessed: body.AIProcessed || body.aiProcessed || false,
          originalHouseNumber: body.OriginalHouseNumber || body.originalHouseNumber,
          discrepancy: body.Discrepancy || body.discrepancy || false,
          discrepancyDescription: body.DiscrepancyDescription || body.discrepancyDescription,
          serviceTypeId: body.ServiceTypeID || body.serviceTypeId,
          hazmatCodeId: body.HazmatCodeID || body.hazmatCodeId,
          coloaded: body.Coloaded || body.coloaded || false,
          coloadIndicator: body.ColoadIndicator || body.coloadIndicator,
          packageStatus: body.PackageStatus !== undefined ? body.PackageStatus : body.packageStatus,
          packagePayments: body.PackagePayments || body.packagePayments,
          apiToken: body.APIToken || body.apiToken || body.token
        };
      } else {
        // Original format - nested structure
        trackingNumber = body.trackingNumber;
        courierCode = body.courierCode;
        packageData = body.packageData;
        timestamp = body.timestamp;
      }

      if (!trackingNumber) {
        errorResponse(res, 'Missing required field: trackingNumber (or TrackingNumber in PDF format)', 400);
        return;
      }

      // Verify courier code matches the authenticated API key's courier code (skip for PDF format)
      const authenticatedCourierCode = (req as any).apiKey?.courierCode;
      if (!isPdfFormat && authenticatedCourierCode && courierCode !== authenticatedCourierCode) {
        errorResponse(res, `Invalid courier code. Expected: ${authenticatedCourierCode}, Received: ${courierCode}`, 400);
        return;
      }
      
      // For PDF format, use authenticated courier code or default to CLEAN
      const finalCourierCode = authenticatedCourierCode || 'CLEAN';

      // Check if package already exists
      const existingPackage = await Package.findOne({ trackingNumber });
      if (existingPackage) {
        logger.warn(`Package ${trackingNumber} already exists, updating...`);
        // Update existing package with new data
        Object.assign(existingPackage, packageData);
        await existingPackage.save();
        
        successResponse(res, {
          trackingNumber,
          action: 'updated',
          message: 'Package already exists, updated successfully'
        }, 'Package processed successfully');
        return;
      }

      // Find the customer by userCode
      const customer = await User.findOne({ 
        userCode: packageData.userCode || 'CLEAN', 
        role: 'customer' 
      });
      
      if (!customer) {
        errorResponse(res, `Customer not found for userCode: ${packageData.userCode || 'CLEAN'}`, 404);
        return;
      }

      // Create new package
      const newPackage = new Package({
        trackingNumber,
        userCode: packageData.userCode || finalCourierCode,
        userId: customer._id,
        status: 'received',
        dateReceived: new Date(timestamp || Date.now()),
        source: 'kcd_webhook',
        sourceDetails: {
          webhookId: (req.body as any).webhookId || `kcd-${Date.now()}`,
          apiEndpoint: '/api/kcd/packages/add',
          syncedAt: new Date(),
          syncStatus: 'synced'
        },
        courierCode: finalCourierCode,
        processedAt: new Date(),
        ...packageData
      });

      await newPackage.save();

      logger.info(`Package created from KCD webhook: ${trackingNumber}`);

      successResponse(res, {
        trackingNumber,
        packageId: newPackage._id,
        action: 'created',
        message: 'Package created successfully'
      }, 'Package created from KCD webhook');

    } catch (error: any) {
      logger.error('Error processing KCD package created webhook:', error);
      logger.error('Error details:', error?.message || 'Unknown error');
      logger.error('Error stack:', error?.stack || 'No stack trace');
      errorResponse(res, `Failed to process package creation: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  // Handle package status updates from KCD
  static async packageUpdated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      // Support both camelCase and PascalCase (PDF format)
      const trackingNumber = req.body.trackingNumber || req.body.TrackingNumber;
      const status = req.body.status || req.body.Status;
      const location = req.body.location || req.body.Location;
      const notes = req.body.notes || req.body.Notes;
      const timestamp = req.body.timestamp || req.body.Timestamp;

      if (!trackingNumber || !status) {
        errorResponse(res, 'Missing required fields: trackingNumber, status', 400);
        return;
      }

      const packageData = await Package.findOne({ trackingNumber });
      if (!packageData) {
        errorResponse(res, `Package not found: ${trackingNumber}`, 404);
        return;
      }

      // Update package status
      const historyEntry = {
        status: status.toLowerCase().replace(/\s+/g, '_'),
        at: new Date(timestamp || Date.now()),
        note: notes || `Status updated by KCD Logistics`,
        location: location || packageData.warehouseLocation
      };

      packageData.status = status.toLowerCase().replace(/\s+/g, '_');
      if (location) {
        packageData.warehouseLocation = location;
      }
      if (packageData.history) {
        packageData.history.push(historyEntry);
      } else {
        packageData.history = [historyEntry];
      }

      await packageData.save();

      logger.info(`Package status updated from KCD webhook: ${trackingNumber} -> ${status}`);

      successResponse(res, {
        trackingNumber,
        previousStatus: packageData.status,
        newStatus: status,
        location,
        timestamp: historyEntry.at
      }, 'Package status updated successfully');

    } catch (error: any) {
      logger.error('Error processing KCD package updated webhook:', error);
      logger.error('Error details:', error?.message || 'Unknown error');
      errorResponse(res, `Failed to process package update: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  // Handle package delivery confirmation from KCD
  static async packageDelivered(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      const { trackingNumber, deliveryData, recipient, timestamp } = req.body;

      if (!trackingNumber || !deliveryData) {
        errorResponse(res, 'Missing required fields: trackingNumber, deliveryData', 400);
        return;
      }

      const packageData = await Package.findOne({ trackingNumber });
      if (!packageData) {
        errorResponse(res, `Package not found: ${trackingNumber}`, 404);
        return;
      }

      // Update package as delivered
      const historyEntry = {
        status: 'delivered',
        at: new Date(timestamp || Date.now()),
        note: `Package delivered by KCD Logistics. Delivered by: ${deliveryData.deliveredBy || 'Unknown'}`,
        location: deliveryData.location || 'Delivered'
      };

      packageData.status = 'delivered';
      packageData.actualDelivery = new Date(deliveryData.deliveredAt || timestamp || Date.now());
      if (packageData.history) {
        packageData.history.push(historyEntry);
      } else {
        packageData.history = [historyEntry];
      }

      // Add delivery proof if provided
      if (deliveryData.signature || deliveryData.photoUrl) {
        (packageData as any).deliveryProof = {
          signature: deliveryData.signature,
          photoUrl: deliveryData.photoUrl,
          recipientName: recipient?.name || 'Unknown',
          deliveredAt: new Date(deliveryData.deliveredAt || Date.now())
        };
      }

      await packageData.save();

      logger.info(`Package delivered from KCD webhook: ${trackingNumber}`);

      successResponse(res, {
        trackingNumber,
        deliveredAt: packageData.actualDelivery,
        deliveryProof: (packageData as any).deliveryProof
      }, 'Package delivery confirmed successfully');

    } catch (error) {
      logger.error('Error processing KCD package delivered webhook:', error);
      errorResponse(res, 'Failed to process package delivery', 500);
    }
  }

  // Handle package deletion from KCD
  static async packageDeleted(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      // Support both camelCase and PascalCase (PDF format)
      const trackingNumber = req.body.trackingNumber || req.body.TrackingNumber;
      const courierCode = req.body.courierCode || req.body.CourierCode;
      const timestamp = req.body.timestamp || req.body.Timestamp;

      if (!trackingNumber || !courierCode) {
        errorResponse(res, 'Missing required fields: trackingNumber, courierCode', 400);
        return;
      }

      // Verify courier code matches the authenticated API key's courier code
      const authenticatedCourierCode = (req as any).apiKey?.courierCode;
      if (!authenticatedCourierCode || courierCode !== authenticatedCourierCode) {
        errorResponse(res, `Invalid courier code. Expected: ${authenticatedCourierCode}, Received: ${courierCode}`, 400);
        return;
      }

      // Find and delete the package
      const deletedPackage = await Package.findOneAndDelete({ trackingNumber });

      if (!deletedPackage) {
        logger.warn(`Package ${trackingNumber} not found for deletion`);
        errorResponse(res, `Package ${trackingNumber} not found`, 404);
        return;
      }

      logger.info(`Package ${trackingNumber} deleted via KCD webhook`);

      successResponse(res, {
        trackingNumber,
        deletedAt: timestamp || new Date(),
        message: 'Package deleted successfully'
      }, 'Package deleted successfully');

    } catch (error: any) {
      logger.error('Error processing package deletion webhook:', error);
      logger.error('Error details:', error?.message || 'Unknown error');
      errorResponse(res, `Failed to process package deletion: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  // Handle manifest creation from KCD
  static async manifestCreated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      // Support both camelCase and PascalCase (PDF format)
      const manifestId = req.body.manifestId || req.body.ManifestID || req.body.manifestID;
      const courierCode = req.body.courierCode || req.body.CourierCode || req.body.CourierID;
      const packageTrackingNumbers = req.body.packages || req.body.Packages;
      const departureDate = req.body.departureDate || req.body.DepartureDate;
      const arrivalDate = req.body.arrivalDate || req.body.ArrivalDate;
      const timestamp = req.body.timestamp || req.body.Timestamp;

      if (!manifestId || !courierCode || !packageTrackingNumbers || !Array.isArray(packageTrackingNumbers)) {
        errorResponse(res, 'Missing required fields: manifestId, courierCode, packages', 400);
        return;
      }

      // Verify courier code matches the authenticated API key's courier code
      const authenticatedCourierCode = (req as any).apiKey?.courierCode;
      if (!authenticatedCourierCode || courierCode !== authenticatedCourierCode) {
        errorResponse(res, `Invalid courier code. Expected: ${authenticatedCourierCode}, Received: ${courierCode}`, 400);
        return;
      }

      // Check if manifest already exists (using manifestNumber field)
      const existingManifest = await Manifest.findOne({ manifestNumber: manifestId });
      if (existingManifest) {
        errorResponse(res, `Manifest already exists: ${manifestId}`, 409);
        return;
      }

      // Find packages by tracking numbers to get their ObjectIds
      const packageDocs = await Package.find({ trackingNumber: { $in: packageTrackingNumbers } });
      
      if (packageDocs.length === 0) {
        errorResponse(res, 'No packages found with the provided tracking numbers', 404);
        return;
      }

      // Format packages for manifest (as array of objects with packageId and trackingNumber)
      const manifestPackages = packageDocs.map(pkg => ({
        packageId: pkg._id,
        trackingNumber: pkg.trackingNumber,
        status: 'pending' as const
      }));

      // Get API key record for createdBy
      const apiKeyRecord = (req as any).apiKey;
      const createdById = apiKeyRecord?.createdBy || new mongoose.Types.ObjectId();

      // Create new manifest with proper structure
      const newManifest = new Manifest({
        manifestNumber: manifestId,
        warehouseId: new mongoose.Types.ObjectId(), // Create a new ObjectId for warehouse
        packages: manifestPackages,
        status: 'draft', // Use valid enum value
        scheduledDate: departureDate ? new Date(departureDate) : new Date(),
        totalPackages: manifestPackages.length,
        deliveredPackages: 0,
        createdBy: createdById,
        createdAt: new Date(timestamp || Date.now()),
        updatedAt: new Date()
      });

      await newManifest.save();

      // Update all packages in manifest to link them
      await Package.updateMany(
        { trackingNumber: { $in: packageTrackingNumbers } },
        { 
          $set: { manifestId: newManifest._id },
          $push: {
            history: {
              status: 'in_transit',
              at: new Date(),
              note: `Added to manifest ${manifestId}`
            }
          }
        }
      );

      logger.info(`Manifest created from KCD webhook: ${manifestId} with ${manifestPackages.length} packages`);

      successResponse(res, {
        manifestId,
        manifestNumber: manifestId,
        packageCount: manifestPackages.length,
        departureDate,
        arrivalDate,
        manifestDbId: newManifest._id
      }, 'Manifest created successfully');

    } catch (error: any) {
      logger.error('Error processing KCD manifest created webhook:', error);
      logger.error('Error details:', error?.message || 'Unknown error');
      errorResponse(res, `Failed to process manifest creation: ${error?.message || 'Unknown error'}`, 500);
    }
  }

  // Test webhook connection
  static async testConnection(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      const { test, message } = req.body;

      logger.info('KCD webhook connection test received', { test, message });

      successResponse(res, {
        success: true,
        message: message || 'KCD webhook connection test successful',
        timestamp: new Date().toISOString(),
        server: 'Clean J Shipping Backend',
        version: '1.0.0'
      }, 'Connection test successful');

    } catch (error) {
      logger.error('Error in KCD webhook test:', error);
      errorResponse(res, 'Connection test failed', 500);
    }
  }
}
