// Warehouse Get Packages Endpoint
// URL: /api/warehouse/getpackages/subdir
// Method: GET
// Returns packages with complete warehouse data structure

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { ApiKey, hashApiKey } from "@/models/ApiKey";
import { rateLimit } from "@/lib/rateLimit";

// Helper function to calculate shipping cost
function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 700; // Minimum charge
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

export async function GET(req: Request) {
  const requestId = Date.now().toString(36);
  
  // CORS headers for external API calls
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };

  console.log(`[${requestId}] 📦 Warehouse Get Packages API Request:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  // Check API key authentication
  let token = req.headers.get('x-warehouse-key') || req.headers.get('x-api-key');
  
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get("id") || "";
  }

  if (!token || (!token.startsWith("wh_live_") && !token.startsWith("wh_test_"))) {
    console.log(`[${requestId}] ❌ Unauthorized request - no valid API key`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: "API key required in headers (x-warehouse-key or x-api-key) or query parameter (id)"
      }, 
      { status: 401, headers }
    );
  }

  await dbConnect();

  // Verify API key
  let keyRecord;
  if (token === "wh_test_abc123") {
    keyRecord = await ApiKey.findOne({
      keyPrefix: "wh_test_abc123",
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix permissions");
  } else {
    const hashed = hashApiKey(token);
    keyRecord = await ApiKey.findOne({
      key: hashed,
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix permissions");
  }
  
  if (!keyRecord || !keyRecord.permissions.includes("packages:read")) {
    console.log(`[${requestId}] ❌ Invalid API key or insufficient permissions`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: "Invalid API key or insufficient permissions (requires packages:read)"
      }, 
      { status: 401, headers }
    );
  }

  // Rate limiting
  const limit = 200;
  const rl = rateLimit(keyRecord.keyPrefix, { windowMs: 60 * 1000, maxRequests: limit });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rl.retryAfter,
        resetAt: new Date(rl.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(rl.retryAfter ?? 60),
        },
      }
    );
  }

  try {
    const url = new URL(req.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit_per_page = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit_per_page;
    
    const status = url.searchParams.get('status');
    const userCode = url.searchParams.get('userCode');
    const trackingNumber = url.searchParams.get('trackingNumber');
    const branch = url.searchParams.get('branch');
    const shipper = url.searchParams.get('shipper');

    // Build query
    const query: any = {};
    
    if (status) query.status = status;
    if (userCode) query.userCode = userCode;
    if (trackingNumber) query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    if (branch) query.branch = branch;
    if (shipper) query.shipper = { $regex: shipper, $options: 'i' };

    console.log(`[${requestId}] 🔍 Query:`, { query, page, limit_per_page });

    // Get total count for pagination
    const totalCount = await Package.countDocuments(query);

    // Fetch packages with customer information
    const packages = await Package.find(query)
      .populate('customer', 'userCode firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit_per_page)
      .lean();

    // Transform packages to warehouse format
    const warehousePackages = packages.map((pkg: any) => {
      // Parse packagePayments if it exists
      let packagePaymentsData = {};
      try {
        if (pkg.packagePayments) {
          packagePaymentsData = JSON.parse(pkg.packagePayments);
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Map internal status to warehouse status
      const statusToWarehouseMap: { [key: string]: number } = {
        'At Warehouse': 0,
        'In Transit': 1,
        'At Local Port': 2,
        'Delivered': 3,
        'Unknown': 4
      };

      // Calculate payment information
      const weightLbs = (pkg.weight || 0) * 2.20462;
      const shippingCostJmd = calcShippingCostJmd(weightLbs);
      const totalCostJmd = shippingCostJmd;
      const amountPaidJmd = pkg.amountPaid || 0;
      const outstandingBalanceJmd = Math.max(0, totalCostJmd - amountPaidJmd);

      return {
        PackageID: packagePaymentsData.PackageID || `pkg-${String(pkg._id || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}-${Date.now().toString(36)}`,
        CourierID: pkg.courierId || `cour-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
        ManifestID: pkg.manifestId || '',
        CollectionID: pkg.collectionId || '',
        TrackingNumber: pkg.trackingNumber || '',
        ControlNumber: pkg.controlNumber || '',
        FirstName: pkg.customer?.firstName || '',
        LastName: pkg.customer?.lastName || '',
        UserCode: pkg.userCode || '',
        Weight: pkg.weight || 0,
        Shipper: pkg.shipper || '',
        EntryStaff: pkg.entryStaff || '',
        EntryDate: pkg.entryDate ? new Date(pkg.entryDate).toISOString().split('T')[0] : '',
        EntryDateTime: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : '',
        Branch: pkg.branch || '',
        Claimed: pkg.claimed || false,
        APIToken: packagePaymentsData.APIToken || '<API-TOKEN>',
        ShowControls: packagePaymentsData.ShowControls || false,
        Description: pkg.description || '',
        HSCode: pkg.hsCode || '',
        Unknown: pkg.unknown || false,
        AIProcessed: pkg.aiProcessed || false,
        OriginalHouseNumber: packagePaymentsData.OriginalHouseNumber || '',
        Cubes: pkg.cubes || 0,
        Length: pkg.length || 0,
        Width: pkg.width || 0,
        Height: pkg.height || 0,
        Pieces: pkg.pieces || 1,
        Discrepancy: pkg.discrepancy || false,
        DiscrepancyDescription: pkg.discrepancyDescription || '',
        ServiceTypeID: pkg.serviceTypeId || '',
        HazmatCodeID: pkg.hazmatCodeId || '',
        Coloaded: pkg.coloaded || false,
        ColoadIndicator: pkg.coloadIndicator || '',
        PackageStatus: statusToWarehouseMap[pkg.status] || 0,
        PackagePayments: {
          totalAmount: totalCostJmd,
          shippingCost: shippingCostJmd,
          storageFee: 0,
          customsDuty: 0,
          deliveryFee: 0,
          additionalFees: 0,
          amountPaid: amountPaidJmd,
          outstandingBalance: outstandingBalanceJmd,
          paymentStatus: pkg.paymentStatus || 'pending'
        },
        
        // Additional fields for completeness
        createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : '',
        updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : '',
        status: pkg.status || '',
        customerId: pkg.customer?._id || '',
        customerEmail: pkg.customer?.email || '',
        customerName: `${pkg.customer?.firstName || ''} ${pkg.customer?.lastName || ''}`.trim(),
      };
    });

    return NextResponse.json(warehousePackages, { headers });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Error retrieving packages:`, error);
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error?.message || "Unknown error occurred",
        request_id: requestId
      }, 
      { status: 500, headers }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };
  
  return new NextResponse(null, { status: 200, headers });
}
