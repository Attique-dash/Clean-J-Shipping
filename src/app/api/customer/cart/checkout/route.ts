// src/app/api/customer/cart/checkout/route.ts
// Create bill from cart items

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Bill, { IBillPackage } from "@/models/Bill";
import Package from "@/models/Package";
import User from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

interface CheckoutRequest {
  additionalFees?: Array<{
    label: string;
    amount: number;
  }>;
  customerNotes?: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const payload = await getAuthFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string }).id || 
                  (payload as { id?: string; _id?: string })._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CheckoutRequest = await req.json();

    await dbConnect();

    // Get cart items
    const cartItems = await Package.find({
      userId,
      cartStatus: 'in-cart',
      status: { $ne: 'Deleted' },
      billId: { $exists: false }
    }).sort({ cartAddedAt: -1 });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty" },
        { status: 400 }
      );
    }

    // Get customer details
    const customer = await User.findById(userId).lean() as any;
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Build bill packages
    const billPackages: IBillPackage[] = cartItems.map(pkg => ({
      packageId: pkg._id as any,
      trackingNumber: pkg.trackingNumber || 'N/A',
      shipper: pkg.shipper || undefined,
      weight: pkg.weight || undefined,
      itemValue: pkg.pricePaid || 0,
      shippingFee: 0, // Will be calculated by admin
      customsFee: 0,    // Will be calculated by admin
      total: pkg.pricePaid || 0
    }));

    // Calculate due date (14 days from now)
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create bill
    const bill = new Bill({
      customerId: userId,
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email,
      customerEmail: customer.email,
      packages: billPackages,
      additionalFees: body.additionalFees || [],
      customerNotes: body.customerNotes,
      dueDate,
      currency: body.currency || 'USD',
      taxRate: 0.15,
      status: 'pending'
    });

    await bill.save();

    // Update packages with bill reference and clear cart status
    for (const pkg of cartItems) {
      pkg.billId = bill._id;
      pkg.cartStatus = undefined;
      pkg.cartAddedAt = undefined;
      pkg.billStatus = 'pending';
      await pkg.save();
    }

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/customer/bills/${bill._id}/pay`;

    // Update bill with payment URL
    bill.paymentUrl = paymentUrl;
    bill.paymentGateway = 'paypal';
    await bill.save();

    // Send email notification
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
    }

    return NextResponse.json({
      success: true,
      message: "Bill created from cart",
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
    console.error("Error creating bill from cart:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
