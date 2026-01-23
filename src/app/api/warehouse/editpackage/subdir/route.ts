// Warehouse Edit Package Endpoint
// URL: /api/warehouse/editpackage/subdir
// Method: POST
// Accepts array of package objects with complete warehouse data structure

import { TasokoAuthenticator } from "@/lib/tasoko-auth";
import { TasokoRateLimiter } from "@/lib/tasoko-rate-limit";
import { TasokoResponseFormatter } from "@/lib/tasoko-response";
import { TasokoValidator, type PackagePayload } from "@/lib/tasoko-validators";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { startSession } from "mongoose";

interface WarehousePackage {
  PackageID: string;
  CourierID: string;
  ManifestID: string;
  CollectionID: string;
  TrackingNumber: string;
  ControlNumber: string;
  FirstName: string;
  LastName: string;
  UserCode: string;
  Weight: number;
  Shipper: string;
  EntryStaff: string;
  EntryDate: string;
  EntryDateTime: string;
  Branch: string;
  Claimed: boolean;
  APIToken: string;
  ShowControls: boolean;
  Description: string;
  HSCode: string;
  Unknown: boolean;
  AIProcessed: boolean;
  OriginalHouseNumber: string;
  Cubes: number;
  Length: number;
  Width: number;
  Height: number;
  Pieces: number;
  Discrepancy: boolean;
  DiscrepancyDescription: string;
  ServiceTypeID: string;
  HazmatCodeID: string;
  Coloaded: boolean;
  ColoadIndicator: string;
  PackageStatus: number;
  PackagePayments: string;
}

export async function POST(req: Request) {
  const requestId = Date.now().toString(36);
  
  try {
    // Extract and validate API token
    const token = TasokoAuthenticator.extractToken(req);
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

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const response = TasokoResponseFormatter.error('Invalid JSON payload', 400);
      return TasokoResponseFormatter.toJSON(response);
    }

    // Validate request body is array
    if (!Array.isArray(body)) {
      const response = TasokoResponseFormatter.error(
        'Request body must be an array of package objects',
        400
      );
      return TasokoResponseFormatter.toJSON(response);
    }

    await dbConnect();
    const results: { trackingNumber?: string; ok: boolean; error?: string; package_id?: string }[] = [];
    const session = await startSession();

    try {
      await session.startTransaction();

      for (const packageData of body as WarehousePackage[]) {
        try {
          // Validate required fields
          const trackingNumber = String(packageData.TrackingNumber || "").trim();
          const userCode = String(packageData.UserCode || "").trim();

          if (!trackingNumber || !userCode) {
            results.push({ ok: false, error: "Missing TrackingNumber or UserCode" });
            continue;
          }

          // Check if customer exists
          const customer = await User.findOne({ 
            userCode, 
            role: "customer" 
          })
          .session(session)
          .select("_id userCode email firstName lastName");
          
          if (!customer) {
            results.push({ trackingNumber, ok: false, error: `Customer not found: ${userCode}` });
            continue;
          }

          // Find existing package
          const existingPackage = await Package.findOne({ 
            trackingNumber 
          }).session(session);
          
          if (!existingPackage) {
            results.push({ trackingNumber, ok: false, error: `Package not found: ${trackingNumber}` });
            continue;
          }

          // Prepare update data
          const updateData: Partial<IPackage> = {
            updatedAt: new Date(),
            history: [
              ...(existingPackage.history || []),
              {
                status: existingPackage.status,
                at: new Date(),
                note: `Updated via warehouse integration - PackageID: ${packageData.PackageID}`,
              }
            ]
          };

          // Update fields if provided
          if (packageData.Weight !== undefined) updateData.weight = packageData.Weight;
          if (packageData.Description !== undefined) updateData.description = packageData.Description;
          if (packageData.Shipper !== undefined) updateData.shipper = packageData.Shipper;
          if (packageData.Branch !== undefined) updateData.branch = packageData.Branch;
          if (packageData.PackageStatus !== undefined) {
            const statusMap: { [key: number]: string } = {
              0: 'At Warehouse',
              1: 'in_transit', 
              2: 'customs_pending',
              3: 'delivered',
              4: 'pending'
            };
            updateData.status = statusMap[packageData.PackageStatus] as any || 'At Warehouse';
          }

          // Update dimensions if provided
          if (packageData.Length !== undefined) updateData.length = packageData.Length;
          if (packageData.Width !== undefined) updateData.width = packageData.Width;
          if (packageData.Height !== undefined) updateData.height = packageData.Height;
          if (packageData.Cubes !== undefined) updateData.cubes = packageData.Cubes;
          if (packageData.Pieces !== undefined) updateData.pieces = packageData.Pieces;

          // Update warehouse specific fields
          if (packageData.EntryStaff !== undefined) updateData.entryStaff = packageData.EntryStaff;
          if (packageData.HSCode !== undefined) updateData.hsCode = packageData.HSCode;
          if (packageData.ManifestID !== undefined) updateData.manifestId = packageData.ManifestID;
          if (packageData.ControlNumber !== undefined) updateData.controlNumber = packageData.ControlNumber;
          if (packageData.CourierID !== undefined) updateData.courierId = packageData.CourierID;
          if (packageData.CollectionID !== undefined) updateData.collectionId = packageData.CollectionID;

          // Update flags
          if (packageData.Claimed !== undefined) updateData.claimed = packageData.Claimed;
          if (packageData.Unknown !== undefined) updateData.unknown = packageData.Unknown;
          if (packageData.AIProcessed !== undefined) updateData.aiProcessed = packageData.AIProcessed;
          if (packageData.Discrepancy !== undefined) updateData.discrepancy = packageData.Discrepancy;
          if (packageData.DiscrepancyDescription !== undefined) {
            updateData.discrepancyDescription = packageData.DiscrepancyDescription;
          }
          if (packageData.Coloaded !== undefined) updateData.coloaded = packageData.Coloaded;
          if (packageData.ColoadIndicator !== undefined) {
            updateData.coloadIndicator = packageData.ColoadIndicator;
          }

          // Update the package
          const updatedPackage = await Package.findByIdAndUpdate(
            existingPackage._id,
            { $set: updateData },
            { new: true, session }
          );

          results.push({ 
            trackingNumber, 
            ok: true,
            package_id: updatedPackage!._id.toString()
          });

        } catch (error: any) {
          results.push({ 
            trackingNumber: packageData.TrackingNumber,
            ok: false, 
            error: error?.message || "Unknown error" 
          });
        }
      }

      await session.commitTransaction();

      const successCount = results.filter(r => r.ok).length;
      const response = TasokoResponseFormatter.success(
        {
          processed: results.length,
          successful: successCount,
          failed: results.length - successCount,
          results
        },
        `${successCount} packages updated successfully`
      );

      return TasokoResponseFormatter.toJSON(response, 200);

    } catch (error) {
      await session.abortTransaction();
      const response = TasokoResponseFormatter.error(
        'Transaction failed',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return TasokoResponseFormatter.toJSON(response);
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

// OPTIONS handler for CORS
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
    },
  });
}
