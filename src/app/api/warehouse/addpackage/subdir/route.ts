// Warehouse Add Package Endpoint (Alternative)
// URL: /api/warehouse/addpackage/subdir
// Method: POST
// Uses API key authentication (x-warehouse-key header or id query parameter)

import { TasokoAuthenticator } from "@/lib/tasoko-auth";
import { TasokoRateLimiter } from "@/lib/tasoko-rate-limit";
import { TasokoResponseFormatter } from "@/lib/tasoko-response";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import User from "@/models/User";
import { startSession } from "mongoose";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
    },
  });
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 0;
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

export async function POST(request: Request) {
  try {
    // Extract and validate API token
    const token = TasokoAuthenticator.extractToken(request);
    if (!token) {
      const response = TasokoResponseFormatter.error(
        'API key required in headers (x-warehouse-key or x-api-key) or query parameter (id)',
        401
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Validate token against database
    const authResult = await TasokoAuthenticator.validateToken(token);
    if (!authResult.valid) {
      const response = TasokoResponseFormatter.error(
        authResult.error || 'Invalid API key',
        401
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Check permissions
    if (!TasokoAuthenticator.hasPermission(authResult.keyRecord, 'packages:write')) {
      const response = TasokoResponseFormatter.error(
        'Insufficient permissions (requires packages:write)',
        403
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    // Rate limiting
    const rateLimitResult = TasokoRateLimiter.isAllowed(authResult.keyRecord.keyPrefix);
    if (!rateLimitResult.allowed) {
      const response = TasokoResponseFormatter.error(
        'Rate limit exceeded',
        429,
        {
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          remaining: rateLimitResult.remaining
        }
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    await dbConnect();

    // Parse request body
    let packagesData: any[];
    try {
      packagesData = await request.json();
      if (!Array.isArray(packagesData)) {
        const response = TasokoResponseFormatter.error(
          'Request body must be an array of packages',
          400
        );
        return TasokoResponseFormatter.toJSON(response);
      }
    } catch (error) {
      const response = TasokoResponseFormatter.error(
        'Invalid JSON in request body',
        400
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    const session = await startSession();
    const results = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      await session.startTransaction();

      for (const pkgData of packagesData) {
        processed++;
        
        try {
          const {
            PackageID,
            CourierID,
            TrackingNumber,
            ControlNumber,
            FirstName,
            LastName,
            UserCode,
            Weight,
            Shipper,
            EntryDate,
            EntryDateTime,
            Branch,
            Description,
            Length,
            Width,
            Height,
            Pieces,
            PackageStatus
          } = pkgData;

          // Validate required fields
          if (!TrackingNumber || !UserCode) {
            results.push({
              package_id: PackageID || 'unknown',
              trackingNumber: TrackingNumber || 'unknown',
              ok: false,
              error: 'Missing required fields: TrackingNumber and UserCode'
            });
            failed++;
            continue;
          }

          // Check if customer exists
          const customer = await User.findOne({ 
            userCode: UserCode, 
            role: "customer" 
          }).session(session);

          if (!customer) {
            results.push({
              package_id: PackageID || 'unknown',
              trackingNumber: TrackingNumber,
              ok: false,
              error: 'Customer not found'
            });
            failed++;
            continue;
          }

          // Calculate shipping costs
          const weightNum = asNumber(Weight);
          const weightLbs = weightNum * 2.20462;
          const shippingCostJmd = calcShippingCostJmd(weightLbs);

          // Create or update package
          const packageData = {
            trackingNumber: TrackingNumber,
            userCode: UserCode,
            userId: customer._id,
            customer: customer._id,
            weight: weightNum,
            shipper: Shipper || '',
            description: Description || '',
            status: PackageStatus === 0 ? 'received' : PackageStatus === 1 ? 'in_transit' : PackageStatus === 2 ? 'at_local_port' : PackageStatus === 3 ? 'delivered' : 'unknown',
            branch: Branch || '',
            length: Length ? asNumber(Length) : undefined,
            width: Width ? asNumber(Width) : undefined,
            height: Height ? asNumber(Height) : undefined,
            pieces: Pieces ? asNumber(Pieces) : 1,
            controlNumber: ControlNumber || '',
            courierId: CourierID || '',
            entryDate: EntryDate ? new Date(EntryDate) : new Date(),
            entryDateTime: EntryDateTime ? new Date(EntryDateTime) : new Date(),
            shippingCost: shippingCostJmd,
            totalAmount: shippingCostJmd,
            paymentMethod: 'cash',
            packageType: 'parcel',
            serviceType: 'standard',
            deliveryType: 'door_to_door',
            weightUnit: 'kg',
            dimensionUnit: 'cm',
            itemQuantity: 1,
            history: [{
              status: PackageStatus === 0 ? 'received' : PackageStatus === 1 ? 'in_transit' : PackageStatus === 2 ? 'at_local_port' : PackageStatus === 3 ? 'delivered' : 'unknown',
              at: new Date(),
              note: 'Package added via warehouse API'
            }]
          };

          const pkg = await Package.findOneAndUpdate(
            { trackingNumber: TrackingNumber },
            { $set: packageData },
            { upsert: true, new: true, session }
          );

          // Populate customer information for response
          const populatedPkg = await Package.findById(pkg._id)
            .populate('customer', 'userCode firstName lastName email')
            .session(session);

          results.push({
            PackageID: populatedPkg._id,
            TrackingNumber: populatedPkg.trackingNumber,
            FirstName: customer.firstName,
            LastName: customer.lastName,
            UserCode: customer.userCode,
            Weight: populatedPkg.weight,
            Shipper: populatedPkg.shipper,
            Description: populatedPkg.description,
            EntryDate: populatedPkg.entryDate,
            EntryDateTime: populatedPkg.entryDateTime,
            Branch: populatedPkg.branch,
            PackageStatus: populatedPkg.status,
            PackagePayments: {
              totalAmount: populatedPkg.totalAmount,
              shippingCost: populatedPkg.shippingCost,
              storageFee: 0,
              customsDuty: 0,
              paymentStatus: populatedPkg.paymentStatus,
              paidAmount: populatedPkg.amountPaid || 0,
              balanceAmount: populatedPkg.totalAmount - (populatedPkg.amountPaid || 0)
            },
            customer: {
              _id: customer._id,
              userCode: customer.userCode,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email
            },
            daysInStorage: populatedPkg.entryDate ? Math.floor((Date.now() - populatedPkg.entryDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
            weightLbs: populatedPkg.weight * 2.20462,
            createdAt: populatedPkg.createdAt,
            updatedAt: populatedPkg.updatedAt,
            ok: true
          });
          successful++;

        } catch (error) {
          results.push({
            package_id: pkgData.PackageID || 'unknown',
            trackingNumber: pkgData.TrackingNumber || 'unknown',
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      await session.commitTransaction();

      const response = TasokoResponseFormatter.success({
        processed,
        successful,
        failed,
        results
      }, `${successful} packages added successfully`);

      return TasokoResponseFormatter.toJSON(response);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    const response = TasokoResponseFormatter.error(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return TasokoResponseFormatter.toJSON(response);
  }
}
