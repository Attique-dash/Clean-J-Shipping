// src/app/api/warehouse/addpackage/subdir/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { tasokoAddPackageSchema } from "@/lib/validators";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { startSession } from "mongoose";
import Invoice from "@/models/Invoice";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 700; // Minimum charge
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

function calculateTotalAmount(itemValue: number, weight: number): number {
  const itemValueJmd = itemValue * 155; // USD to JMD conversion
  const weightLbs = weight * 2.20462; // kg to lbs
  const shippingCostJmd = calcShippingCostJmd(weightLbs);
  const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0; // 15% duty if >$100
  
  return shippingCostJmd + customsDutyJmd;
}

async function createBillingInvoice(
  packageData: { value?: number; weight?: number },
  user: { _id: any; firstName: string; lastName: string; email: string; userCode?: string },
  trackingNumber: string
) {
  try {
    const itemValue = asNumber(packageData.value) || 0;
    const weight = asNumber(packageData.weight) || 0;
    const weightLbs = weight * 2.20462;
    
    // Calculate costs
    const shippingCostJmd = calcShippingCostJmd(weightLbs);
    const itemValueJmd = itemValue * 155;
    const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
    const totalAmount = shippingCostJmd + customsDutyJmd;
    
    // Create invoice items
    const invoiceItems = [];
    
    if (shippingCostJmd > 0) {
      invoiceItems.push({
        description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
        quantity: 1,
        unitPrice: shippingCostJmd,
        taxRate: 0,
        amount: shippingCostJmd,
        taxAmount: 0,
        total: shippingCostJmd
      });
    }
    
    if (customsDutyJmd > 0) {
      invoiceItems.push({
        description: `Customs duty (15% of item value)`,
        quantity: 1,
        unitPrice: customsDutyJmd,
        taxRate: 0,
        amount: customsDutyJmd,
        taxAmount: 0,
        total: customsDutyJmd
      });
    }
    
    // Generate unique invoice number
    const invoiceNumber = `INV-${trackingNumber}-${Date.now().toString(36).toUpperCase()}`;
    
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: "billing",
      userId: user._id,
      customer: {
        id: user._id.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userCode || 'Customer',
        email: user.email || '',
      },
      package: {
        trackingNumber,
        userCode: user.userCode || ''
      },
      status: "unpaid",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: "JMD",
      subtotal: totalAmount,
      taxTotal: 0,
      discountAmount: 0,
      total: totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      items: invoiceItems,
      notes: `Auto-generated billing invoice for package ${trackingNumber}`,
    });
    
    return invoice;
  } catch (error) {
    console.error('❌ Error creating billing invoice:', error);
    return null;
  }
}

// ==========================================
// MAIN ROUTE HANDLER
// ==========================================

