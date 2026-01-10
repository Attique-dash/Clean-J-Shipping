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

    // Extract location from package with fallback to warehouse location
    const pkgData = pkg as { 
      currentLocation?: { latitude?: number; longitude?: number; address?: string; branch?: string; lat?: number; lng?: number };
      warehouseLocation?: string;
      branch?: string;
      status?: string;
      updatedAt?: Date;
    };
    
    const pkgLocation = pkgData.currentLocation;
    let currentLocation;
    
    if (pkgLocation && (pkgLocation.latitude || pkgLocation.lat || pkgLocation.longitude || pkgLocation.lng)) {
      currentLocation = {
        latitude: pkgLocation.latitude || pkgLocation.lat || 0,
        longitude: pkgLocation.longitude || pkgLocation.lng || 0,
        address: pkgLocation.address || pkgLocation.branch || pkgData.warehouseLocation || pkgData.branch || undefined,
        timestamp: pkgData.updatedAt || new Date(),
      };
    } else if (pkgData.warehouseLocation || pkgData.branch) {
      // Fallback: Use warehouse location as address (without coordinates)
      currentLocation = {
        latitude: undefined,
        longitude: undefined,
        address: pkgData.warehouseLocation || pkgData.branch || undefined,
        timestamp: pkgData.updatedAt || new Date(),
      };
    } else {
      // No location available - return status-based location
      currentLocation = {
        latitude: undefined,
        longitude: undefined,
        address: pkgData.status === 'Delivered' ? 'Delivered' : pkgData.status || 'In Processing',
        timestamp: pkgData.updatedAt || new Date(),
      };
    }

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
      currentLocation: currentLocation ? {
        ...currentLocation,
        // Ensure we have valid coordinates or provide a helpful message
        hasCoordinates: !!(currentLocation.latitude && currentLocation.longitude),
      } : {
        address: pkgData.status === 'Delivered' ? 'Delivered' : pkgData.status || 'In Processing',
        hasCoordinates: false,
        timestamp: pkgData.updatedAt || new Date(),
      },
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

