// src/app/api/customer/cart/clear/route.ts
// Clear all items from customer cart

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function DELETE(req: NextRequest) {
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

    // Clear cart items for this user
    const result = await Package.updateMany(
      {
        userId,
        cartStatus: 'in-cart',
        status: { $ne: 'Deleted' },
        billId: { $exists: false }
      },
      {
        $unset: {
          cartStatus: 1,
          cartAddedAt: 1
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Cart cleared",
      clearedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
