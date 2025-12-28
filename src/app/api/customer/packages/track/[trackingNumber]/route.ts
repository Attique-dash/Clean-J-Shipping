import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber: paramTrackingNumber } = await params;
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const trackingNumber = decodeURIComponent(paramTrackingNumber || "").trim();
    if (!trackingNumber) {
      return NextResponse.json({ error: "Tracking number required" }, { status: 400 });
    }

    // Get user ID from payload
    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;

    // Find package and verify ownership
    const pkg = await Package.findOne({ trackingNumber, userId }).lean();
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Extract location from package
    const pkgLocation = (pkg as { currentLocation?: { latitude?: number; longitude?: number; address?: string; branch?: string; lat?: number; lng?: number } }).currentLocation 
    const currentLocation = pkgLocation
      ? {
          latitude: pkgLocation.latitude || pkgLocation.lat,
          longitude: pkgLocation.longitude || pkgLocation.lng,
          address: pkgLocation.address || pkgLocation.branch || undefined,
          timestamp: (pkg as { updatedAt?: Date }).updatedAt || new Date(),
        }
      : undefined;

    // Build history from package history array
    const pkgHistory = (pkg as { history?: Array<{ location?: { latitude?: number; longitude?: number; address?: string; lat?: number; lng?: string }; note?: string; status?: string; at?: Date }> }).history || [];
    const history = Array.isArray(pkgHistory) 
      ? pkgHistory
          .filter((h) => h.location || h.note)
          .map((h) => ({
            status: h.status || pkg.status,
            location: h.location ? {
              latitude: h.location.latitude || h.location.lat,
              longitude: h.location.longitude || h.location.lng,
              address: h.location.address || h.note,
              timestamp: h.at || new Date(),
            } : undefined,
            timestamp: h.at || new Date(),
          }))
      : [];

    return NextResponse.json({
      trackingNumber: pkg.trackingNumber,
      status: pkg.status,
      currentLocation,
      history,
    });
  } catch (error) {
    console.error("Error tracking package:", error);
    return NextResponse.json(
      { error: "Failed to track package" },
      { status: 500 }
    );
  }
}

