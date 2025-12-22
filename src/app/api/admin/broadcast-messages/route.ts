import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { adminBroadcastCreateSchema } from "@/lib/validators";
import { Broadcast } from "@/models/Broadcast";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { Types } from "mongoose";

export async function GET(req: Request) {
  const payload = await  getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const list = await Broadcast.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({
    broadcasts: list.map((b) => ({
      id: String(b._id),
      title: b.title,
      body: b.body,
      channels: b.channels,
      scheduled_at: b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null,
      sent_at: b.sentAt ? new Date(b.sentAt).toISOString() : null,
      total_recipients: b.totalRecipients || 0,
      portal_delivered: b.portalDelivered || 0,
      email_delivered: b.emailDelivered || 0,
      email_failed: b.emailFailed || 0,
      created_at: b.createdAt ? new Date(b.createdAt).toISOString() : null,
    })),
  });
}

export async function POST(req: Request) {
  const payload = await  getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminBroadcastCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, body, channels = ["portal"], scheduled_at } = parsed.data as {
    title: string;
    body: string;
    channels?: ("email" | "portal")[];
    scheduled_at?: string;
  };

  // Determine recipients (all customers with a valid userCode)
  const customers = (await User.find({ role: "customer" })
    .select("_id email userCode")
    .lean()) as Array<{ _id: Types.ObjectId; email?: string; userCode?: string }>;
  const withUserCode = customers.filter((u) => typeof u.userCode === "string" && u.userCode.trim().length > 0) as Array<{
    _id: Types.ObjectId;
    email?: string;
    userCode: string;
  }>;
  const totalRecipients = withUserCode.length;

  const created = await Broadcast.create({
    title,
    body,
    channels,
    scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
    createdBy: payload._id || null,
    totalRecipients,
  });

  // Deliver via portal by creating messages for each customer
  let portalDelivered = 0;
  if (channels.includes("portal") && totalRecipients > 0) {
    try {
      const now = new Date();
      const docs: Array<{
        userCode: string;
        customer: Types.ObjectId;
        subject: string;
        body: string;
        sender: "support";
        createdAt: Date;
        updatedAt: Date;
      }> = withUserCode.map((u) => ({
        userCode: u.userCode,
        customer: u._id,
        subject: title,
        body,
        sender: "support",
        createdAt: now,
        updatedAt: now,
      }));
      const res = await Message.insertMany(docs, { ordered: false });
      portalDelivered = res.length;
    } catch {
      // ignore per-user failures; continue
    }
  }

  // TODO: Email delivery integration. For now we do not send emails; counts remain 0.
  const emailDelivered = 0;
  const emailFailed = 0;

  const sentAt = new Date();
  await Broadcast.findByIdAndUpdate(created._id, {
    $set: { portalDelivered, emailDelivered, emailFailed, sentAt },
  });

  return NextResponse.json({
    id: String(created._id),
    title,
    body,
    channels,
    total_recipients: totalRecipients,
    portal_delivered: portalDelivered,
    email_delivered: emailDelivered,
    email_failed: emailFailed,
    sent_at: sentAt.toISOString(),
  });
}
