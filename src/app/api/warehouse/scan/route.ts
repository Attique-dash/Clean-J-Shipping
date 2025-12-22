import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { isWarehouseAuthorized } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    if (!isWarehouseAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const trackingNumber = url.searchParams.get("trackingNumber");

    if (!trackingNumber || !trackingNumber.trim()) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    // Search for package by tracking number or barcode
    const pkg = await Package.findOne({
      $or: [
        { trackingNumber: trackingNumber.trim() },
        { barcode: trackingNumber.trim() },
      ],
    })
      .select("trackingNumber status description weight sender recipient userCode")
      .lean();

    if (!pkg) {
      return NextResponse.json({
        package: null,
        error: "Package not found",
      });
    }

    // Format response
    const packageData = {
      _id: pkg._id?.toString(),
      trackingNumber: pkg.trackingNumber,
      status: pkg.status || "Unknown",
      description: (pkg as any).description,
      weight: (pkg as any).weight,
      sender: (pkg as any).sender,
      recipient: (pkg as any).recipient || (pkg as any).receiverName,
      userCode: (pkg as any).userCode,
    };

    return NextResponse.json({ package: packageData });
  } catch (error) {
    console.error("Scan GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan package" },
      { status: 500 }
    );
  }
}

