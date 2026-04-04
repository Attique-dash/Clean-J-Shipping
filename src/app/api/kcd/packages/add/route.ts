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

function getKcdApiKey(): string {
  return process.env.KCD_API_KEY || "";
}

function verifyApiKey(requestKey: string): boolean {
  const expectedKey = getKcdApiKey();
  if (!expectedKey) {
    console.error("[KCD Webhook] KCD_API_KEY not configured in environment");
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(requestKey),
      Buffer.from(expectedKey)
    );
  } catch {
    return false;
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
    
    // Verify API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      console.error(`[KCD Webhook ${requestId}] Missing X-API-Key header`);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body: null,
        responseStatus: 401,
        error: 'Missing X-API-Key header'
      };
      addLog(log);
      return NextResponse.json(
        { error: "Unauthorized - Missing API key" },
        { status: 401 }
      );
    }
    
    if (!verifyApiKey(apiKey)) {
      console.error(`[KCD Webhook ${requestId}] Invalid API key`);
      const log = {
        timestamp,
        method: 'POST',
        headers,
        body: null,
        responseStatus: 401,
        error: 'Invalid API key'
      };
      addLog(log);
      return NextResponse.json(
        { error: "Unauthorized - Invalid API key" },
        { status: 401 }
      );
    }
    
    console.log(`[KCD Webhook ${requestId}] API key validated`);
    
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
    
    // Validate required fields
    const {
      trackingNumber,
      houseNumber,
      customerMailbox,
      weight,
      shipper,
      receivedAt
    } = body;
    
    const missingFields: string[] = [];
    if (!trackingNumber) missingFields.push('trackingNumber');
    if (!customerMailbox) missingFields.push('customerMailbox');
    
    if (missingFields.length > 0) {
      console.error(`[KCD Webhook ${requestId}] Missing required fields:`, missingFields);
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
        { error: "Missing required fields", missingFields },
        { status: 400 }
      );
    }
    
    // Connect to database
    console.log(`[KCD Webhook ${requestId}] Connecting to database...`);
    await dbConnect();
    console.log(`[KCD Webhook ${requestId}] Database connected`);
    
    // Find user by customerMailbox (this maps to userCode)
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
      
      // KCD specific fields
      controlNumber: houseNumber ? asString(houseNumber) : undefined,
      mailboxNumber: mailboxCode,
      
      // Package details
      weight: weightKg,
      weightUnit: 'kg',
      itemDescription: body.description || `Package from ${shipper || 'Unknown'}`,
      description: body.description || `Package from ${shipper || 'Unknown'}`,
      shipper: shipper ? asString(shipper) : 'Unknown Shipper',
      
      // Dates
      dateReceived: receivedDate,
      entryDate: receivedDate,
      receivedAt: receivedDate,
      
      // Status
      status: 'received',
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
      receiverName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
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
      branch: 'KCD Main Warehouse',
      entryStaff: 'KCD Webhook',
      
      // Dimensions placeholder
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
        unit: 'cm',
        weight: weightKg,
        weightUnit: 'kg'
      }
    };
    
    console.log(`[KCD Webhook ${requestId}] Creating package...`);
    const createdPackage = await Package.create(packageData);
    console.log(`[KCD Webhook ${requestId}] Package created: ${createdPackage._id}`);
    
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
        emailSent
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
    // Simple auth check - verify admin API key or session
    const apiKey = req.headers.get('x-api-key');
    const adminKey = process.env.ADMIN_API_KEY || process.env.KCD_API_KEY;
    
    if (!apiKey || !adminKey || apiKey !== adminKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
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
