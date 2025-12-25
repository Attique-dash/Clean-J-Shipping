import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const { trackingNumber, status } = await req.json();
    
    if (!trackingNumber || !status) {
      return NextResponse.json({ error: "Tracking number and status are required" }, { status: 400 });
    }

    // Map frontend status to database status
    const statusMap: Record<string, string> = {
      'received': 'At Warehouse',
      'in_processing': 'In Processing',
      'ready_to_ship': 'Ready to Ship',
      'shipped': 'Shipped',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
      'unknown': 'Unknown'
    };

    const finalStatus = statusMap[status] || status;

    const pkg = await Package.findOneAndUpdate(
      { trackingNumber: trackingNumber.trim() },
      {
        status: finalStatus,
        updatedAt: new Date(),
        $push: {
          history: {
            status: finalStatus,
            at: new Date(),
            note: `Status updated by warehouse`
          }
        }
      },
      { new: true }
    );

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      new_status: status,
      updated_by: auth.userCode || 'warehouse',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating package status:", error);
    return NextResponse.json({ error: "Failed to update package status" }, { status: 500 });
  }
}
