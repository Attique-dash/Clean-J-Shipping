import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { addPackageSchema } from "@/lib/validators";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { sendNewPackageEmail } from "@/lib/email";

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addPackageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber, userCode, weight, shipper, description, entryDate, dimensions, receivedBy, warehouse } = parsed.data;
  const { length, width, height } = dimensions || {};

  const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode email firstName");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  let now = new Date(entryDate ?? Date.now());
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    now = new Date(`${entryDate}T00:00:00.000Z`);
  }

  const tn = trackingNumber.toUpperCase();

  await Package.findOneAndUpdate(
    { $or: [{ TrackingNumber: tn }, { trackingNumber: tn }] },
    {
      $setOnInsert: {
        TrackingNumber: tn,
        UserCode: customer.userCode,
        userCode: customer.userCode,
        userId: customer._id,
        customer: customer._id,
        createdAt: now,
      },
      $set: {
        weight: typeof weight === "number" ? weight : undefined,
        shipper: typeof shipper === "string" ? shipper : undefined,
        description: typeof description === "string" ? description : undefined,
        status: "At Warehouse",
        updatedAt: now,
        length: typeof length === "number" ? length : undefined,
        width: typeof width === "number" ? width : undefined,
        height: typeof height === "number" ? height : undefined,
        entryStaff: typeof receivedBy === "string" ? receivedBy : undefined,
        branch: typeof warehouse === "string" ? warehouse : undefined,
      },
      $push: {
        history: {
          status: "At Warehouse",
          at: now,
          note: receivedBy ? `Received at ${warehouse || "warehouse"} by ${receivedBy}` : "Received at warehouse",
        },
      },
    },
    { upsert: true, new: true }
  );

  if (customer?.email) {
    // Get warehouse addresses from database
    let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
    try {
      const { Warehouse } = await import('@/models/Warehouse');
      const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
        .select('airAddress seaAddress chinaAddress address')
        .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string } | null;
      if (defaultWarehouse) {
        warehouseAddresses = {
          airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
          seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
          chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
        };
      }
    } catch (whError) {
      console.error('[Admin Receivals] Failed to fetch warehouse addresses:', whError);
    }
    
    sendNewPackageEmail({
      to: customer.email,
      firstName: (customer as unknown as { firstName?: string } | null)?.firstName || "",
      trackingNumber,
      status: "At Warehouse",
      weight,
      shipper,
      warehouse,
      receivedBy,
      receivedDate: now,
      warehouseAddresses,
      userCode: customer.userCode,
    }).catch(() => {});
  }

  return NextResponse.json({
    tracking_number: trackingNumber,
    customer_id: String(customer._id),
    description: description ?? null,
    weight: typeof weight === "number" ? weight : null,
    dimensions: {
      length: typeof length === "number" ? length : null,
      width: typeof width === "number" ? width : null,
      height: typeof height === "number" ? height : null,
    },
    received_date: new Date(now).toISOString(),
    received_by: receivedBy ?? null,
    warehouse: warehouse ?? null,
  });
}
