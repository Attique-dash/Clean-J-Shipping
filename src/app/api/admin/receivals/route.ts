import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { addPackageSchema } from "@/lib/validators";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { sendNewPackageEmail } from "@/lib/email";

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
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

  const { trackingNumber, userCode, weight, shipper, description, entryDate, length, width, height, receivedBy, warehouse } = parsed.data;

  const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode email firstName");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  let now = new Date(entryDate ?? Date.now());
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    now = new Date(`${entryDate}T00:00:00.000Z`);
  }

  const initial: Partial<IPackage> = {
    trackingNumber,
    userCode: customer.userCode,
    customer: customer._id,
    weight,
    shipper,
    description,
    status: "At Warehouse",
    length,
    width,
    height,
    entryStaff: receivedBy,
    branch: warehouse,
  };

  const pkg = await Package.findOneAndUpdate(
    { trackingNumber },
    {
      $setOnInsert: {
        userCode: initial.userCode,
        customer: initial.customer,
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
    sendNewPackageEmail({
      to: customer.email,
      firstName: (customer as unknown as { firstName?: string } | null)?.firstName || "",
      trackingNumber,
      status: "At Warehouse",
      weight,
      shipper,
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
