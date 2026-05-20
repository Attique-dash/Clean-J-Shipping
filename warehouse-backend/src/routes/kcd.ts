import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authKcdApiKey, AuthenticatedKcdRequest } from '../middleware/authKcd';
import { prepareKcdRequest } from '../middleware/prepareKcdRequest';
import { 
  addPackageValidation, 
  updatePackageValidation, 
  getCustomersValidation,
  handleValidationErrors 
} from '../validators/kcdValidators';
import { Package } from '../models/Package';
import { User } from '../models/User';
import { EmailService } from '../services/emailService';
import { isValidKcdEmail } from '../lib/kcd-user-code';
import {
  toKcdPackagePayload,
  packageBelongsToCourier,
} from '../lib/kcd-package-response';

const router = Router();

function packageStatusToWarehouseStatus(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (Number.isFinite(n)) {
    const map: Record<number, string> = {
      0: 'received',
      1: 'processing',
      2: 'in_transit',
      3: 'customs',
      4: 'delivered',
    };
    return map[n] ?? 'received';
  }
  return String(value).toLowerCase();
}

function buildKcdPackageUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  const weight = body.weight ?? body.Weight;
  if (weight !== undefined) updates.weight = Number(weight);

  const shipper = body.shipper ?? body.Shipper;
  if (shipper !== undefined) updates.shipper = String(shipper);

  const description = body.description ?? body.Description;
  if (description !== undefined) {
    updates.description = String(description);
    updates.itemDescription = String(description);
  }

  const status = packageStatusToWarehouseStatus(
    body.status ?? body.PackageStatus ?? body.Status
  );
  if (status) updates.status = status;

  const entryDate = body.entryDate ?? body.EntryDate ?? body.EntryDateTime;
  if (entryDate) updates.dateReceived = new Date(String(entryDate));

  const branch = body.branch ?? body.Branch;
  if (branch !== undefined) updates.branch = String(branch);

  const pieces = body.pieces ?? body.Pieces;
  if (pieces !== undefined) updates.pieces = Number(pieces);

  const manifestId = body.manifestId ?? body.ManifestID;
  if (manifestId !== undefined) updates.ManifestID = String(manifestId);

  const controlNumber = body.controlNumber ?? body.ControlNumber;
  if (controlNumber !== undefined) updates.ControlNumber = String(controlNumber);

  return updates;
}

function buildRecipientFromCustomer(
  customer: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    userCode?: string;
    address?: { street?: string };
  },
  incoming?: Record<string, unknown>
) {
  if (incoming && typeof incoming === 'object') {
    const row = { ...incoming } as Record<string, unknown>;
    const email = row.email;
    if (!isValidKcdEmail(email)) {
      delete row.email;
    }
    return row;
  }

  const recipient: Record<string, unknown> = {
    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
    phone: customer.phone || '',
    shippingId: customer.userCode,
    address: customer.address?.street || '',
  };
  if (isValidKcdEmail(customer.email)) {
    recipient.email = customer.email;
  }
  return recipient;
}

// Normalize array / Askenish proxy payloads before auth and validation
router.use(prepareKcdRequest);

// Middleware to normalize PascalCase (PDF format) fields to camelCase
const normalizePdfFields = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const fieldMappings: Record<string, string> = {
      'PackageID': 'packageId',
      'TrackingNumber': 'trackingNumber',
      'ControlNumber': 'controlNumber',
      'HouseNumber': 'houseNumber',
      'FirstName': 'firstName',
      'LastName': 'lastName',
      'UserCode': 'userCode',
      'Weight': 'weight',
      'Shipper': 'shipper',
      'EntryDate': 'entryDate',
      'EntryDateTime': 'entryDateTime',
      'EntryStaff': 'entryStaff',
      'Branch': 'branch',
      'Description': 'description',
      'Pieces': 'pieces',
      'Cubes': 'cubes',
      'Length': 'length',
      'Width': 'width',
      'Height': 'height',
      'PackageStatus': 'status',
      'Status': 'status',
      'CourierID': 'courierId',
      'ManifestID': 'manifestId',
      'CollectionID': 'collectionId',
      'Location': 'location',
      'Notes': 'notes',
      'CourierCode': 'courierCode',
      'APIToken': 'apiToken'
    };
    
    for (const [pascalCase, camelCase] of Object.entries(fieldMappings)) {
      if (req.body[pascalCase] !== undefined && req.body[camelCase] === undefined) {
        req.body[camelCase] = req.body[pascalCase];
      }
    }
  }
  next();
};

