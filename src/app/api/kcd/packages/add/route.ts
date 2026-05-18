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
import { kcdPackageCreatedResponse, kcdErrorResponse } from "@/lib/kcd-api-response";
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

// Helper to format mailbox code as CLEAN-XXXX
function formatMailboxCode(userCode: string): string {
  if (userCode.startsWith("CLEAN-")) return userCode;
  const cleanCode = userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `CLEAN-${cleanCode.slice(0, 4)}`;
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
    
    // Parse body first to check for token in body (Askenish portal sends token in body)
    let rawBody: string | null = null;
    let bodyToken: string | null = null;
    try {
      rawBody = await req.text();
      const bodyJson = JSON.parse(rawBody);
      bodyToken = bodyJson?.token || null;
      console.log(`[KCD Webhook ${requestId}] Token from body:`, bodyToken ? '[PRESENT]' : '[MISSING]');
    } catch (e) {
      // Body might not be JSON or empty, continue with header check
    }
    
    // Re-create request with body for later parsing
    if (rawBody) {
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      });
    }
    
    // Verify API Key using header or body token
    const headerApiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(headerApiKey, bodyToken);
    if (!validation.valid) {
      console.error(`[KCD Webhook ${requestId}] API key validation failed: ${validation.error}`);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body: null,
        responseStatus: 401,
        error: validation.error || 'Invalid API key'
      };
      addLog(log);
      return NextResponse.json(
        { error: `Unauthorized - ${validation.error}` },
        { status: 401 }
      );
    }
    
    console.log(`[KCD Webhook ${requestId}] API key validated for: ${validation.key?.name || 'unknown'}`);
    
    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      console.log(`[KCD Webhook ${requestId}] Body:`, JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error(`[KCD Webhook ${requestId}] Failed to parse JSON body:`, parseError);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body: null,
        responseStatus: 400,
        error: 'Invalid JSON body'
      };
      addLog(log);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body', errors: [{ field: 'body', message: 'Request body must be valid JSON' }] },
        { status: 400 }
      );
    }

    const bodyValidation = validateAddPackageBody(body);
    if (!bodyValidation.ok) {
      console.error(`[KCD Webhook ${requestId}] Validation failed:`, bodyValidation.errors);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body,
        responseStatus: 400,
        error: bodyValidation.errors.map((e) => e.message).join('; '),
      };
      addLog(log);
      return validationFailedResponse(bodyValidation.errors);
    }
    body = bodyValidation.normalized;

    const trackingNumber = extractTrackingNumber(body);
    const userCode = extractUserCode(body);
    const houseNumber = body.ControlNumber;
    const weight = body.Weight;
    const shipper = body.Shipper;
    const receivedAt = body.EntryDateTime || body.EntryDate;
    const description = body.Description;
    const firstName = body.FirstName;
    const lastName = body.LastName;
    const packageId = body.PackageID;
    const courierId = body.CourierID;
    const manifestId = body.ManifestID;
    const collectionId = body.CollectionID;
    const entryStaff = body.EntryStaff;
    const branch = body.Branch;
    const pieces = body.Pieces ?? 1;
    const cubes = body.Cubes;
    const length = body.Length;
    const width = body.Width;
    const height = body.Height;
    const packageStatus = body.PackageStatus;
    
    // Connect to database
    console.log(`[KCD Webhook ${requestId}] Connecting to database...`);
    await dbConnect();
    console.log(`[KCD Webhook ${requestId}] Database connected`);
    
    console.log(`[KCD Webhook ${requestId}] Looking up user with UserCode: ${userCode}`);
    
    const user = await User.findOne({ userCode });
    
    if (!user) {
      console.error(`[KCD Webhook ${requestId}] User not found for userCode: ${userCode}`);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body,
        responseStatus: 404,
        error: `User not found for userCode: ${userCode}`
      };
      addLog(log);
      return NextResponse.json(
        { error: "User not found", userCode },
        { status: 404 }
      );
    }
    
    console.log(`[KCD Webhook ${requestId}] User found: ${user._id} (${user.email})`);
    
    // Check for duplicate tracking number
    const existingPackage = await Package.findOne(
      trackingNumberQuery(trackingNumber)
    );
    
    if (existingPackage) {
      console.warn(`[KCD Webhook ${requestId}] Package with tracking number ${trackingNumber} already exists`);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body,
        responseStatus: 409,
        error: `Package with tracking number ${trackingNumber} already exists`
      };
      addLog(log);
      return NextResponse.json(
        { 
          error: "Package already exists", 
          trackingNumber,
          packageId: existingPackage._id 
        },
        { status: 409 }
      );
    }
    
    // Create package
    const weightKg = asNumber(weight);
    const weightLbs = weightKg * 2.20462;
    const receivedDate = receivedAt ? new Date(asString(receivedAt)) : new Date();
    
    const mailboxCode = formatMailboxCode(userCode);
    
    const packageData = buildKcdPackageDocument(
      {
        ...body,
        PackageID: packageId,
        CourierID: courierId,
        ManifestID: manifestId,
        CollectionID: collectionId,
        TrackingNumber: trackingNumber,
        ControlNumber: houseNumber,
        FirstName: firstName,
        LastName: lastName,
        UserCode: userCode,
        Weight: weightKg,
        Shipper: shipper,
        EntryStaff: entryStaff || 'KCD Webhook',
        EntryDate: receivedDate,
        EntryDateTime: receivedDate,
        Branch: branch || 'KCD Main Warehouse',
        Description: description,
        Cubes: cubes,
        Length: length,
        Width: width,
        Height: height,
        Pieces: pieces,
        PackageStatus: packageStatus,
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
    
    console.log(`[KCD Webhook ${requestId}] Creating package...`);
    const createdPackage = await Package.create(packageData);
    console.log(`[KCD Webhook ${requestId}] Package created: ${createdPackage._id}`);
    
    // Create billing invoice for the package
    let billingInvoice: { _id: any } | null = null;
    let invoiceCreated = false;
    try {
      const { CurrencyService } = await import('@/lib/currency-service');
      const Invoice = (await import('@/models/Invoice')).default;
      
      const weightLbs = weightKg * 2.20462;
      const costBreakdown = CurrencyService.calculateTotalPackageCost(0, weightKg, 'JMD');
      
      // Create invoice items
      const invoiceItems = [];
      if (costBreakdown.shippingCostJMD > 0) {
        invoiceItems.push({
          description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
          quantity: 1,
          unitPrice: costBreakdown.shippingCostJMD,
          taxRate: 0,
          amount: costBreakdown.shippingCostJMD,
          taxAmount: 0,
          total: costBreakdown.shippingCostJMD
        });
      }
      
      const invoiceData = {
        userId: user._id,
        customer: {
          id: user._id.toString(),
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          phone: user.phone,
          address: user.address,
        },
        package: {
          trackingNumber: asString(trackingNumber),
          userCode: user.userCode,
        },
        invoiceType: "billing",
        currency: "JMD",
        subtotal: costBreakdown.itemValueJMD,
        taxTotal: 0,
        discountAmount: 0,
        total: costBreakdown.totalJMD,
        amountPaid: 0,
        balanceDue: costBreakdown.totalJMD,
        items: invoiceItems,
        notes: `Auto-generated invoice for KCD package ${trackingNumber}`,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      billingInvoice = await Invoice.create(invoiceData);
      invoiceCreated = true;
      
      // Link invoice to package
      if (billingInvoice) {
        await Package.findByIdAndUpdate(createdPackage._id, {
          $set: { 
            billingInvoiceId: billingInvoice._id,
            invoiceStatus: 'pending',
            invoiceUploaded: false
          }
        });
        
        console.log(`[KCD Webhook ${requestId}] Billing invoice created: ${billingInvoice._id}`);
      }
    } catch (invoiceError) {
      console.error(`[KCD Webhook ${requestId}] Failed to create billing invoice:`, invoiceError);
      // Don't fail package creation if invoice creation fails
    }
    
    // Create pre-alert for the package
    let preAlertCreated = false;
    try {
      const { PreAlert } = await import('@/models/PreAlert');
      const existingPreAlert = await PreAlert.findOne({ 
        trackingNumber: asString(trackingNumber) 
      });
      
      if (!existingPreAlert) {
        await PreAlert.create({
          userCode: user.userCode,
          customer: user._id,
          trackingNumber: asString(trackingNumber),
          carrier: shipper ? asString(shipper) : 'Unknown Carrier',
          origin: 'KCD Warehouse',
          expectedDate: receivedDate,
          status: 'approved',
          notes: 'Auto-created from KCD webhook',
          decidedAt: new Date(),
        });
        preAlertCreated = true;
        console.log(`[KCD Webhook ${requestId}] Pre-alert created`);
      }
    } catch (preAlertError) {
      console.error(`[KCD Webhook ${requestId}] Failed to create pre-alert:`, preAlertError);
    }
    
    // Send email notification to customer
    let emailSent = false;
    try {
      if (user.email) {
        const kcdEmailPkg = toPublicKcdPackage(createdPackage.toObject());
        await sendNewPackageEmail({
          to: user.email,
          firstName: user.firstName || "Customer",
          trackingNumber: kcdEmailPkg.TrackingNumber,
          status: String(kcdEmailPkg.PackageStatus ?? 0),
          weight: kcdEmailPkg.Weight ?? 0,
          shipper: kcdEmailPkg.Shipper || 'KCD Logistics',
          warehouse: kcdEmailPkg.Branch || "KCD Main Warehouse",
          receivedDate: kcdEmailPkg.EntryDate ? new Date(kcdEmailPkg.EntryDate) : new Date(),
          description: kcdEmailPkg.Description || `Package from ${shipper || 'KCD'}`,
        });
        emailSent = true;
        console.log(`[KCD Webhook ${requestId}] Email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error(`[KCD Webhook ${requestId}] Failed to send email:`, emailError);
    }
    
    // Log success
    const log = {
      timestamp,
      method: 'POST',
      headers,
      body,
      responseStatus: 201,
    };
    addLog(log);
    
    console.log(`[KCD Webhook ${requestId}] Success - Package created: ${createdPackage._id}`);
    
    const kcdResponse = toPublicKcdPackage(createdPackage.toObject());
    console.log(`[KCD Webhook ${requestId}] Package KCD format:`, JSON.stringify([kcdResponse], null, 2));

    return kcdPackageCreatedResponse([kcdResponse], {
      notifications: {
        preAlertCreated,
        emailSent,
        invoiceCreated,
      },
    });
    
  } catch (error) {
    console.error(`[KCD Webhook ${requestId}] Unexpected error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const log = {
      timestamp,
      method: 'POST',
      headers: {},
      body: null,
      responseStatus: 500,
      error: errorMessage
    };
    addLog(log);
    
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
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
    const getValidation = validateAddPackageBody(queryBody);
    const trackingNumber = extractTrackingNumber(
      getValidation.ok ? getValidation.normalized : queryBody
    );
    const userCodeFromQuery = extractUserCode(
      getValidation.ok ? getValidation.normalized : queryBody
    );
    const houseNumber = queryBody.ControlNumber;
    const weight = queryBody.Weight;
    const shipper = queryBody.Shipper;
    const receivedAt = queryBody.EntryDateTime || queryBody.EntryDate;
    const description = queryBody.Description;
    const firstName = queryBody.FirstName;
    const lastName = queryBody.LastName;
    
    // Token can be in query param or header
    const tokenFromQuery = searchParams.get('token') || searchParams.get('apiKey') || searchParams.get('api_key');
    const tokenFromHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const bodyToken = tokenFromQuery || tokenFromHeader;
    
    console.log(`[KCD Webhook ${requestId}] Query params:`, {
      trackingNumber,
      UserCode: userCodeFromQuery,
      houseNumber,
      weight,
      shipper,
      hasToken: !!bodyToken
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
    
    // Validate API Key
    const validation = await validateApiKey(tokenFromHeader ?? null, bodyToken);
    if (!validation.valid) {
      console.error(`[KCD Webhook ${requestId}] API key validation failed: ${validation.error}`);
      log.responseStatus = 401;
      log.error = validation.error || 'Invalid API key';
      addLog(log);
      return NextResponse.json(
        { error: `Unauthorized - ${validation.error}` },
        { status: 401 }
      );
    }
    
    if (!getValidation.ok) {
      log.responseStatus = 400;
      log.error = getValidation.errors.map((e) => e.message).join('; ');
      addLog(log);
      return validationFailedResponse(getValidation.errors);
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
