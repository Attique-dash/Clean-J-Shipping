// src/app/api/warehouse/addpackage/subdir/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { tasokoAddPackageSchema } from "@/lib/validators";
import { isWarehouseAuthorized } from "@/lib/rbac";

export async function POST(req: Request) {
  // CRITICAL FIX 1: Add CORS headers for external API calls
  const headers = {
    'Access-Control-Allow-Origin': '*', // Or specify allowed domains
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  // Check authorization
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized - Invalid API key" }, 
      { status: 401, headers }
    );
  }

  await dbConnect();

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" }, 
      { status: 400, headers }
    );
  }

  // CRITICAL FIX 2: Validate the request body structure
  const parsed = tasokoAddPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, 
      { status: 400, headers }
    );
  }

  const {
    integration_id,
    tracking_number,
    customer_id,
    description,
    value,
    currency = "USD",
    origin,
    order_id,
    supplier,
    ship_date,
  } = parsed.data;

  try {
    // CRITICAL FIX 3: Better customer validation
    const customer = await User.findOne({ 
      userCode: customer_id, 
      role: "customer" 
    }).select("_id userCode email firstName lastName");
    
    if (!customer) {
      return NextResponse.json(
        { 
          error: "Customer not found", 
          customer_id,
          message: `No customer found with userCode: ${customer_id}` 
        }, 
        { status: 404, headers }
      );
    }

    // Normalize ship_date
    let shipDate: Date | undefined = undefined;
    if (ship_date) {
      shipDate = /^\d{4}-\d{2}-\d{2}$/.test(ship_date)
        ? new Date(`${ship_date}T00:00:00.000Z`)
        : new Date(ship_date);
    }

    const now = new Date();

    // CRITICAL FIX 4: Better metadata storage
    const tasokoMeta = {
      integration_id,
      value: value ?? null,
      currency: currency || "USD",
      origin: origin ?? null,
      order_id: order_id ?? null,
      supplier: supplier ?? null,
      ship_date: shipDate ? shipDate.toISOString() : null,
      integration_source: "tasoko",
      received_at: now.toISOString(),
    };

    const initial: Partial<IPackage> = {
      trackingNumber: tracking_number,
      userCode: customer.userCode,
      customer: customer._id,
      description,
      status: "At Warehouse",
      entryDate: shipDate || now,
      packagePayments: JSON.stringify(tasokoMeta),
      branch: undefined,
    };

    // CRITICAL FIX 5: Add duplicate detection
    const existingPackage = await Package.findOne({ 
      trackingNumber: tracking_number 
    });

    if (existingPackage) {
      return NextResponse.json(
        { 
          error: "Package already exists", 
          tracking_number,
          message: `Package with tracking number ${tracking_number} already exists in the system`,
          existing_status: existingPackage.status
        }, 
        { status: 409, headers } // 409 Conflict
      );
    }

    // Create new package
    const newPackage = await Package.create({
      ...initial,
      createdAt: now,
      updatedAt: now,
      history: [{
        status: "At Warehouse",
        at: now,
        note: `Added via Tasoko integration ${integration_id}`,
      }],
    });

    // CRITICAL FIX 6: Return comprehensive response
    return NextResponse.json({
      success: true,
      package_id: newPackage._id,
      integration_id,
      tracking_number,
      customer_id,
      customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customer_email: customer.email,
      description: description ?? null,
      value: value ?? null,
      currency: currency || "USD",
      origin: origin ?? null,
      order_id: order_id ?? null,
      supplier: supplier ?? null,
      ship_date: shipDate ? shipDate.toISOString() : null,
      integration_source: "tasoko",
      created_at: now.toISOString(),
      status: "At Warehouse",
      message: "Package added successfully"
    }, { status: 201, headers });

  } catch (error) {
    console.error("Package creation error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error occurred",
        tracking_number 
      }, 
      { status: 500, headers }
    );
  }
}