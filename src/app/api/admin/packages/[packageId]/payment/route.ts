import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";

// POST /api/admin/packages/[packageId]/payment
// Update package payment status (for cash payments)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> | { packageId: string } }
) {
  try {
    await dbConnect();

    // Check authentication and admin role
    const auth = await getAuthFromRequest(req);
    if (!auth || !auth.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { packageId } = await params;
    const body = await req.json();

    const { paymentStatus, paymentMethod, amountPaid, paymentNote } = body;

    // Validate required fields
    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, error: "paymentStatus is required" },
        { status: 400 }
      );
    }

    // Validate payment status enum
    const validStatuses = ["pending", "paid", "partially_paid"];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Import Package model dynamically
    const { Package } = await import("@/models/Package");

    // Find the package
    const packageItem = await Package.findById(packageId);
    if (!packageItem) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    // Calculate proper total amount if missing
    const itemValue = packageItem.itemValue || packageItem.value || 0;
    const weight = packageItem.weight || packageItem.dimensions?.weight || 0;
    const shippingCost = packageItem.shippingCost || 0;

    // If totalAmount is 0, calculate it from itemValue + shippingCost
    let totalAmount = packageItem.totalAmount || 0;
    if (totalAmount === 0 && itemValue > 0) {
      totalAmount = itemValue + shippingCost;
    }

    // Build update data
    const updateData: any = {
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod || "cash"
    };

    // Update totalAmount if it was calculated
    if (totalAmount > 0 && packageItem.totalAmount === 0) {
      updateData.totalAmount = totalAmount;
    }

    // Update amountPaid for any payment status change (paid or partially_paid)
    if (paymentStatus === "paid" || paymentStatus === "partially_paid") {
      updateData.amountPaid = amountPaid || totalAmount || itemValue || 0;
    }

    // If marking as paid, update additional related fields
    if (paymentStatus === "paid") {
      updateData.paidAt = new Date();
      updateData.paidBy = auth.email || "admin";
    }

    // Add payment history entry
    const paymentHistoryEntry = {
      timestamp: new Date(),
      status: paymentStatus,
      amountPaid: amountPaid || totalAmount || itemValue || 0,
      paymentMethod: paymentMethod || "cash",
      note: paymentNote || `Payment status updated to ${paymentStatus} by admin`,
      updatedBy: auth.email || "admin"
    };

    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      {
        $set: updateData,
        $push: { paymentHistory: paymentHistoryEntry }
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: `Package payment status updated to ${paymentStatus}`,
      data: {
        package: updatedPackage,
        paymentUpdate: paymentHistoryEntry
      }
    });

  } catch (error: any) {
    console.error("Error updating package payment status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update payment status" },
      { status: 500 }
    );
  }
}
