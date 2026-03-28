import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber: paramTrackingNumber } = await params;
    const trackingNumber = decodeURIComponent(paramTrackingNumber || "").trim();
    
    if (!trackingNumber) {
      return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
    }

    // Find package with full details
    const pkg = await prisma.package.findFirst({
      where: {
        OR: [
          { trackingNumber: { equals: trackingNumber, mode: 'insensitive' } },
          { referenceNumber: { equals: trackingNumber, mode: 'insensitive' } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            shippingId: true,
          }
        },
        trackingHistory: {
          orderBy: { timestamp: 'desc' }
        },
        manifest: {
          select: {
            manifestNumber: true,
            status: true,
            origin: true,
            destination: true,
            estimatedArrival: true,
          }
        }
      }
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Format tracking history
    const statusHistory = pkg.trackingHistory.map((entry: { status: string; statusCode: string | null; location: string | null; latitude: number | null; longitude: number | null; description: string | null; scanType: string | null; scanLocation: string | null; performedByType: string | null; timestamp: Date }) => ({
      status: entry.status,
      statusCode: entry.statusCode,
      location: entry.location ? {
        lat: entry.latitude,
        lng: entry.longitude,
        address: entry.location,
      } : undefined,
      address: entry.location,
      timestamp: entry.timestamp.toISOString(),
      description: entry.description,
      scanType: entry.scanType,
      scanLocation: entry.scanLocation,
      performedBy: entry.performedByType,
    }));

    // Build response
    const response = {
      trackingNumber: pkg.trackingNumber,
      referenceNumber: pkg.referenceNumber,
      status: pkg.status,
      statusReason: pkg.statusReason,
      
      // Package details
      package: {
        description: pkg.itemDescription,
        weight: pkg.weight,
        weightUnit: pkg.weightUnit,
        dimensions: pkg.length && pkg.width && pkg.height ? {
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          unit: pkg.dimensionUnit,
        } : undefined,
        quantity: pkg.itemQuantity,
        category: pkg.itemCategory,
        value: pkg.itemValue,
        isFragile: pkg.isFragile,
        isHazardous: pkg.isHazardous,
        packageType: pkg.packageType,
        serviceType: pkg.serviceType,
      },

      // Sender info
      sender: {
        name: pkg.senderName,
        company: pkg.senderCompany,
        phone: pkg.senderPhone,
        email: pkg.senderEmail,
        address: pkg.senderAddress,
        city: pkg.senderCity,
        state: pkg.senderState,
        country: pkg.senderCountry,
      },

      // Receiver info
      receiver: {
        name: pkg.receiverName,
        company: pkg.receiverCompany,
        phone: pkg.receiverPhone,
        email: pkg.receiverEmail,
        address: pkg.receiverAddress,
        city: pkg.receiverCity,
        state: pkg.receiverState,
        country: pkg.receiverCountry,
      },

      // Current location
      currentLocation: pkg.trackingHistory[0] ? {
        lat: pkg.trackingHistory[0].latitude,
        lng: pkg.trackingHistory[0].longitude,
        address: pkg.trackingHistory[0].location || pkg.currentLocation,
        lastUpdated: pkg.trackingHistory[0].timestamp.toISOString(),
      } : pkg.currentLocation ? {
        address: pkg.currentLocation,
        lastUpdated: pkg.updatedAt.toISOString(),
      } : undefined,

      // Timeline
      statusHistory,

      // Delivery info
      estimatedDelivery: pkg.estimatedDelivery?.toISOString(),
      actualDelivery: pkg.actualDelivery?.toISOString(),
      pickupDate: pkg.pickupDate?.toISOString(),
      dateReceived: pkg.dateReceived?.toISOString(),

      // Warehouse info
      warehouseLocation: pkg.warehouseLocation,
      
      // Manifest info
      manifest: pkg.manifest ? {
        number: pkg.manifest.manifestNumber,
        status: pkg.manifest.status,
        origin: pkg.manifest.origin,
        destination: pkg.manifest.destination,
        estimatedArrival: pkg.manifest.estimatedArrival?.toISOString(),
      } : undefined,

      // Payment
      paymentStatus: pkg.paymentStatus,
      totalAmount: pkg.totalAmount,

      // Metadata
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error tracking package:", error);
    return NextResponse.json(
      { error: "Failed to track package" },
      { status: 500 }
    );
  }
}