export async function POST(req: Request) {
  const requestId = Date.now().toString(36);
  
  // CORS headers for external API calls
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };

  console.log(`[${requestId}] 📦 Warehouse API Request:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  // Check authorization
  if (!isWarehouseAuthorized(req)) {
    const hasApiKey = req.headers.get('x-warehouse-key') || req.headers.get('x-api-key');
    
    console.log(`[${requestId}] ❌ Unauthorized request`);
    return NextResponse.json(
      { 
        error: "Unauthorized",
        message: hasApiKey 
          ? "Invalid API key provided" 
          : "No API key provided in request headers",
        required_header: "x-warehouse-key or x-api-key",
        documentation: "/warehouse/integrations"
      }, 
      { status: 401, headers }
    );
  }

  await dbConnect();

  let body: unknown;
  try {
    body = await req.json();
    console.log(`[${requestId}] 📝 Request body:`, body);
  } catch (error) {
    console.log(`[${requestId}] ❌ Invalid JSON`);
    return NextResponse.json(
      { error: "Invalid JSON payload" }, 
      { status: 400, headers }
    );
  }

  // Validate request body
  const parsed = tasokoAddPackageSchema.safeParse(body);
  if (!parsed.success) {
    console.log(`[${requestId}] ❌ Validation failed:`, parsed.error.flatten());
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

  // Start database transaction for atomic operations
  const session = await startSession();
  
  try {
    await session.startTransaction();
    console.log(`[${requestId}] 🔄 Transaction started`);

    // ==========================================
    // STEP 1: Validate Customer Exists
    // ==========================================
    const customer = await User.findOne({ 
      userCode: customer_id, 
      role: "customer" 
    })
    .session(session)
    .select("_id userCode email firstName lastName");
    
    if (!customer) {
      await session.abortTransaction();
      console.log(`[${requestId}] ❌ Customer not found: ${customer_id}`);
      return NextResponse.json(
        { 
          error: "Customer not found", 
          customer_id,
          message: `No customer found with userCode: ${customer_id}`,
          suggestion: "Please verify the customer code or create the customer first"
        }, 
        { status: 404, headers }
      );
    }

    console.log(`[${requestId}] ✅ Customer found: ${customer.userCode}`);

    // ==========================================
    // STEP 2: Check for Duplicate Package
    // ==========================================
    const existingPackage = await Package.findOne({ 
      trackingNumber: tracking_number 
    }).session(session);
    
    if (existingPackage) {
      await session.abortTransaction();
      console.log(`[${requestId}] ❌ Duplicate package: ${tracking_number}`);
      return NextResponse.json(
        { 
          error: "Package already exists", 
          tracking_number,
          message: `Package with tracking number ${tracking_number} already exists in the system`,
          existing_status: existingPackage.status,
          existing_package_id: existingPackage._id
        }, 
        { status: 409, headers } // 409 Conflict
      );
    }

    // ==========================================
    // STEP 3: Normalize Dates
    // ==========================================
    let shipDate: Date | undefined = undefined;
    if (ship_date) {
      shipDate = /^\d{4}-\d{2}-\d{2}$/.test(ship_date)
        ? new Date(`${ship_date}T00:00:00.000Z`)
        : new Date(ship_date);
    }
    const now = new Date();

    // ==========================================
    // STEP 4: Calculate Payment Amounts
    // ==========================================
    const itemValueNum = asNumber(value) || 0;
    const weightNum = asNumber((parsed.data as any).weight) || 1; // Default 1kg if not provided
    const totalAmount = calculateTotalAmount(itemValueNum, weightNum);
    const weightLbs = weightNum * 2.20462;
    const shippingCost = calcShippingCostJmd(weightLbs);
    const customsDuty = itemValueNum > 100 ? (itemValueNum * 155 * 0.15) : 0;

    console.log(`[${requestId}] 💰 Payment calculation:`, {
      itemValue: itemValueNum,
      weight: weightNum,
      weightLbs: weightLbs.toFixed(2),
      shippingCost,
      customsDuty,
      totalAmount
    });

    // ==========================================
    // STEP 5: Store Package Metadata
    // ==========================================
    const tasokoMeta = {
      integration_id,
      value: itemValueNum || null,
      currency: currency || "USD",
      origin: origin ?? null,
      order_id: order_id ?? null,
      supplier: supplier ?? null,
      ship_date: shipDate ? shipDate.toISOString() : null,
      integration_source: "tasoko",
      received_at: now.toISOString(),
    };

    // ==========================================
    // STEP 6: Create Package with Payment Fields
    // ==========================================
    const newPackage = await Package.create([{
      trackingNumber: tracking_number,
      userCode: customer.userCode,
      customer: customer._id,
      description,
      status: "At Warehouse",
      entryDate: shipDate || now,
      packagePayments: JSON.stringify(tasokoMeta),
      weight: weightNum,
      
      // ✅ CRITICAL: Add payment fields
      shippingCost: shippingCost,
      totalAmount: totalAmount,
      paymentMethod: "cash",
      paymentStatus: "pending",
      
      createdAt: now,
      updatedAt: now,
      history: [{
        status: "At Warehouse",
        at: now,
        note: `Added via Tasoko integration ${integration_id}`,
      }],
    }], { session });

    console.log(`[${requestId}] ✅ Package created: ${newPackage[0]._id}`);

    // ==========================================
    // STEP 7: Auto-Generate Invoice
    // ==========================================
    let billingInvoice = null;
    try {
      const packageDataForInvoice = {
        value: itemValueNum,
        weight: weightNum,
      };
      
      billingInvoice = await createBillingInvoice(
        packageDataForInvoice, 
        customer, 
        tracking_number
      );
      
      if (billingInvoice) {
        // Link invoice to package
        await Package.findOneAndUpdate(
          { trackingNumber: tracking_number },
          {
            $set: { 
              billingInvoiceId: billingInvoice._id,
              invoiceStatus: 'billed'
            }
          },
          { session }
        );
        
        console.log(`[${requestId}] ✅ Invoice created: ${billingInvoice.invoiceNumber}`);
      } else {
        console.log(`[${requestId}] ⚠️ Invoice creation returned null`);
      }
    } catch (invoiceError) {
      console.error(`[${requestId}] ❌ Invoice creation failed:`, invoiceError);
      // Don't fail the entire transaction if invoice fails
    }

    // ==========================================
    // STEP 8: Commit Transaction
    // ==========================================
    await session.commitTransaction();
    console.log(`[${requestId}] ✅ Transaction committed successfully`);

    // ==========================================
    // STEP 9: Return Comprehensive Response
    // ==========================================
    return NextResponse.json({
      success: true,
      package_id: newPackage[0]._id.toString(),
      integration_id,
      tracking_number,
      customer_id,
      customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customer_email: customer.email,
      description: description ?? null,
      value: itemValueNum || null,
      currency: currency || "USD",
      origin: origin ?? null,
      order_id: order_id ?? null,
      supplier: supplier ?? null,
      ship_date: shipDate ? shipDate.toISOString() : null,
      
      // ✅ Include payment information
      payment: {
        shipping_cost_jmd: shippingCost,
        customs_duty_jmd: customsDuty,
        total_amount_jmd: totalAmount,
        payment_status: "pending",
        payment_method: "cash",
        currency: "JMD"
      },
      
      // ✅ Include invoice information
      invoice: billingInvoice ? {
        invoice_id: billingInvoice._id.toString(),
        invoice_number: billingInvoice.invoiceNumber,
        total: billingInvoice.total,
        status: billingInvoice.status,
        due_date: billingInvoice.dueDate.toISOString(),
        issue_date: billingInvoice.issueDate.toISOString()
      } : {
        warning: "Invoice creation failed, but package was created successfully"
      },
      
      status: "At Warehouse",
      created_at: now.toISOString(),
      integration_source: "tasoko",
      message: "Package added successfully with invoice generated",
      
      // Metadata for debugging
      _meta: {
        request_id: requestId,
        api_version: "v1"
      }
    }, { status: 201, headers });

  } catch (error) {
    await session.abortTransaction();
    console.error(`[${requestId}] ❌ Transaction error:`, error);
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error occurred",
        tracking_number,
        request_id: requestId
      }, 
      { status: 500, headers }
    );
  } finally {
    await session.endSession();
    console.log(`[${requestId}] 🔚 Transaction session ended`);
  }
}

// ==========================================
// OPTIONS HANDLER (CORS Preflight)
// ==========================================
export async function OPTIONS(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-warehouse-key, x-api-key',
  };
  
  return new NextResponse(null, { status: 200, headers });
}