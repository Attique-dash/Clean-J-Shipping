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
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    
    // Validate required fields - Support both old field names and Tasoko PDF field names (PascalCase)
    const trackingNumber = body.trackingNumber || body.TrackingNumber;
    const houseNumber = body.houseNumber || body.HouseNumber || body.ControlNumber;
    const customerMailbox = body.customerMailbox || body.customerCode || body.UserCode;
    const weight = body.weight || body.Weight;
    const shipper = body.shipper || body.Shipper;
    const receivedAt = body.receivedAt || body.EntryDate || body.EntryDateTime;
    const description = body.description || body.Description;
    const firstName = body.firstName || body.FirstName;
    const lastName = body.lastName || body.LastName;
    
    // Additional Tasoko PDF fields (optional)
    const packageId = body.PackageID || body.packageId;
    const courierId = body.CourierID || body.courierId;
    const manifestId = body.ManifestID || body.manifestId;
    const collectionId = body.CollectionID || body.collectionId;
    const entryStaff = body.EntryStaff || body.entryStaff;
    const branch = body.Branch || body.branch;
    const pieces = body.Pieces || body.pieces || 1;
    const cubes = body.Cubes || body.cubes;
    const length = body.Length || body.length;
    const width = body.Width || body.width;
    const height = body.Height || body.height;
    const packageStatus = body.PackageStatus || body.status;
    
    const missingFields: string[] = [];
    if (!trackingNumber) missingFields.push('trackingNumber/TrackingNumber');
    if (!customerMailbox) missingFields.push('customerMailbox/UserCode');
    
    if (missingFields.length > 0) {
      console.error(`[KCD Webhook ${requestId}] Missing required fields:`, missingFields);
      console.error(`[KCD Webhook ${requestId}] Received body keys:`, Object.keys(body));
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body,
        responseStatus: 400,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
      addLog(log);
      return NextResponse.json(
        { error: "Missing required fields", missingFields, receivedFields: Object.keys(body) },
        { status: 400 }
      );
    }
    
    // Connect to database
    console.log(`[KCD Webhook ${requestId}] Connecting to database...`);
    await dbConnect();
    console.log(`[KCD Webhook ${requestId}] Database connected`);
    
    // Find user by customerMailbox/UserCode (this maps to userCode)
    const userCode = asString(customerMailbox);
    console.log(`[KCD Webhook ${requestId}] Looking up user with userCode: ${userCode}`);
    
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
    const existingPackage = await Package.findOne({ 
      trackingNumber: asString(trackingNumber) 
    });
    
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
    
    const packageData = {
      trackingNumber: asString(trackingNumber).toUpperCase(),
      userId: user._id,
      userCode: user.userCode,
      customer: user._id,
      
      // Source tracking
      source: 'kcd_webhook' as const,
      sourceDetails: {
        syncedAt: new Date(),
        syncStatus: 'synced' as const,
        apiEndpoint: '/api/kcd/packages/add',
        kcdPackageId: packageId || undefined,
        kcdCourierId: courierId || undefined
      },
      
      // KCD specific fields from Tasoko PDF
      controlNumber: houseNumber ? asString(houseNumber) : undefined,
      mailboxNumber: mailboxCode,
      
      // Tasoko PDF additional fields
      kcdPackageId: packageId ? asString(packageId) : undefined,
      kcdCourierId: courierId ? asString(courierId) : undefined,
      kcdManifestId: manifestId ? asString(manifestId) : undefined,
      kcdCollectionId: collectionId ? asString(collectionId) : undefined,
      entryStaff: entryStaff ? asString(entryStaff) : 'KCD Webhook',
      branch: branch ? asString(branch) : 'KCD Main Warehouse',
      pieces: pieces ? asNumber(pieces) : 1,
      cubes: cubes ? asNumber(cubes) : 0,
      
      // Package details
      weight: weightKg,
      weightUnit: 'kg',
      itemDescription: description || `Package from ${shipper || 'Unknown'}`,
      description: description || `Package from ${shipper || 'Unknown'}`,
      shipper: shipper ? asString(shipper) : 'Unknown Shipper',
      
      // Dates
      dateReceived: receivedDate,
      entryDate: receivedDate,
      receivedAt: receivedDate,
      
      // Status - use PackageStatus from PDF if provided
      status: packageStatus ? asString(packageStatus) : 'received',
      paymentStatus: 'pending',
      
      // Service defaults
      serviceMode: 'air',
      packageType: 'parcel',
      serviceType: 'standard',
      deliveryType: 'door_to_door',
      
      // Sender info (KCD as sender)
      senderType: 'warehouse',
      senderName: shipper ? asString(shipper) : 'KCD Logistics',
      senderCompany: 'KCD Logistics',
      senderPhone: '0000000000',
      senderEmail: 'warehouse@kcdlogistics.com',
      senderAddress: 'KCD Warehouse',
      senderCity: 'Kingston',
      senderState: 'St. Andrew',
      senderZipCode: '00000',
      senderCountry: 'Jamaica',
      
      // Receiver info (customer)
      receiverName: `${firstName || user.firstName || ''} ${lastName || user.lastName || ''}`.trim() || 'Customer',
      receiverPhone: user.phone || '0000000000',
      receiverEmail: user.email || '',
      receiverAddress: user.address?.street || 'No Address',
      receiverCity: user.address?.city || 'Kingston',
      receiverState: user.address?.state || 'St. Andrew',
      receiverZipCode: user.address?.zipCode || '00000',
      receiverCountry: user.address?.country || 'Jamaica',
      
      // Pricing
      shippingCost: 0,
      insurance: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      paymentMethod: 'cash',
      
      // Flags
      isInternational: false,
      isFragile: false,
      isHazardous: false,
      requiresSignature: false,
      isPriority: false,
      signatureRequired: false,
      
      // Additional metadata
      warehouseLocation: 'KCD Main Warehouse',
      currentLocation: 'KCD Main Warehouse',
      
      // Dimensions from PDF if provided
      dimensions: {
        length: length ? asNumber(length) : 0,
        width: width ? asNumber(width) : 0,
        height: height ? asNumber(height) : 0,
        unit: 'cm',
        weight: weightKg,
        weightUnit: 'kg'
      }
    };
    
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
        await sendNewPackageEmail({
          to: user.email,
          firstName: user.firstName || "Customer",
          trackingNumber: createdPackage.trackingNumber,
          status: createdPackage.status,
          weight: createdPackage.weight,
          shipper: createdPackage.shipper || shipper || 'KCD Logistics',
          warehouse: createdPackage.warehouseLocation || "KCD Main Warehouse",
          receivedDate: createdPackage.dateReceived || new Date(),
          description: createdPackage.itemDescription || `Package from ${shipper || 'KCD'}`,
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
    
    return NextResponse.json({
      success: true,
      message: "Package created successfully",
      package: {
        id: createdPackage._id,
        trackingNumber: createdPackage.trackingNumber,
        userCode: createdPackage.userCode,
        mailboxCode: createdPackage.mailboxNumber,
        status: createdPackage.status,
        createdAt: createdPackage.createdAt
      },
      notifications: {
        preAlertCreated,
        emailSent,
        invoiceCreated
      }
    }, { status: 201 });
    
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
 * Debug endpoint to view recent request logs (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const validation = await validateApiKey(apiKey);
    
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
