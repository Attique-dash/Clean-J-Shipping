import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authKcdApiKey, AuthenticatedKcdRequest } from '../middleware/authKcd';
import { 
  addPackageValidation, 
  updatePackageValidation, 
  getCustomersValidation,
  handleValidationErrors 
} from '../validators/kcdValidators';
import { Package } from '../models/Package';
import { User } from '../models/User';

const router = Router();

// ─────────────────────────────────────────────────────────────
// GET /api/kcd/customers
// Get customers for the courier
// ─────────────────────────────────────────────────────────────
router.get('/customers', 
  authKcdApiKey,
  getCustomersValidation,
  handleValidationErrors,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { courierCode, limit = 50, offset = 0 } = req.query as any;
      const authenticatedCourierCode = req.courierCode;

      // Build query
      const query: any = { role: 'customer' };
      
      // Filter by courier code if provided
      if (courierCode) {
        query['shippingAddresses'] = { $elemMatch: { type: String(courierCode).toLowerCase() } };
      }

      const customers = await User.find(query)
        .select('userCode firstName lastName email phone address mailboxNumber branch shippingAddresses')
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json(customers.map(customer => ({
        UserCode: customer.userCode,
        FirstName: customer.firstName,
        LastName: customer.lastName,
        Email: customer.email,
        Phone: customer.phone || '',
        Branch: customer.branch || 'Down Town',
        MailboxNumber: customer.mailboxNumber,
        Address: customer.address
      })));
    } catch (error: any) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get customers',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/kcd/packages/add
