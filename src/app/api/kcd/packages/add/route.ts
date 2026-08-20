// src/app/api/kcd/packages/add/route.ts
// KCD Logistics webhook endpoint for receiving package notifications

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import Invoice from "@/models/Invoice";
import { InventoryService } from "@/lib/inventory-service";
import { CurrencyService } from "@/lib/currency-service";
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

// Simple in-memory request log for debugging (resets on deployment)
const requestLogs: Array<{
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  responseStatus: number;
  error?: string;
}> = [];

const MAX_LOGS = 100;

function addLog(log: typeof requestLogs[0]) {
  requestLogs.unshift(log);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.pop();
  }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Helper to format mailbox code as CLEANXXXX
function formatMailboxCode(userCode: string): string {
  const cleanCode = userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleanCode.startsWith("CLEAN") ? cleanCode : `CLEAN${cleanCode.slice(0, 4)}`;
}

/**
 * POST /api/kcd/packages/add
 * KCD Logistics webhook endpoint for receiving package notifications
 */
export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  
  console.log(`[KCD Webhook ${requestId}] Received request at ${timestamp}`);
  
  try {
    // Collect request details for logging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Don't log the actual API key, just indicate presence
      if (key.toLowerCase() === 'x-api-key') {
        headers[key] = '[REDACTED]';
      } else {
        headers[key] = value;
      }
    });
    
    console.log(`[KCD Webhook ${requestId}] Headers:`, JSON.stringify(headers, null, 2));
    
    let rawBody: string;
    let parsed: unknown;
    try {
      rawBody = await req.text();
      parsed = rawBody ? JSON.parse(rawBody) : {};
      console.log(`[KCD Webhook ${requestId}] Body parsed (array or object)`);
    } catch {
      addLog({
        timestamp,
        method: 'POST',
        headers,
        body: null,
        responseStatus: 400,
        error: 'Invalid JSON body',
      });
      return validationFailedResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const { packages: inboundPackages, proxyToken } =
      parseKcdInboundPackages(parsed);

    const validation = await validateKcdRequest(req, parsed);
    if (!validation.valid || !validation.token) {
      console.error(
        `[KCD Webhook ${requestId}] Auth failed:`,
        validation.error,
        validation.authChecked
      );
      addLog({
        timestamp,
        method: 'POST',
        headers,
        body: parsed,
        responseStatus: 401,
        error: validation.error || 'Invalid API key',
      });
      return NextResponse.json(kcdUnauthorizedResponse(validation), {
        status: 401,
      });
    }

    const token = validation.token;
    console.log(
      `[KCD Webhook ${requestId}] API key validated (${(validation.key as { name?: string })?.name || 'env'})${
        validation.usedEnvFallback ? ' [env fallback for Askenish POST webhook]' : ''
      }`
    );

    let packagesToProcess = inboundPackages;
    if (packagesToProcess.length === 0 && parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (!obj.content && !obj.method && !obj.url) {
        packagesToProcess = [obj];
      }
    }
    if (packagesToProcess.length === 0) {
      return validationFailedResponse([
        {
          field: 'body',
          message:
            'Expected a KCD package object or array of packages (Tasoko/Askenish format)',
        },
      ]);
    }
    packagesToProcess = applyApiTokenToPackages(packagesToProcess, token);

    const createdPackages: ReturnType<typeof toPublicKcdPackage>[] = [];
    let lastNotifications = {
      preAlertCreated: false,
      emailSent: false,
      invoiceCreated: false,
    };

    for (const pkgBody of packagesToProcess) {
      const result = await processKcdPackageAdd(pkgBody, requestId);
      if (!result.ok) {
        addLog({
          timestamp,
          method: 'POST',
          headers,
          body: pkgBody,
          responseStatus: result.status,
          error: String(result.body.message || 'Failed'),
        });
        return NextResponse.json(result.body, { status: result.status });
      }
      createdPackages.push(result.package);
      lastNotifications = result.notifications;
    }

    addLog({
      timestamp,
      method: 'POST',
      headers,
      body: parsed,
      responseStatus: 201,
    });

    console.log(
      `[KCD Webhook ${requestId}] Created ${createdPackages.length} package(s)`
    );

    return kcdPackageCreatedResponse(createdPackages, {
      notifications: lastNotifications,
    });
    
  } catch (error) {
    console.error(`[KCD Webhook ${requestId}] Unexpected error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for MongoDB duplicate key error
    if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key')) {
      let duplicateField = 'unknown field';
      if (errorMessage.includes('trackingNumber')) {
        duplicateField = 'tracking number';
      } else if (errorMessage.includes('UserCode')) {
        duplicateField = 'user code';
      }
      
      const log = {
        timestamp,
        method: 'POST',
        headers: {},
        body: null,
        responseStatus: 409,
        error: `Duplicate ${duplicateField}`
      };
      addLog(log);
      
      return NextResponse.json({
        success: false,
        message: `A package with this ${duplicateField} already exists`,
        error: `Duplicate ${duplicateField}`,
        errorCode: 'DUPLICATE_KEY',
        data: []
      }, { status: 409 });
    }
    
    const log = {
      timestamp,
      method: 'POST',
      headers: {},
      body: null,
      responseStatus: 500,
      error: errorMessage
    };
    addLog(log);
    
    return kcdErrorResponse('Internal server error', 500, {
      requestId,
      errorCode: 'KCD_INTERNAL_ERROR',
      error: errorMessage,
    });
  }
}

/**
 * GET /api/kcd/packages/add
 * Primary endpoint for KCD GET requests (with query params)
 * Also serves as debug endpoint for viewing logs
 */
export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  
  // Check if this is a debug/log request (has x-api-key header)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    // Debug mode - return logs
    try {
      const validation = await validateApiKey(apiKey, null);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Unauthorized - ${validation.error}` },
          { status: 401 }
        );
      }
      return NextResponse.json({
        logs: requestLogs,
        count: requestLogs.length,
        maxLogs: MAX_LOGS,
        serverTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
  
  // Package creation mode - handle KCD GET requests
  console.log(`[KCD Webhook ${requestId}] Received GET request at ${timestamp}`);
  
  try {
    // Get data from query parameters (KCD sends data in URL for GET requests)
    const { searchParams } = new URL(req.url);
    
    const queryBody = normalizeKcdBody(
      Object.fromEntries(searchParams.entries()) as Record<string, unknown>
    );

    // Merge ?content= JSON (Askenish GET webhook) into query body
    const contentParam = searchParams.get('content');
    if (contentParam) {
      try {
        const parsedContent = JSON.parse(contentParam) as Record<string, unknown>;
        Object.assign(queryBody, normalizeKcdBody(parsedContent));
      } catch {
        /* ignore invalid content JSON */
      }
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

    console.log(`[KCD Webhook ${requestId}] Query params:`, {
      trackingNumber,
      UserCode: userCodeFromQuery,
      houseNumber,
      weight,
      shipper,
      queryKeys: [...searchParams.keys()],
    });

    // Log the request
    const log = {
      timestamp,
      method: 'GET',
      headers: Object.fromEntries(req.headers.entries()),
      body: Object.fromEntries(searchParams.entries()),
      responseStatus: 0,
      error: undefined as string | undefined,
    };

    // Same auth as POST: ?id=, headers, env KCD_API_KEY fallback for Askenish
    const validation = await validateKcdRequest(req, queryBody);
    if (!validation.valid || !validation.token) {
      console.error(
        `[KCD Webhook ${requestId}] API key validation failed:`,
        validation.error
      );
      log.responseStatus = 401;
      log.error = validation.error || 'Invalid API key';
      addLog(log);
      return NextResponse.json(kcdUnauthorizedResponse(validation), {
        status: 401,
      });
    }
    
    if (!getValidation.ok) {
      log.responseStatus = 400;
      log.error = getValidation.errors.map((e) => e.message).join('; ');
      addLog(log);
      const missingData =
        !trackingNumber && !userCodeFromQuery;
      return NextResponse.json(
        {
          success: false,
          message: missingData
            ? 'GET webhook received with no package data. Askenish must include TrackingNumber and UserCode in the URL (or ?content= JSON). A bare URL ping cannot create a package.'
            : 'Validation failed',
          errors: getValidation.errors,
          hint:
            'Example: GET /api/kcd/packages/add?id=YOUR_API_KEY&TrackingNumber=TBA123&UserCode=CLEAN0007&Weight=5&Shipper=Amazon',
          data: [],
        },
        { status: 400 }
      );
    }

    // Connect to database and create package (same as POST)
    await dbConnect();
    
    const userCode = userCodeFromQuery;
    console.log(`[KCD Webhook ${requestId}] Looking up user with userCode: ${userCode}`);
    
    const user = await User.findOne({ userCode });
    
    if (!user) {
      console.error(`[KCD Webhook ${requestId}] User not found for userCode: ${userCode}`);
      log.responseStatus = 404;
      log.error = `User not found for userCode: ${userCode}`;
      addLog(log);
      return NextResponse.json(
        { error: "User not found", userCode },
        { status: 404 }
      );
    }
    
    // Check for duplicate
    const existingPackage = await Package.findOne(
      trackingNumberQuery(trackingNumber)
    );
    
    if (existingPackage) {
      log.responseStatus = 409;
      log.error = `Package with tracking number ${trackingNumber} already exists`;
      addLog(log);
      return NextResponse.json(
        { error: "Package already exists", trackingNumber, packageId: existingPackage._id },
        { status: 409 }
      );
    }
    
    const weightKg = asNumber(weight);
    const receivedDate = receivedAt ? new Date(asString(receivedAt)) : new Date();

    const packageData = buildKcdPackageDocument(
      {
        TrackingNumber: trackingNumber,
        ControlNumber: houseNumber,
        FirstName: firstName,
        LastName: lastName,
        UserCode: userCode,
        Weight: weightKg,
        Shipper: shipper,
        EntryDate: receivedDate,
        EntryDateTime: receivedDate,
        Branch: 'KCD Main Warehouse',
        Description: description,
        EntryStaff: 'KCD Webhook',
      },
      user,
      {
        source: 'kcd_webhook',
        sourceDetails: {
          syncedAt: new Date(),
          syncStatus: 'synced',
          apiEndpoint: '/api/kcd/packages/add',
        },
      }
    );
    
    const createdPackage = await Package.create(packageData);
    console.log(`[KCD Webhook ${requestId}] Package created: ${createdPackage._id}`);
    
    let emailSent = false;
    try {
      if (user.email) {
        const kcdGetPkg = toPublicKcdPackage(createdPackage.toObject());
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
          userCode: user.userCode,
        });
        emailSent = true;
      }
    } catch (emailError) {
      console.error(`[KCD Webhook ${requestId}] Failed to send email:`, emailError);
    }
    
    const kcdGetResponse = toPublicKcdPackage(createdPackage.toObject());
    console.log(`[KCD Webhook ${requestId}] Package KCD format:`, JSON.stringify([kcdGetResponse], null, 2));

    log.responseStatus = 201;
    addLog(log);
    
    return kcdPackageCreatedResponse([kcdGetResponse], {
      message: 'Package created successfully via GET',
      notifications: { emailSent },
    });
    
  } catch (error) {
    console.error(`[KCD Webhook ${requestId}] Unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
