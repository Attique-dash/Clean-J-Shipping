import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { tasokoAddPackageSchema } from "@/lib/validators";
import { isWarehouseAuthorized } from "@/lib/rbac";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tasokoAddPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    integration_id,
    tracking_number,
    customer_id,
    description,
    value,
    currency = "USD",
    origin,
    order_id,
    supplier,
    ship_date,
  } = parsed.data;

  // Ensure customer exists by userCode
  const customer = await User.findOne({ userCode: customer_id, role: "customer" }).select("_id userCode");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Normalize ship_date to midnight UTC if date-only
  let shipDate: Date | undefined = undefined;
  if (ship_date) {
    shipDate = /^\d{4}-\d{2}-\d{2}$/.test(ship_date)
      ? new Date(`${ship_date}T00:00:00.000Z`)
      : new Date(ship_date);
  }

  const now = new Date();

  // Store Tasoko metadata in packagePayments as JSON for now
  const tasokoMeta = {
    integration_id,
    value: value ?? null,
    currency: currency || "USD",
    origin: origin ?? null,
    order_id: order_id ?? null,
    supplier: supplier ?? null,
    ship_date: shipDate ? shipDate.toISOString() : null,
    integration_source: "tasoko",
  };

  const initial: Partial<IPackage> = {
    trackingNumber: tracking_number,
    userCode: customer.userCode,
    customer: customer._id,
    description,
    status: "At Warehouse",
    entryDate: shipDate || now,
    packagePayments: JSON.stringify(tasokoMeta),
    branch: undefined,
  };

  await Package.findOneAndUpdate(
    { trackingNumber: tracking_number },
    {
      $setOnInsert: {
        userCode: initial.userCode,
        customer: initial.customer,
        trackingNumber: tracking_number,
        createdAt: now,
      },
      $set: {
        description: typeof description === "string" ? description : undefined,
        status: "At Warehouse",
        entryDate: shipDate || now,
        updatedAt: now,
        packagePayments: initial.packagePayments,
      },
      $push: {
        history: {
          status: "At Warehouse",
          at: now,
          note: `Added via Tasoko integration ${integration_id}`,
        },
      },
    },
    { upsert: true, new: false }
  );

  return NextResponse.json({
    integration_id,
    tracking_number,
    customer_id,
    description: description ?? null,
    value: value ?? null,
    currency: currency || "USD",
    origin: origin ?? null,
    order_id: order_id ?? null,
    supplier: supplier ?? null,
    ship_date: shipDate ? shipDate.toISOString() : null,
    integration_source: "tasoko",
  });
}
