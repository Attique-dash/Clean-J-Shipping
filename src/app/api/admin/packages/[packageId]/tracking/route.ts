import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// POST - Update package tracking status with location
export async function POST(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and admin role
    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId } = await params;
    const adminId = (session.user as any).id;
    
    const body = await req.json();
    const {
      status,
      statusReason,
      location,
      latitude,
      longitude,
      description,
      scanType,
      scanLocation,
      estimatedDelivery,
      actualDelivery,
      notifyCustomer = true,
    } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Find the package
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          }
        }
      }
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      status,
      currentLocation: location || scanLocation,
      lastScan: new Date(),
      updatedAt: new Date(),
    };

    if (statusReason) updateData.statusReason = statusReason;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (actualDelivery) updateData.actualDelivery = new Date(actualDelivery);
    if (actualDelivery || status === "delivered") {
      updateData.actualDelivery = actualDelivery ? new Date(actualDelivery) : new Date();
    }

    // Update package status
    const updatedPackage = await prisma.package.update({
      where: { id: packageId },
      data: updateData,
    });

    // Create tracking history entry
    const trackingEntry = await prisma.trackingHistory.create({
      data: {
        packageId,
        status,
        statusCode: status.toUpperCase().replace(/\s+/g, '_'),
        location: location || scanLocation,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        description: description || `${status} - ${location || scanLocation || 'Status updated'}`,
        scanType: scanType || status,
        scanLocation: scanLocation || location,
        performedById: adminId,
        performedByType: "admin",
        timestamp: new Date(),
        metadata: {
          previousStatus: pkg.status,
          updatedBy: adminId,
          notifyCustomer,
        },
      },
    });

    // Create audit log
    await prisma.audit.create({
      data: {
        action: "UPDATE",
        entityType: "package",
        entityId: packageId,
        userId: adminId,
        userType: "admin",
        oldValues: { status: pkg.status, location: pkg.currentLocation },
        newValues: { status, location: location || scanLocation },
        affectedFields: ["status", "currentLocation", "lastScan"],
        status: "success",
        timestamp: new Date(),
      },
    });

    // Send WebSocket notification for real-time updates
    try {
      const { wsManager } = await import("@/lib/websocket-server");
      
      wsManager.notifyPackageUpdate({
        trackingNumber: pkg.trackingNumber,
        userId: pkg.userId,
        status,
        location: location || scanLocation,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        address: location || scanLocation,
      });
    } catch (wsError) {
      console.error("WebSocket notification failed:", wsError);
      // Don't fail the request if WebSocket fails
    }

    // Send email notification if enabled and customer has email
    if (notifyCustomer && pkg.user?.email) {
      try {
        const emailModule = await import("@/lib/email-service");
        const emailService = emailModule.emailService || new emailModule.EmailService();
        await emailService.sendStatusUpdateNotification({
          to: pkg.user.email,
          customerName: pkg.user.name,
          trackingNumber: pkg.trackingNumber,
          oldStatus: pkg.status,
          newStatus: status,
          location: location || scanLocation,
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tracking updated successfully",
      data: {
        package: updatedPackage,
        trackingEntry,
      },
    });

  } catch (error) {
    console.error("Error updating tracking:", error);
    return NextResponse.json(
      { error: "Failed to update tracking" },
      { status: 500 }
    );
  }
}

// GET - Get tracking history for a package
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId } = await params;
    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    // Find the package
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        trackingHistory: {
          orderBy: { timestamp: 'desc' },
          include: {
            performedBy: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        user: {
          select: {
            id: true,
          }
        }
      }
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    // Check authorization - only admin or package owner can view
    if (userRole !== "admin" && pkg.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const statusHistory = pkg.trackingHistory.map((entry: { status: string; statusCode: string | null; location: string | null; latitude: number | null; longitude: number | null; description: string | null; scanType: string | null; scanLocation: string | null; timestamp: Date }) => ({
      status: entry.status,
      statusCode: entry.statusCode,
      location: entry.location,
      latitude: entry.latitude,
      longitude: entry.longitude,
      description: entry.description,
      scanType: entry.scanType,
      scanLocation: entry.scanLocation,
      timestamp: entry.timestamp,
    }));

    return NextResponse.json({
      success: true,
      data: {
        trackingHistory: statusHistory,
        packageStatus: pkg.status,
        currentLocation: pkg.currentLocation,
      },
    });

  } catch (error) {
    console.error("Error fetching tracking history:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking history" },
      { status: 500 }
    );
  }
}