// Add a new package - complete warehouse fields
// ─────────────────────────────────────────────────────────────
router.post('/packages/add',
  authKcdApiKey,
  addPackageValidation,
  handleValidationErrors,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const {
        trackingNumber,
        userCode,
        weight,
        shipper,
        description,
        itemDescription,
        serviceMode = 'local',
        status = 'received',
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
        customsStatus,
        entryDate
      } = req.body;

      const authenticatedCourierCode = req.courierCode;

      // Find the customer
      const customer = await User.findOne({ 
        userCode: userCode.toUpperCase(), 
        role: 'customer' 
      });

      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }

      // Generate tracking number if not provided
      const finalTrackingNumber = trackingNumber || (() => {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const generated = `TRK${timestamp}${random}`;
        return generated.substring(0, 20).toUpperCase();
      })();

      // Check if tracking number already exists
      const existingPackage = await Package.findOne({ trackingNumber: finalTrackingNumber });
      if (existingPackage) {
        res.status(409).json({
          success: false,
          message: 'Package with this tracking number already exists'
        });
        return;
      }

      // Create the package with complete warehouse fields
      const packageData: any = {
        trackingNumber: finalTrackingNumber,
        userCode: userCode.toUpperCase(),
        userId: customer._id,
        weight: weight || 0,
        shipper: shipper || 'Amazon',
        description: description || '',
        itemDescription: itemDescription || '',
        serviceMode,
        status,
        dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
        senderName: senderName || shipper || 'Amazon',
        senderEmail: senderEmail || '',
        senderPhone: senderPhone || '',
        senderAddress: senderAddress || '',
        senderCountry: senderCountry || '',
        recipient: recipient || {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone || '',
          shippingId: customer.userCode,
          address: customer.address?.street || ''
        },
        totalAmount: itemValue || 0,
        specialInstructions: specialInstructions || '',
        isFragile: isFragile || false,
        isHazardous: isHazardous || false,
        requiresSignature: requiresSignature || false,
        customsRequired: customsRequired || false,
        customsStatus: customsStatus || 'not_required',
        dateReceived: entryDate ? new Date(entryDate) : new Date(),
        source: 'kcd-packing-system',
        courierCode: authenticatedCourierCode,
        branch: customer.branch || 'Down Town',
        processedAt: new Date()
      };

      const newPackage = await Package.create(packageData);
      await newPackage.populate('userId', 'firstName lastName email phone mailboxNumber');

      // Add to tracking history
      const historyEntry = {
        timestamp: new Date(),
        status,
        location: 'Warehouse',
        description: `Package received from ${authenticatedCourierCode}`
      };
      
      newPackage.trackingHistory = newPackage.trackingHistory || [];
      newPackage.trackingHistory.push(historyEntry);
      await newPackage.save();

      res.status(201).json({
        success: true,
        message: 'Package added successfully',
        data: [{
          PackageID: newPackage._id.toString(),
          CourierID: newPackage._id.toString(),
          ManifestID: newPackage.manifestId?.toString() || '',
          CollectionID: newPackage.CollectionCode || '',
          TrackingNumber: newPackage.trackingNumber,
          ControlNumber: newPackage.ControlNumber || `EP${Math.random().toString().slice(2, 10)}`,
          FirstName: newPackage.recipient?.name?.split(' ')[0] || customer.firstName,
          LastName: newPackage.recipient?.name?.split(' ')[1] || customer.lastName,
          UserCode: newPackage.userCode,
          Weight: newPackage.weight,
          Shipper: newPackage.shipper || '',
          EntryStaff: newPackage.entryStaff || '',
          EntryDate: newPackage.dateReceived?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          EntryDateTime: newPackage.entryDateTime || newPackage.dateReceived?.toISOString() || new Date().toISOString(),
          Branch: customer.branch || 'Down Town',
          Claimed: newPackage.claimed || false,
          APIToken: '',
          ShowControls: newPackage.showControls || false,
          ManifestCode: newPackage.manifestId?.toString() || '',
          CollectionCode: newPackage.CollectionCode || '',
          Description: newPackage.description || '',
          HSCode: newPackage.hsCode || '',
          Unknown: newPackage.unknown || false,
          AIProcessed: newPackage.aiProcessed || false,
          OriginalHouseNumber: newPackage.originalHouseNumber || '',
          Cubes: newPackage.cubes || 0,
          Length: newPackage.dimensions?.length || 0,
          Width: newPackage.dimensions?.width || 0,
          Height: newPackage.dimensions?.height || 0,
          Pieces: newPackage.pieces || 1,
          Discrepancy: newPackage.discrepancy || false,
          DiscrepancyDescription: newPackage.discrepancyDescription || '',
          ServiceTypeID: newPackage.serviceTypeId || '',
          HazmatCodeID: newPackage.hazmatCodeId || '',
          Coloaded: newPackage.coloaded || false,
          ColoadIndicator: newPackage.coloadIndicator || ''
        }]
      });
    } catch (error: any) {
      console.error('Add package error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add package',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/kcd/packages
// Get all packages for courier
// ─────────────────────────────────────────────────────────────
router.get('/packages',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        status,
        userCode,
        startDate,
        endDate 
      } = req.query as any;
      
      const authenticatedCourierCode = req.courierCode;

      // Build query - include both KCD packages and admin packages
      const query: any = { 
        $or: [
          { courierCode: authenticatedCourierCode },
          { courierCode: 'ADMIN' },
          { courierCode: { $exists: false } }
        ]
      };
      
      // Add filters
      if (status) query.status = status;
      if (userCode) query.userCode = userCode.toUpperCase();
      if (startDate || endDate) {
        query.dateReceived = {};
        if (startDate) query.dateReceived.$gte = new Date(startDate as string);
        if (endDate) query.dateReceived.$lte = new Date(endDate as string);
      }

      const packages = await Package.find(query)
        .populate('userId', 'userCode firstName lastName email phone mailboxNumber')
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({ dateReceived: -1 });

      const total = await Package.countDocuments(query);

      res.json({
        success: true,
        message: 'Packages retrieved successfully',
        data: {
          packages: packages.map(pkg => ({
            PackageID: pkg._id.toString(),
            CourierID: pkg._id.toString(),
            TrackingNumber: pkg.trackingNumber,
            ControlNumber: pkg.ControlNumber || '',
            UserCode: pkg.userCode,
            Weight: pkg.weight,
            Shipper: pkg.shipper || '',
            EntryDate: pkg.dateReceived?.toISOString().split('T')[0] || '',
            EntryDateTime: pkg.dateReceived?.toISOString() || '',
            Branch: pkg.branch || 'Down Town',
            Status: pkg.status,
            Description: pkg.description || '',
            Length: pkg.dimensions?.length || 0,
            Width: pkg.dimensions?.width || 0,
            Height: pkg.dimensions?.height || 0,
            Pieces: pkg.pieces || 1,
            Cubes: pkg.cubes || 0,
            customer: pkg.userId,
            createdAt: pkg.createdAt,
            updatedAt: pkg.updatedAt
          })),
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: (Number(offset) + Number(limit)) < total
          }
        }
      });
    } catch (error: any) {
      console.error('Get packages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get packages',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/kcd/packages/:trackingNumber
// Update package by tracking number - complete warehouse fields (URL parameter)
// ─────────────────────────────────────────────────────────────
router.post('/packages/:trackingNumber',
  authKcdApiKey,
  updatePackageValidation,
  handleValidationErrors,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;
      const updateData = req.body;
      
      const authenticatedCourierCode = req.courierCode;

      // Find the package by tracking number
      const packageDoc = await Package.findOne({ trackingNumber });
      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      // Verify the package belongs to the authenticated courier or is admin package
      if (packageDoc.courierCode && 
          packageDoc.courierCode !== authenticatedCourierCode && 
          packageDoc.courierCode !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier'
        });
        return;
      }

      // If no update data provided, just return current package
      if (Object.keys(updateData).length === 0) {
        await packageDoc.populate('userId', 'firstName lastName email phone mailboxNumber');
        res.json({
          success: true,
          message: 'Current package data (no updates provided)',
          data: {
            package: packageDoc
          }
        });
        return;
      }

      // Add tracking history entry if status changed
      if (updateData.status && updateData.status !== packageDoc.status) {
        const historyEntry = {
          timestamp: new Date(),
          status: updateData.status,
          location: updateData.warehouseLocation || packageDoc.warehouseLocation || 'Warehouse',
          description: `Status updated to ${updateData.status}`
        };

        updateData.trackingHistory = packageDoc.trackingHistory || [];
        updateData.trackingHistory.push(historyEntry);
      }

      // Apply updates
      const updatedPackage = await Package.findOneAndUpdate(
        { trackingNumber },
        updateData,
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email phone mailboxNumber');

      if (!updatedPackage) {
        res.status(500).json({
          success: false,
          message: 'Failed to update package'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Package updated successfully',
        data: {
          package: updatedPackage,
          trackingNumber: updatedPackage.trackingNumber,
          status: updatedPackage.status,
          updatedAt: updatedPackage.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Update package error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update package',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/kcd/packages/:trackingNumber
// Get package details
// ─────────────────────────────────────────────────────────────
router.get('/packages/:trackingNumber',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;
      const authenticatedCourierCode = req.courierCode;

      // Find package by tracking number
      const packageDoc = await Package.findOne({ trackingNumber })
        .populate('userId', 'userCode firstName lastName email');

      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      // Verify package belongs to authenticated courier or is admin package
      if (packageDoc.courierCode && 
          packageDoc.courierCode !== authenticatedCourierCode && 
          packageDoc.courierCode !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          trackingNumber: packageDoc.trackingNumber,
          userCode: packageDoc.userCode,
          customer: packageDoc.userId,
          status: packageDoc.status,
          weight: packageDoc.weight,
          dimensions: packageDoc.dimensions,
          warehouseLocation: packageDoc.warehouseLocation,
          dateReceived: packageDoc.dateReceived,
          trackingHistory: packageDoc.trackingHistory,
          createdAt: packageDoc.createdAt,
          updatedAt: packageDoc.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Get package error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get package',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/kcd/packages/:trackingNumber
// Delete a package
// ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/kcd/packages/{trackingNumber}:
 *   delete:
 *     summary: Delete Package
 *     description: Delete a package by tracking number (requires KCD API key)
 *     tags: [KCD API]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Package tracking number
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Package deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     trackingNumber:
 *                       type: string
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid API key
 *       403:
 *         description: Forbidden - Package does not belong to this courier
 *       404:
 *         description: Package not found
 *       500:
 *         description: Internal server error
 */
router.post('/packages/:trackingNumber/delete',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;
      const authenticatedCourierCode = req.courierCode;

      // Find the package
      const packageDoc = await Package.findOne({ trackingNumber });
      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      // Verify the package belongs to the authenticated courier
      if (packageDoc.courierCode !== authenticatedCourierCode &&
          packageDoc.courierCode !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier'
        });
        return;
      }

      // Delete the package
      await Package.findByIdAndDelete(packageDoc._id);

      res.json({
        success: true,
        message: 'Package deleted successfully',
        data: {
          trackingNumber,
          deletedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Delete package error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete package',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// PUT /api/kcd/packages/:trackingNumber/manifest
// Update package manifest
// ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/kcd/packages/{trackingNumber}/manifest:
 *   put:
 *     summary: Update Package Manifest
 *     description: Update package manifest information (requires KCD API key)
 *     tags: [KCD API]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Package tracking number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: List of items in the package
 *               totalValue:
 *                 type: number
 *                 description: Total value of items
 *               currency:
 *                 type: string
 *                 default: "USD"
 *                 description: Currency code
 *               weight:
 *                 type: number
 *                 description: Package weight
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length:
 *                     type: number
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *                   unit:
 *                     type: string
 *                 description: Package dimensions
 *               specialInstructions:
 *                 type: string
 *                 description: Special handling instructions
 *               customsDeclaration:
 *                 type: object
 *                 description: Customs declaration information
 *     responses:
 *       200:
 *         description: Package manifest updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Package manifest updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     trackingNumber:
 *                       type: string
 *                     manifestId:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid API key
 *       403:
 *         description: Forbidden - Package does not belong to this courier
 *       404:
 *         description: Package not found
 *       500:
 *         description: Internal server error
 */
router.post('/packages/:trackingNumber/manifest',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const { trackingNumber } = req.params;
      const {
        items,
        totalValue,
        currency = 'USD',
        weight,
        dimensions,
        specialInstructions,
        customsDeclaration
      } = req.body;
      
      const authenticatedCourierCode = req.courierCode;

      // Find the package
      const packageDoc = await Package.findOne({ trackingNumber });
      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found'
        });
        return;
      }

      // Verify the package belongs to the authenticated courier
      if (packageDoc.courierCode !== authenticatedCourierCode &&
          packageDoc.courierCode !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier'
        });
        return;
      }

      // Update manifest information
      const updates: any = {
        manifestId: new Types.ObjectId(), // Generate new manifest ID
        specialInstructions: specialInstructions || packageDoc.specialInstructions,
        notes: `Manifest updated: ${JSON.stringify({
          items: items || [],
          totalValue: totalValue || 0,
          currency,
          updatedAt: new Date(),
          updatedBy: authenticatedCourierCode
        })}`
      };

      if (weight) updates.weight = weight;
      if (dimensions) updates.dimensions = dimensions;
      if (specialInstructions) updates.specialInstructions = specialInstructions;
      if (customsDeclaration) updates.customsDeclaration = customsDeclaration;

      // Add tracking history entry
      const historyEntry = {
        timestamp: new Date(),
        status: packageDoc.status,
        location: packageDoc.warehouseLocation || 'Unknown',
        description: 'Package manifest updated'
      };

      updates.$push = { trackingHistory: historyEntry };

      const updatedPackage = await Package.findByIdAndUpdate(
        packageDoc._id,
        updates,
        { new: true }
      );

      res.json({
        success: true,
        message: 'Package manifest updated successfully',
        data: {
          trackingNumber: updatedPackage?.trackingNumber,
          manifestId: updatedPackage?.manifestId,
          updatedAt: updatedPackage?.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Update manifest error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update package manifest',
        error: error.message
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/kcd/test
// Test endpoint for KCD portal validation
// ─────────────────────────────────────────────────────────────
router.post('/test',
  authKcdApiKey,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const authenticatedCourierCode = req.courierCode;
      
      res.json({
        success: true,
        message: 'KCD API connection test successful',
        data: {
          courierCode: authenticatedCourierCode,
          timestamp: new Date().toISOString(),
          server: 'Clean J Shipping Backend',
          version: '1.0.0',
          status: 'connected'
        }
      });
    } catch (error: any) {
      console.error('KCD test endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Test endpoint failed',
        error: error.message
      });
    }
  }
);

export default router;
