import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";

export async function GET(
  _req: Request,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const trackingNumber = decodeURIComponent(params.trackingNumber || "").trim();
    
    if (!trackingNumber) {
      return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
    }

    await dbConnect();
    
    const pkg = await Package.findOne({
      $or: [
        { trackingNumber: { $regex: trackingNumber, $options: 'i' } },
        { referenceNumber: { $regex: trackingNumber, $options: 'i' } }
      ]
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({
      trackingNumber: pkg.trackingNumber,
      status: pkg.status,
      weight: pkg.weight,
      description: pkg.itemDescription || undefined,
      currentLocation: pkg.currentLocation || undefined,
      estimatedDelivery: pkg.estimatedDelivery?.toISOString(),
      actualDelivery: pkg.actualDelivery?.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
      history: (pkg.history || []).map((audit: any) => ({
        status: audit.status,
        location: undefined, // Package history doesn't have location
        description: audit.note || undefined,
        timestamp: audit.at.toISOString()
      }))
    });
  } catch (error) {
    console.error("Error tracking package:", error);
    return NextResponse.json({ error: "Failed to track package" }, { status: 500 });
  }
}

