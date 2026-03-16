import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Package } from '../../models/Package';
import { Manifest } from '../../models/Manifest';
import { User } from '../../models/User';
import { ApiKey } from '../../models/ApiKey';
import { successResponse, errorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface KCDWebhookRequest extends AuthRequest {
  body: {
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
  };
}

export class KCDWebhookController {
  
  // Handle package creation from KCD
  static async packageCreated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      const { trackingNumber, courierCode, packageData, timestamp } = req.body;

      if (!trackingNumber || !courierCode || !packageData) {
        errorResponse(res, 'Missing required fields: trackingNumber, courierCode, packageData', 400);
        return;
      }

      // Verify courier code matches the authenticated API key's courier code
      const authenticatedCourierCode = (req as any).apiKey?.courierCode;
      if (!authenticatedCourierCode || courierCode !== authenticatedCourierCode) {
        errorResponse(res, `Invalid courier code. Expected: ${authenticatedCourierCode}, Received: ${courierCode}`, 400);
        return;
      }

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
        userCode: packageData.userCode || authenticatedCourierCode,
        userId: customer._id,
        status: 'received',
        dateReceived: new Date(timestamp || Date.now()),
        source: 'kcd-packing-system',
        courierCode: authenticatedCourierCode,
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

    } catch (error) {
      logger.error('Error processing KCD package created webhook:', error);
      errorResponse(res, 'Failed to process package creation', 500);
    }
  }

  // Handle package status updates from KCD
  static async packageUpdated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      const { trackingNumber, status, location, notes, timestamp } = req.body;

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

    } catch (error) {
      logger.error('Error processing KCD package updated webhook:', error);
      errorResponse(res, 'Failed to process package update', 500);
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
      const { trackingNumber, courierCode, timestamp } = req.body;

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

    } catch (error) {
      logger.error('Error processing package deletion webhook:', error);
      errorResponse(res, 'Failed to process package deletion', 500);
    }
  }

  // Handle manifest creation from KCD
  static async manifestCreated(req: KCDWebhookRequest, res: Response): Promise<void> {
    try {
      const { manifestId, courierCode, packages, departureDate, arrivalDate, timestamp } = req.body;

      if (!manifestId || !courierCode || !packages || !Array.isArray(packages)) {
        errorResponse(res, 'Missing required fields: manifestId, courierCode, packages', 400);
        return;
      }

      // Verify courier code matches the authenticated API key's courier code
      const authenticatedCourierCode = (req as any).apiKey?.courierCode;
      if (!authenticatedCourierCode || courierCode !== authenticatedCourierCode) {
        errorResponse(res, `Invalid courier code. Expected: ${authenticatedCourierCode}, Received: ${courierCode}`, 400);
        return;
      }

      // Check if manifest already exists
      const existingManifest = await Manifest.findOne({ manifestId });
      if (existingManifest) {
        errorResponse(res, `Manifest already exists: ${manifestId}`, 409);
        return;
      }

      // Create new manifest
      const newManifest = new Manifest({
        manifestId,
        courierCode,
        packages,
        departureDate: departureDate ? new Date(departureDate) : new Date(),
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        status: 'created',
        createdAt: new Date(timestamp || Date.now())
      });

      await newManifest.save();

      // Update all packages in manifest to link them
      await Package.updateMany(
        { trackingNumber: { $in: packages } },
        { 
          manifestId: newManifest._id,
          status: 'in_transit',
          $push: {
            history: {
              status: 'in_transit',
              at: new Date(),
              note: `Added to manifest ${manifestId}`
            }
          }
        }
      );

      logger.info(`Manifest created from KCD webhook: ${manifestId} with ${packages.length} packages`);

      successResponse(res, {
        manifestId,
        packageCount: packages.length,
        departureDate,
        arrivalDate,
        manifestDbId: newManifest._id
      }, 'Manifest created successfully');

    } catch (error) {
      logger.error('Error processing KCD manifest created webhook:', error);
      errorResponse(res, 'Failed to process manifest creation', 500);
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
