// src/app/api/bills/create/route.ts
// Create a new bill for customer

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Bill, { IBillPackage } from "@/models/Bill";
import Package from "@/models/Package";
import User from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

interface CreateBillRequest {
  customerId?: string;
  packageIds: string[];
  items?: Array<{
    description: string;
    amount: number;
  }>;
  additionalFees?: Array<{
    label: string;
    amount: number;
  }>;
  customerNotes?: string;
  adminNotes?: string;
  dueDate?: string;
  currency?: string;
  taxRate?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate (admin only for creating bills)
    const payload = await getAuthFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string }).id || 
                  (payload as { id?: string; _id?: string })._id;
    const userRole = payload.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateBillRequest = await req.json();

    // Validate required fields
    if (!body.packageIds || !Array.isArray(body.packageIds) || body.packageIds.length === 0) {
      return NextResponse.json(
        { error: "packageIds array is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get packages
    const packages = await Package.find({
      _id: { $in: body.packageIds.map(id => new Types.ObjectId(id)) }
    }).lean();

    if (packages.length === 0) {
      return NextResponse.json(
        { error: "No packages found" },
        { status: 404 }
      );
    }

    // Validate all packages belong to same customer
    const customerIds = [...new Set(packages.map(p => p.userId?.toString()))];
    if (customerIds.length > 1) {
      return NextResponse.json(
        { error: "All packages must belong to the same customer" },
        { status: 400 }
      );
    }

    const customerId = customerIds[0];
    if (!customerId) {
      return NextResponse.json(
        { error: "Packages must have an associated customer" },
        { status: 400 }
      );
    }

    // Get customer details
    const customer = await User.findById(customerId).lean() as any;
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Build bill packages
    const billPackages: IBillPackage[] = packages.map(pkg => ({
      packageId: pkg._id as Types.ObjectId,
      trackingNumber: pkg.trackingNumber || 'N/A',
      shipper: pkg.shipper || undefined,
      weight: pkg.weight || undefined,
      itemValue: pkg.pricePaid || 0,
      shippingFee: 0, // Admin can update later
      customsFee: 0,  // Admin can update later
      total: pkg.pricePaid || 0
    }));

    // Calculate due date (default: 14 days from now)
    const dueDate = body.dueDate 
      ? new Date(body.dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create bill
    const bill = new Bill({
      customerId: new Types.ObjectId(customerId),
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email,
      customerEmail: customer.email,
      packages: billPackages,
      additionalFees: body.additionalFees || [],
      customerNotes: body.customerNotes,
      adminNotes: body.adminNotes,
      dueDate,
      currency: body.currency || 'USD',
      taxRate: body.taxRate || 0.15,
      status: 'pending'
    });

    await bill.save();

    // Update packages with bill reference
    await Package.updateMany(
      { _id: { $in: body.packageIds.map(id => new Types.ObjectId(id)) } },
      { 
        $set: { 
          billId: bill._id,
          billStatus: 'pending'
        }
      }
    );

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/customer/bills/${bill._id}/pay`;

    // Update bill with payment URL
    bill.paymentUrl = paymentUrl;
    bill.paymentGateway = 'paypal';
    await bill.save();

    // Send email to customer (async, don't block response)
    try {
      const { sendBillCreatedEmail } = await import("@/lib/email");
      await sendBillCreatedEmail({
        to: customer.email,
        firstName: customer.firstName,
        billNumber: bill.billNumber,
        amount: bill.totalAmount,
        currency: bill.currency,
        dueDate: bill.dueDate,
        paymentUrl: bill.paymentUrl,
        packageCount: bill.packages.length
      });
    } catch (emailError) {
      console.error("Failed to send bill email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Bill created successfully",
      bill: {
        id: bill._id,
        billNumber: bill.billNumber,
        customerId: bill.customerId,
        customerName: bill.customerName,
        customerEmail: bill.customerEmail,
        packages: bill.packages,
        subtotal: bill.subtotal,
        tax: bill.tax,
        taxRate: bill.taxRate,
        totalAmount: bill.totalAmount,
        currency: bill.currency,
        status: bill.status,
        dueDate: bill.dueDate,
        paymentUrl: bill.paymentUrl,
        createdAt: bill.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
