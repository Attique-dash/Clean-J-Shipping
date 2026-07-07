// src/app/api/tasoko/add-package/route.ts
// Tasoko Packing API — Add Package Endpoint
// URL: https://cleanjshipping.com/api/tasoko/add-package
// Method: POST
// Request: [{PackageID, TrackingNumber, UserCode, Weight, Shipper, ...}]

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { sendNewPackageEmail } from "@/lib/email";
import { validateApiKey } from "@/lib/api-key-validation";
import {
  validateKcdRequest,
  parseKcdInboundPackages,
  applyApiTokenToPackages,
  kcdUnauthorizedResponse,
} from "@/lib/kcd-auth";
import { processKcdPackageAdd } from "@/lib/kcd-add-package-handler";
import {
  buildKcdPackageDocument,
  toPublicKcdPackage,
} from "@/lib/package-format";
import {
  validateAddPackageBody,
  validationFailedResponse,
  trackingNumberQuery,
  extractUserCode,
  extractTrackingNumber,
  normalizeKcdBody,
} from "@/lib/kcd-package-validation";
import {
  kcdPackageCreatedResponse,
  kcdErrorResponse,
} from "@/lib/kcd-api-response";
import crypto from "crypto";

/**
 * POST /api/tasoko/add-package
 * Receives package data in Tasoko Packing API format (PascalCase array)
 */