// ─────────────────────────────────────────────────────────────
// GET /api/kcd/customers  +  POST /api/kcd/customers
// Tasoko/Askenish proxy often uses POST for all outbound calls; support both.
// ─────────────────────────────────────────────────────────────
async function handleKcdCustomersList(
  req: AuthenticatedKcdRequest,
  res: Response
): Promise<void> {
  try {
    const { courierCode, limit = 50, offset = 0 } = req.query as any;

    const query: any = { role: 'customer' };

    if (courierCode) {
      query['shippingAddresses'] = {
        $elemMatch: { type: String(courierCode).toLowerCase() },
      };
    }

    const customers = await User.find(query)
      .select(
        'userCode firstName lastName email phone address mailboxNumber branch shippingAddresses'
      )
      .limit(Number(limit))
      .skip(Number(offset))
      .sort({ createdAt: -1 });

    await User.countDocuments(query);

    res.json(
      customers.map((customer) => ({
        UserCode: customer.userCode,
        FirstName: customer.firstName,
        LastName: customer.lastName,
        Email: customer.email,
        Phone: customer.phone || '',
        Branch: customer.branch || 'Down Town',
        MailboxNumber: customer.mailboxNumber,
        Address: customer.address,
      }))
    );
  } catch (error: any) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers',
      errorCode: 'KCD_CUSTOMERS_FAILED',
      error: error.message,
    });
  }
}

router.get(
  '/customers',
  authKcdApiKey,
  getCustomersValidation,
  handleValidationErrors,
  handleKcdCustomersList
);

router.post(
  '/customers',
  authKcdApiKey,
  getCustomersValidation,
  handleValidationErrors,
  handleKcdCustomersList
);

