// src/app/api/tasoko/update-manifest/route.ts
// Tasoko Packing API — Update Manifest Endpoint
// URL: https://cleanjshipping.com/api/tasoko/update-manifest
// Method: POST
// Request: { APIToken, CollectionCodes, PackageAWBs, Manifest: { ManifestID, CourierID, ... } }

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { validateKcdRequest } from "@/lib/kcd-auth";
import { trackingNumberQuery } from "@/lib/kcd-package-validation";
import { toPublicKcdPackage, getDocTrackingNumber } from "@/lib/package-format";
import { kcdPackageSuccessResponse, kcdErrorResponse } from "@/lib/kcd-api-response";
import {
  parseKcdManifestBody,
  buildPackageManifestUpdates,
  linkPackagesToManifest,
  isManifestRemoveRequest,
} from "@/lib/kcd-manifest-handler";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasoko/update-manifest
 * Handles manifest updates in exact Tasoko Packing API format
 * { APIToken, CollectionCodes, PackageAWBs, Manifest: { ... } }
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    let body: unknown;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
    } catch {
      return kcdErrorResponse('Request body must be valid JSON', 400);
    }

    const payload = parseKcdManifestBody(
      Array.isArray(body) ? body[0] : body
    );

    const validation = await validateKcdRequest(req, payload);
    if (!validation.valid) {
      return kcdErrorResponse(`Unauthorized - ${validation.error}`, 401);
    }

    await dbConnect();

    const manifest = payload.Manifest || {};
    const manifestId = String(manifest.ManifestID || '').trim();
    const collectionCodes = (payload.CollectionCodes || []).filter(
      (c): c is string => typeof c === 'string' && c.trim().length > 0
    ).map(c => c.trim().toUpperCase());
    const packageAwbs = (payload.PackageAWBs || []).filter(
      (c): c is string => typeof c === 'string' && c.trim().length > 0
    ).map(c => c.trim().toUpperCase());

    let totalLinked = { linkedByTracking: 0, linkedByControl: 0 };
    const updatedPackages: ReturnType<typeof toPublicKcdPackage>[] = [];

    // Link packages by tracking number (PackageAWBs)
    if (packageAwbs.length > 0) {
      const setBase = {
        ManifestID: manifestId,
        ManifestCode: manifest.ManifestCode || '',
        updatedAt: new Date(),
      };

      const r = await Package.updateMany(
        { trackingNumber: { $in: packageAwbs } },
        { $set: setBase }
      );
      totalLinked.linkedByTracking = r.modifiedCount;
    }

    // Link packages by control number (CollectionCodes)
    if (collectionCodes.length > 0) {
      const setBase = {
        ManifestID: manifestId,
        ManifestCode: manifest.ManifestCode || '',
        updatedAt: new Date(),
      };

      const r = await Package.updateMany(
        {
          $or: [
            { controlNumber: { $in: collectionCodes } },
            { ControlNumber: { $in: collectionCodes } },
          ],
        },
        { $set: setBase }
      );
      totalLinked.linkedByControl = r.modifiedCount;
    }

    // Also update individual package manifest fields
    const allTrackingNumbers = [...new Set(packageAwbs)];
    for (const tn of allTrackingNumbers) {
      const pkg = await Package.findOne(trackingNumberQuery(tn));
      if (pkg) {
        const docTn = getDocTrackingNumber(pkg.toObject());
        const setUpdates = buildPackageManifestUpdates(payload, docTn);
        await Package.findByIdAndUpdate(pkg._id, {
          $set: { ...setUpdates, updatedAt: new Date() },
        });
        const updated = await Package.findById(pkg._id);
        if (updated) {
          updatedPackages.push(toPublicKcdPackage(updated.toObject()));
        }
      }
    }

    console.log(
      `[Tasoko UpdateManifest ${requestId}] Manifest ${manifestId}: ` +
      `${totalLinked.linkedByTracking} by tracking, ${totalLinked.linkedByControl} by control`
    );

    return NextResponse.json({
      success: true,
      message: 'Manifest updated successfully',
      data: updatedPackages,
      linked: totalLinked,
      manifest: {
        ManifestID: manifestId,
        ManifestCode: manifest.ManifestCode || '',
        ServiceTypeID: manifest.ServiceTypeID || '',
        ManifestStatus: manifest.ManifestStatus || '0',
        AWBNumber: manifest.AWBNumber || '',
        FlightDate: manifest.FlightDate || '',
        ItemCount: manifest.ItemCount || updatedPackages.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error(`[Tasoko UpdateManifest ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