export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  console.log(`[Tasoko AddPackage ${requestId}] POST received at ${timestamp}`);

  try {
    let rawBody: string;
    let parsed: unknown;
    try {
      rawBody = await req.text();
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return validationFailedResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const { packages: inboundPackages, proxyToken } = parseKcdInboundPackages(parsed);

    const validation = await validateKcdRequest(req, parsed);
    if (!validation.valid || !validation.token) {
      console.error(`[Tasoko AddPackage ${requestId}] Auth failed:`, validation.error);
      return NextResponse.json(kcdUnauthorizedResponse(validation), { status: 401 });
    }

    const token = validation.token;

    let packagesToProcess = inboundPackages;
    if (packagesToProcess.length === 0 && parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (!obj.content && !obj.method && !obj.url) {
        packagesToProcess = [obj];
      }
    }
    if (packagesToProcess.length === 0) {
      return validationFailedResponse([
        { field: 'body', message: 'Expected a Tasoko package object or array of packages' },
      ]);
    }
    packagesToProcess = applyApiTokenToPackages(packagesToProcess, token);

    const createdPackages: ReturnType<typeof toPublicKcdPackage>[] = [];
    let lastNotifications = { preAlertCreated: false, emailSent: false, invoiceCreated: false };

    for (const pkgBody of packagesToProcess) {
      const result = await processKcdPackageAdd(pkgBody, requestId);
      if (!result.ok) {
        return NextResponse.json(result.body, { status: result.status });
      }
      createdPackages.push(result.package);
      lastNotifications = result.notifications;
    }

    console.log(`[Tasoko AddPackage ${requestId}] Created ${createdPackages.length} package(s)`);
    return kcdPackageCreatedResponse(createdPackages, { notifications: lastNotifications });

  } catch (error) {
    console.error(`[Tasoko AddPackage ${requestId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key')) {
      let duplicateField = 'unknown field';
      if (errorMessage.includes('trackingNumber')) duplicateField = 'tracking number';
      else if (errorMessage.includes('UserCode')) duplicateField = 'user code';

      return NextResponse.json({
        success: false,
        message: `A package with this ${duplicateField} already exists`,
        error: `Duplicate ${duplicateField}`,
        errorCode: 'DUPLICATE_KEY',
        data: [],
      }, { status: 409 });
    }

    return kcdErrorResponse('Internal server error', 500, {
      requestId,
      errorCode: 'TASOKO_INTERNAL_ERROR',
      error: errorMessage,
    });
  }
}

/**
 * GET /api/tasoko/add-package
 * Some Tasoko systems send data via GET with query params
 */
export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  console.log(`[Tasoko AddPackage ${requestId}] GET received at ${timestamp}`);

  try {
    const { searchParams } = new URL(req.url);

    const queryBody = normalizeKcdBody(
      Object.fromEntries(searchParams.entries()) as Record<string, unknown>
    );

    // Merge ?content= JSON if present
    const contentParam = searchParams.get('content');
    if (contentParam) {
      try {
        const parsedContent = JSON.parse(contentParam) as Record<string, unknown>;
        Object.assign(queryBody, normalizeKcdBody(parsedContent));
      } catch { /* ignore */ }
    }

    let getValidation = validateAddPackageBody(queryBody);
    const normalizedBody = getValidation.ok ? getValidation.normalized : queryBody;
    let trackingNumber = extractTrackingNumber(normalizedBody);
    let userCodeFromQuery = extractUserCode(normalizedBody);
    const houseNumber = queryBody.ControlNumber;
    const weight = queryBody.Weight;
    const shipper = queryBody.Shipper;
    const receivedAt = queryBody.EntryDateTime || queryBody.EntryDate;
    const description = queryBody.Description;
    const firstName = queryBody.FirstName;
    const lastName = queryBody.LastName;

    const validation = await validateKcdRequest(req, queryBody);
    if (!validation.valid || !validation.token) {
      return NextResponse.json(kcdUnauthorizedResponse(validation), { status: 401 });
    }

    if (!getValidation.ok) {
      return NextResponse.json({
        success: false,
        message: 'GET request received with no package data. Include TrackingNumber and UserCode in URL params.',
        errors: getValidation.errors,
        hint: 'Example: GET /api/tasoko/add-package?id=YOUR_API_KEY&TrackingNumber=TBA123&UserCode=CLEAN-0007&Weight=5&Shipper=Amazon',
        data: [],
      }, { status: 400 });
    }

    await dbConnect();

    const userCode = userCodeFromQuery;
    const user = await User.findOne({ userCode });

    if (!user) {
      return NextResponse.json({ error: "User not found", userCode }, { status: 404 });
    }

    const existingPackage = await Package.findOne(trackingNumberQuery(trackingNumber));
    if (existingPackage) {
      return NextResponse.json(
        { error: "Package already exists", trackingNumber, packageId: existingPackage._id },
        { status: 409 }
      );
    }

    const weightNum = typeof weight === 'number' ? weight : Number(weight) || 0;
    const receivedDate = receivedAt ? new Date(String(receivedAt)) : new Date();

    const packageData = buildKcdPackageDocument(
      {
        TrackingNumber: trackingNumber,
        ControlNumber: houseNumber,
        FirstName: firstName,
        LastName: lastName,
        UserCode: userCode,
        Weight: weightNum,
        Shipper: shipper,
        EntryDate: receivedDate,
        EntryDateTime: receivedDate,
        Branch: 'KCD Main Warehouse',
        Description: description,
        EntryStaff: 'Tasoko Webhook',
      },
      user,
      {
        source: 'tasoko_webhook',
        sourceDetails: {
          syncedAt: new Date(),
          syncStatus: 'synced',
          apiEndpoint: '/api/tasoko/add-package',
        },
      }
    );

    const createdPackage = await Package.create(packageData);
    console.log(`[Tasoko AddPackage ${requestId}] Package created: ${createdPackage._id}`);

    let emailSent = false;
    try {
      if (user.email) {
        const kcdGetPkg = toPublicKcdPackage(createdPackage.toObject());
        
        // Get warehouse addresses from database
        let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
        try {
          const { Warehouse } = await import('@/models/Warehouse');
          const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
            .select('airAddress seaAddress chinaAddress address')
            .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string } | null;
          if (defaultWarehouse) {
            warehouseAddresses = {
              airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
              seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
              chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
            };
          }
        } catch (whError) {
          console.error(`[Tasoko AddPackage ${requestId}] Failed to fetch warehouse addresses:`, whError);
        }
        
        await sendNewPackageEmail({
          to: user.email,
          firstName: user.firstName || "Customer",
          trackingNumber: kcdGetPkg.TrackingNumber,
          status: String(kcdGetPkg.PackageStatus ?? 0),
          weight: kcdGetPkg.Weight ?? 0,
          shipper: kcdGetPkg.Shipper || 'KCD Logistics',
          warehouse: kcdGetPkg.Branch || "KCD Main Warehouse",
          receivedDate: kcdGetPkg.EntryDate ? new Date(kcdGetPkg.EntryDate) : new Date(),
          description: kcdGetPkg.Description || `Package from ${shipper || 'KCD'}`,
          warehouseAddresses,
          userCode: user.userCode,
        });
        emailSent = true;
      }
    } catch (emailError) {
      console.error(`[Tasoko AddPackage ${requestId}] Email failed:`, emailError);
    }

    const kcdGetResponse = toPublicKcdPackage(createdPackage.toObject());
    return kcdPackageCreatedResponse([kcdGetResponse], {
      message: 'Package created successfully via GET',
      notifications: { emailSent },
    });

  } catch (error) {
    console.error(`[Tasoko AddPackage ${requestId}] Error:`, error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
