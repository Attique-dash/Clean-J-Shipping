import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { getAuthFromRequest } from "@/lib/rbac";
import { addPackageSchema } from "@/lib/validators";
import { sendNewPackageEmail } from "@/lib/email";
import { startSession } from "mongoose";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
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

  const { trackingNumber, userCode, weight, shipper, description, itemDescription, entryDate, status, dimensions, recipient, sender, contents, value, specialInstructions, receivedBy, warehouse } = parsed.data;

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
          userId: customer._id,
          customer: customer._id,
          createdAt: now,
        },
        // Updatable fields in $set - remove duplicates from $setOnInsert
        $set: {
          weight: typeof weight === "number" ? weight : undefined,
          shipper: typeof shipper === "string" ? shipper : undefined,
          description: typeof description === "string" ? description : undefined,
          status: status || "received",
          updatedAt: now,
          // Recipient information
          receiverName: recipient?.name || undefined,
          receiverEmail: recipient?.email || undefined,
          receiverPhone: recipient?.phone || undefined,
          receiverAddress: recipient?.address || undefined,
          receiverCountry: (recipient as any)?.country || undefined,
          // Sender information
          senderName: sender?.name || undefined,
          senderEmail: sender?.email || undefined,
          senderPhone: sender?.phone || undefined,
          senderAddress: sender?.address || undefined,
          senderCountry: (sender as any)?.country || undefined,
          // Package dimensions
          length: dimensions?.length ? Number(dimensions.length) : undefined,
          width: dimensions?.width ? Number(dimensions.width) : undefined,
          height: dimensions?.height ? Number(dimensions.height) : undefined,
          dimensionUnit: dimensions?.unit || "cm",
          weightUnit: "kg",
          // Package details
          itemDescription: typeof itemDescription === "string" ? itemDescription : undefined,
          itemValue: typeof value === "number" ? value : undefined,
          itemQuantity: 1,
          // Service defaults
          packageType: "parcel",
          serviceType: "standard",
          deliveryType: "door_to_door",
          // Special instructions
          specialInstructions: typeof specialInstructions === "string" ? specialInstructions : undefined,
          contents: typeof contents === "string" ? contents : undefined,
          value: typeof value === "number" ? value : undefined,
          entryStaff: typeof receivedBy === "string" ? receivedBy : undefined,
          branch: typeof warehouse === "string" ? warehouse : undefined,
          entryDate: entryDate ? new Date(entryDate) : undefined,
        },
        $push: {
          history: {
            status: status || "received",
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
        carrier: typeof shipper === "string" ? shipper : "Unknown Carrier",
        origin: typeof warehouse === "string" ? warehouse : "Unknown Origin",
        expectedDate: now, // Set expected date to when package was received
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
      status: status || "At Warehouse",
      dimensions: dimensions || null,
      recipient: recipient || null,
      sender: sender || null,
      contents: contents || null,
      value: typeof value === "number" ? value : null,
      specialInstructions: specialInstructions || null,
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
