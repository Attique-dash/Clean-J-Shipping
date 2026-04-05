// src/app/api/customer/cart/route.ts
// Get customer cart items

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    await dbConnect();

    // Find all packages in cart for this user
    const cartItems = await Package.find({
      userId,
      cartStatus: 'in-cart',
      status: { $ne: 'Deleted' },
      billId: { $exists: false }
    }).sort({ cartAddedAt: -1 }).lean();

    // Calculate totals
    let subtotal = 0;
    let totalWeight = 0;

    const formattedItems = cartItems.map(pkg => {
      const itemValue = pkg.pricePaid || 0;
      subtotal += itemValue;
      totalWeight += pkg.weight || 0;

      return {
        id: pkg._id,
        trackingNumber: pkg.trackingNumber,
        shipper: pkg.shipper,
        weight: pkg.weight,
        pricePaid: pkg.pricePaid,
        serviceMode: pkg.serviceMode,
        description: pkg.description,
        cartAddedAt: pkg.cartAddedAt,
        status: pkg.status
      };
    });

    // Calculate estimated totals (before tax)
    const taxRate = 0.15;
    const tax = subtotal * taxRate;
    const estimatedTotal = subtotal + tax;

    return NextResponse.json({
      success: true,
      cart: {
        items: formattedItems,
        itemCount: formattedItems.length,
        subtotal,
        tax,
        taxRate,
        estimatedTotal,
        totalWeight
      }
    });

  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}
