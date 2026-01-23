// Warehouse Delete Package Endpoint (Alternative)
// URL: /api/warehouse/deletepackage/subdir
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
            TrackingNumber,
            UserCode
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

          // Find and delete package
          const pkg = await Package.findOneAndDelete({
            trackingNumber: TrackingNumber,
            userCode: UserCode
          }).session(session);

          if (!pkg) {
            results.push({
              package_id: PackageID || 'unknown',
              trackingNumber: TrackingNumber,
              ok: false,
              error: 'Package not found'
            });
            failed++;
            continue;
          }

          results.push({
            package_id: pkg._id,
            trackingNumber: TrackingNumber,
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
      }, `${successful} packages deleted successfully`);

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