// ─────────────────────────────────────────────────────────────
// POST /api/kcd/packages/add
// Add a new package - complete warehouse fields
// ─────────────────────────────────────────────────────────────
router.post('/packages/add',
  authKcdApiKey,
  normalizePdfFields,
  addPackageValidation,
  handleValidationErrors,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      // Support both camelCase and PascalCase (PDF format) fields
      const body = req.body;
      
      const trackingNumber = body.trackingNumber || body.TrackingNumber;
      const userCode = body.userCode || body.UserCode;
      const weight = body.weight || body.Weight;
      const shipper = body.shipper || body.Shipper;
      const description = body.description || body.Description;
      const itemDescription = body.itemDescription || body.ItemDescription;
      const serviceMode = body.serviceMode || body.ServiceMode || 'local';
      const status = body.status || body.PackageStatus || body.Status || 'received';
      const dimensions = body.dimensions || body.Dimensions;
      const senderName = body.senderName || body.SenderName;
      const senderEmail = body.senderEmail || body.SenderEmail;
      const senderPhone = body.senderPhone || body.SenderPhone;
      const senderAddress = body.senderAddress || body.SenderAddress;
      const senderCountry = body.senderCountry || body.SenderCountry;
      const recipient = body.recipient || body.Recipient;
      const itemValue = body.itemValue || body.ItemValue;
      const specialInstructions = body.specialInstructions || body.SpecialInstructions;
      const isFragile = body.isFragile || body.IsFragile;
      const isHazardous = body.isHazardous || body.IsHazardous;
      const requiresSignature = body.requiresSignature || body.RequiresSignature;
      const customsRequired = body.customsRequired || body.CustomsRequired;
      const customsStatus = body.customsStatus || body.CustomsStatus;
      const entryDate = body.entryDate || body.EntryDate || body.EntryDateTime;

      const authenticatedCourierCode = req.courierCode;

      // Validate required fields
      if (!userCode) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'userCode', message: 'Customer code is required (userCode or UserCode)' }]
        });
        return;
      }

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
        recipient: buildRecipientFromCustomer(
          customer,
          recipient as Record<string, unknown> | undefined
        ),
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

      // Send email notification to customer
      try {
        if (customer.email) {
          await EmailService.sendPackagePreAlert(customer.email, {
            trackingNumber: finalTrackingNumber,
            shipper: shipper || 'Amazon',
            weight: weight || 0,
            mailboxNumber: customer.mailboxNumber || customer.userCode,
            customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
            receivedDate: entryDate ? new Date(entryDate) : new Date(),
            description: description || '',
            itemDescription: itemDescription || '',
            serviceMode: serviceMode || 'air',
            status: status || 'received',
            dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'cm' },
            warehouseLocation: 'KCD Main Warehouse'
          });
          console.log(`[KCD Webhook] Email sent to ${customer.email} for package ${finalTrackingNumber}`);
        }
      } catch (emailError) {
        console.error('[KCD Webhook] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }

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
      const isValidation =
        error?.name === 'ValidationError' || error?.message?.includes('validation failed');
      res.status(isValidation ? 400 : 500).json({
        success: false,
        message: isValidation ? 'Package validation failed' : 'Failed to add package',
        error: error.message,
        errorCode: isValidation ? 'KCD_PACKAGE_VALIDATION' : 'KCD_PACKAGE_FAILED',
        errors: error?.errors
          ? Object.entries(error.errors).map(([field, err]: [string, any]) => ({
              field,
              message: err?.message || String(err),
            }))
          : undefined,
        hint: isValidation
          ? 'Ensure UserCode exists in GET /api/kcd/customers and customer email is valid if recipient.email is set.'
          : undefined,
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
  normalizePdfFields,
  updatePackageValidation,
  handleValidationErrors,
  async (req: AuthenticatedKcdRequest, res: Response): Promise<void> => {
    try {
      const trackingNumber = String(req.params.trackingNumber || '')
        .trim()
        .toUpperCase();
      const body = (req.body || {}) as Record<string, unknown>;
      const authenticatedCourierCode = req.courierCode;

      const packageDoc = await Package.findOne({ trackingNumber });
      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found',
          TrackingNumber: trackingNumber,
          data: [],
        });
        return;
      }

      if (
        !packageBelongsToCourier(
          packageDoc.courierCode,
          authenticatedCourierCode
        )
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier',
          data: [],
        });
        return;
      }

      const updateData = buildKcdPackageUpdate(body);

      if (Object.keys(updateData).length === 0) {
        await packageDoc.populate('userId', 'firstName lastName email');
        const customer = packageDoc.userId as {
          firstName?: string;
          lastName?: string;
        } | null;
        res.json({
          success: true,
          message: 'Package found (no updates provided)',
          data: [
            toKcdPackagePayload(
              packageDoc.toObject() as Record<string, unknown>,
              customer
            ),
          ],
        });
        return;
      }

      if (updateData.status && updateData.status !== packageDoc.status) {
        const historyEntry = {
          timestamp: new Date(),
          status: updateData.status,
          location:
            (updateData.warehouseLocation as string) ||
            packageDoc.warehouseLocation ||
            'Warehouse',
          description: `Status updated to ${updateData.status}`,
        };
        await Package.findByIdAndUpdate(packageDoc._id, {
          $push: { trackingHistory: historyEntry },
        });
      }

      const updatedPackage = await Package.findOneAndUpdate(
        { trackingNumber },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email');

      if (!updatedPackage) {
        res.status(500).json({
          success: false,
          message: 'Failed to update package',
          data: [],
        });
        return;
      }

      const customer = updatedPackage.userId as {
        firstName?: string;
        lastName?: string;
      } | null;

      res.json({
        success: true,
        message: 'Package updated successfully',
        data: [
          toKcdPackagePayload(
            updatedPackage.toObject() as Record<string, unknown>,
            customer
          ),
        ],
      });
    } catch (error: any) {
      console.error('Update package error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update package',
        error: error.message,
        data: [],
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

      if (
        !packageBelongsToCourier(
          packageDoc.courierCode,
          authenticatedCourierCode
        )
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier',
          data: [],
        });
        return;
      }

      await packageDoc.populate('userId', 'firstName lastName email');
      const customer = packageDoc.userId as {
        firstName?: string;
        lastName?: string;
      } | null;
      const kcdSnapshot = toKcdPackagePayload(
        packageDoc.toObject() as Record<string, unknown>,
        customer
      );

      await Package.findByIdAndDelete(packageDoc._id);

      res.json({
        success: true,
        message: 'Package deleted successfully',
        data: [kcdSnapshot],
        deleted: {
          TrackingNumber: trackingNumber,
          deletedAt: new Date().toISOString(),
        },
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
      const body = (req.body || {}) as Record<string, unknown>;
      const items = body.items;
      const totalValue = body.totalValue ?? body.TotalValue;
      const currency = (body.currency as string) || 'USD';
      const weight = body.weight ?? body.Weight;
      const dimensions = body.dimensions ?? body.Dimensions;
      const specialInstructions =
        body.specialInstructions ?? body.SpecialInstructions;
      const customsDeclaration = body.customsDeclaration;
      const manifestIdFromBody = String(
        body.ManifestID || body.manifestId || ''
      ).trim();

      const authenticatedCourierCode = req.courierCode;
      const tn = String(trackingNumber || '').trim().toUpperCase();

      const packageDoc = await Package.findOne({ trackingNumber: tn });
      if (!packageDoc) {
        res.status(404).json({
          success: false,
          message: 'Package not found',
          TrackingNumber: tn,
          data: [],
        });
        return;
      }

      if (
        !packageBelongsToCourier(
          packageDoc.courierCode,
          authenticatedCourierCode
        )
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied: Package does not belong to this courier',
          data: [],
        });
        return;
      }

      const manifestObjectId = new Types.ObjectId();
      const setUpdates: Record<string, unknown> = {
        manifestId: manifestObjectId,
        ManifestID: manifestIdFromBody || manifestObjectId.toString(),
        ManifestCode: String(body.ManifestCode || body.manifestCode || ''),
        notes: `Manifest updated: ${JSON.stringify({
          items: items || [],
          totalValue: totalValue || 0,
          currency,
          updatedAt: new Date(),
          updatedBy: authenticatedCourierCode,
        })}`,
      };

      if (weight !== undefined) setUpdates.weight = Number(weight);
      if (dimensions) setUpdates.dimensions = dimensions;
      if (specialInstructions) {
        setUpdates.specialInstructions = String(specialInstructions);
      }
      if (customsDeclaration) {
        setUpdates.customsDeclaration = customsDeclaration;
      }

      const historyEntry = {
        timestamp: new Date(),
        status: packageDoc.status,
        location: packageDoc.warehouseLocation || 'Warehouse',
        description: 'Package manifest updated',
      };

      const updatedPackage = await Package.findByIdAndUpdate(
        packageDoc._id,
        {
          $set: setUpdates,
          $push: { trackingHistory: historyEntry },
        },
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email');

      const customer = updatedPackage?.userId as {
        firstName?: string;
        lastName?: string;
      } | null;

      const kcdPkg = toKcdPackagePayload(
        (updatedPackage?.toObject() || {}) as Record<string, unknown>,
        customer
      );
      if (manifestIdFromBody) {
        kcdPkg.ManifestID = manifestIdFromBody;
      }

      res.json({
        success: true,
        message: 'Package manifest updated successfully',
        data: [kcdPkg],
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
