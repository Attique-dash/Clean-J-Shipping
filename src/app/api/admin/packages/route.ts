import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const per_page = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "20", 10), 1), 100);

    const where: any = {
      status: { not: "failed" }
    };

    if (q) {
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [packages, total_count, status_counts] = await Promise.all([
      prisma.package.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * per_page,
        take: per_page
      }),
      prisma.package.count({ where }),
      prisma.package.groupBy({
        by: ['status'],
        where: { status: { not: "failed" } },
        _count: true
      })
    ]);

    const statusCountsMap = status_counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    const formattedPackages = packages.map(p => ({
      tracking_number: p.trackingNumber,
      customer_name: p.user.name,
      customer_id: p.user.id,
      status: p.status,
      current_location: p.currentLocation || undefined,
      weight: p.weight,
      dimensions: p.length && p.width && p.height 
        ? `${p.length}×${p.width}×${p.height} cm` 
        : undefined,
      description: p.itemDescription || undefined,
      received_date: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ 
      packages: formattedPackages, 
      total_count,
      status_counts: statusCountsMap,
      page, 
      per_page 
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { tracking_number, user_id, weight, description } = body;

    if (!tracking_number || !user_id) {
      return NextResponse.json(
        { error: "tracking_number and user_id are required" }, 
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.package.findUnique({
      where: { trackingNumber: tracking_number }
    });
    if (existing) {
      return NextResponse.json(
        { error: "Tracking number already exists" }, 
        { status: 409 }
      );
    }

    const created = await prisma.package.create({
      data: {
        trackingNumber: tracking_number,
        userId: user_id,
        weight: weight || 0,
        itemDescription: description,
        status: "pending",
        senderName: "Warehouse",
        senderPhone: "",
        senderAddress: "",
        senderCity: "",
        senderState: "",
        senderZipCode: "",
        receiverName: user.name,
        receiverPhone: user.phone || "",
        receiverAddress: user.address || "",
        receiverCity: user.city || "",
        receiverState: user.state || "",
        receiverZipCode: user.zipCode || "",
        packageType: "parcel",
        deliveryType: "standard",
        shippingCost: 0,
        totalAmount: 0,
        paymentMethod: "cash"
      }
    });

    // Create audit log
    await prisma.audit.create({
      data: {
        packageId: created.id,
        status: "pending",
        description: "Package created by admin",
        performedBy: payload.email
      }
    });

    return NextResponse.json({ 
      ok: true, 
      id: created.id, 
      tracking_number: created.trackingNumber 
    });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
