// src/app/api/kcd/packages/[trackingNumber]/manifest/route.ts

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Package } from '@/models/Package';
import { validateKcdRequest } from '@/lib/kcd-auth';
import {
  trackingNumberQuery,
  validationFailedResponse,
} from '@/lib/kcd-package-validation';
import { toPublicKcdPackage, getDocTrackingNumber } from '@/lib/package-format';
import { kcdPackageSuccessResponse, kcdErrorResponse } from '@/lib/kcd-api-response';
import {
  parseKcdManifestBody,
  buildPackageManifestUpdates,
  linkPackagesToManifest,
  removePackageFromManifest,
  isManifestRemoveRequest,
} from '@/lib/kcd-manifest-handler';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kcd/packages/{trackingNumber}/manifest
 * Client format: { APIToken, CollectionCodes, PackageAWBs, Manifest: { ... } }
 * Remove: { RemoveFromManifest: true } or { Manifest: { ManifestID: "" } }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const trackingParam = decodeURIComponent(params.trackingNumber || '').trim();

  try {
    let body: unknown;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
    } catch {
      return validationFailedResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const payload = parseKcdManifestBody(
      Array.isArray(body) ? body[0] : body
    );

    const validation = await validateKcdRequest(req, payload);
    if (!validation.valid) {
      return kcdErrorResponse(`Unauthorized - ${validation.error}`, 401);
    }

    await dbConnect();

    const existingPackage = await Package.findOne(
      trackingNumberQuery(trackingParam)
    );

    if (!existingPackage) {
      return kcdErrorResponse('Package not found', 404, {
        TrackingNumber: trackingParam.toUpperCase(),
      });
    }

    const tn = getDocTrackingNumber(existingPackage.toObject());

    if (isManifestRemoveRequest(payload)) {
      await removePackageFromManifest(tn);
      const kcdPkg = toPublicKcdPackage(existingPackage.toObject());
      kcdPkg.ManifestID = '';
      kcdPkg.ManifestCode = '';
      return kcdPackageSuccessResponse(
        [kcdPkg],
        'Package removed from manifest successfully',
        200,
        { action: 'remove' }
      );
    }

    const manifestId = String(payload.Manifest?.ManifestID || '').trim();
    if (!manifestId) {
      return kcdErrorResponse('Manifest.ManifestID is required', 400);
    }

    const setUpdates = buildPackageManifestUpdates(payload, tn);
    const linkResult = await linkPackagesToManifest(payload, tn);

    const updatedPackage = await Package.findByIdAndUpdate(
      existingPackage._id,
      { $set: { ...setUpdates, updatedAt: new Date() } },
      { new: true }
    );

    const kcdPkg = toPublicKcdPackage(updatedPackage!.toObject());
    kcdPkg.ManifestID = manifestId;
    kcdPkg.ManifestCode = payload.Manifest?.ManifestCode || '';

    return kcdPackageSuccessResponse(
      [kcdPkg],
      'Package manifest updated successfully',
      200,
      { action: 'add', linkedPackages: linkResult }
    );
  } catch (error) {
    console.error(`[KCD Manifest ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
