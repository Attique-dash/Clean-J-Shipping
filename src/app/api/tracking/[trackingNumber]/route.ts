import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const trackingNumber = decodeURIComponent(params.trackingNumber || "").trim();
    
    if (!trackingNumber) {
      return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
    }

    const pkg = await prisma.package.findFirst({
      where: {
        OR: [
          { trackingNumber: { equals: trackingNumber, mode: 'insensitive' } },
          { referenceNumber: { equals: trackingNumber, mode: 'insensitive' } }
        ]
      },
      include: {
        audits: {
          orderBy: { timestamp: 'desc' }
        }
      }
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
      history: pkg.audits.map(audit => ({
        status: audit.status,
        location: audit.location || undefined,
        description: audit.description || undefined,
        timestamp: audit.timestamp.toISOString()
      }))
    });
  } catch (error) {
    console.error("Error tracking package:", error);
    return NextResponse.json({ error: "Failed to track package" }, { status: 500 });
  }
}

