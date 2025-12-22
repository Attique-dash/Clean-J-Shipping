import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, type IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { isWarehouseAuthorized, getAuthFromRequest, verifyWarehouseApiKey } from "@/lib/rbac";
import { addPackageSchema } from "@/lib/validators";
import { sendNewPackageEmail } from "@/lib/email";
import { startSession } from "mongoose";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-identifier rate limit: 100 req/min
  let identifier = "warehouse";
  try {
    const { valid, keyInfo } = await verifyWarehouseApiKey(req);
    if (valid && keyInfo?.keyPrefix) identifier = keyInfo.keyPrefix;
    else {
      const payload = await getAuthFromRequest(req);
      const fromCookie = (payload?.uid as string | undefined) || (payload?.email as string | undefined) || (payload?.userCode as string | undefined);
      if (fromCookie) identifier = `wh_${fromCookie}`;
    }
  } catch {}
  const rl = rateLimit(identifier, { windowMs: 60_000, maxRequests: 100 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } });
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

  // Normalize received date to start of day UTC if a date-only string is supplied
  let now = new Date(entryDate ?? Date.now());
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    now = new Date(`${entryDate}T00:00:00.000Z`);
  }

  const session = await startSession();
  try {
    await session.startTransaction();

    // Ensure customer exists within the transaction
    const customer = await User.findOne({ userCode, role: "customer" })
      .session(session)
      .select("_id userCode email firstName");
    if (!customer) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create/update package within the transaction
    const pkg = await Package.findOneAndUpdate(
      { trackingNumber },
      {
        // Keep insert-only fields in $setOnInsert
        $setOnInsert: {
          userCode: customer.userCode,
          customer: customer._id,
          createdAt: now,
        },
        // Updatable fields in $set
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
      { upsert: true, new: true, session }
    );

    // Create pre-alert for customer when warehouse logs package
    // Check if pre-alert already exists for this tracking number
    const existingPreAlert = await PreAlert.findOne({ trackingNumber }).session(session);
    if (!existingPreAlert && pkg) {
      await PreAlert.create([{
        userCode: customer.userCode,
        customer: customer._id,
        trackingNumber,
        carrier: typeof shipper === "string" ? shipper : undefined,
        origin: typeof warehouse === "string" ? warehouse : undefined,
        status: "approved", // Auto-approved since warehouse received it
        notes: `Package received at warehouse${receivedBy ? ` by ${receivedBy}` : ""}`,
        decidedAt: now,
      }], { session });
    }

    await session.commitTransaction();

    // Fire-and-forget email after commit
    // We need customer context outside; reusing local var within this block
    const toEmail = (await User.findOne({ userCode, role: "customer" }).select("email firstName"))?.email;
    if (toEmail) {
      sendNewPackageEmail({
        to: toEmail,
        firstName: "",
        trackingNumber,
        status: "At Warehouse",
        weight,
        shipper,
      }).catch((err) => {
        console.error('[Package Add] Email failed:', err);
      });
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      customer_id: String((await User.findOne({ userCode, role: "customer" }).select("_id"))?._id || ""),
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
  } catch (error) {
    await session.abortTransaction();
    console.error('[Package Add] Transaction failed:', error);
    return NextResponse.json({
      error: "Failed to add package",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  } finally {
    await session.endSession();
  }
}
