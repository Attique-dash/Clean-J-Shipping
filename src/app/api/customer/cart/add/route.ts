// src/app/api/customer/cart/add/route.ts
// Add package to customer cart

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

interface AddToCartRequest {
  packageId: string;
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

    const body: AddToCartRequest = await req.json();

    // Validate packageId
    if (!body.packageId || !Types.ObjectId.isValid(body.packageId)) {
      return NextResponse.json(
        { error: "Invalid package ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the package
    const pkg = await Package.findById(body.packageId);

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (pkg.userId?.toString() !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to add this package to cart" },
        { status: 403 }
      );
    }

    // Check if package is already in a cart or has been billed
    if (pkg.billId) {
      return NextResponse.json(
        { error: "Package is already part of a bill" },
        { status: 400 }
      );
    }

    // Check if already in cart
    if (pkg.cartStatus === 'in-cart') {
      return NextResponse.json(
        { error: "Package is already in your cart" },
        { status: 400 }
      );
    }

    // Add to cart
    pkg.cartStatus = 'in-cart';
    pkg.cartAddedAt = new Date();
    await pkg.save();

    return NextResponse.json({
      success: true,
      message: "Package added to cart",
      package: {
        id: pkg._id,
        trackingNumber: pkg.trackingNumber,
        shipper: pkg.shipper,
        weight: pkg.weight,
        pricePaid: pkg.pricePaid,
        cartStatus: pkg.cartStatus,
        cartAddedAt: pkg.cartAddedAt
      }
    });

  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}
