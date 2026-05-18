// src/app/api/kcd/packages/[trackingNumber]/delete/route.ts

import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import Invoice from "@/models/Invoice";
import { validateApiKey } from "@/lib/api-key-validation";
import { trackingNumberQuery } from "@/lib/kcd-package-validation";
import { getDocTrackingNumber } from "@/lib/package-format";
import { kcdPackageSuccessResponse, kcdErrorResponse } from "@/lib/kcd-api-response";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/kcd/packages/{trackingNumber}/delete
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  const requestId = crypto.randomUUID();
  const trackingParam = decodeURIComponent(params.trackingNumber || '').trim();

  try {
    let bodyToken: string | null = null;
    try {
      const rawBody = await req.text();
      const body = JSON.parse(rawBody);
      bodyToken = body?.token || null;
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
    } catch {
      // empty body is fine
    }

    const headerApiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(headerApiKey, bodyToken);
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

    const packageId = existingPackage._id;
    const tn = getDocTrackingNumber(existingPackage.toObject());
    const userCode = existingPackage.UserCode || existingPackage.userCode;

    try {
      await Invoice.deleteMany({
        $or: [
          { 'package.trackingNumber': tn },
          { packageId: packageId },
        ],
      });
    } catch (invoiceError) {
      console.error(`[KCD Delete ${requestId}] Failed to delete invoices:`, invoiceError);
    }

    await Package.findByIdAndDelete(packageId);

    return kcdPackageSuccessResponse(
      [],
      'Package deleted successfully',
      200,
      {
        deleted: {
          TrackingNumber: tn,
          UserCode: userCode,
        },
      }
    );
  } catch (error) {
    console.error(`[KCD Delete ${requestId}] Error:`, error);
    return kcdErrorResponse('Internal server error', 500, { requestId });
  }
}
