import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { customerMessageCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let userCode = payload.userCode as string | undefined;
  if (!userCode && payload._id) {
    const user = await User.findById(payload._id).select("userCode");
    userCode = user?.userCode;
  }
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await Message.find({ userCode }).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ messages: items });
}

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = customerMessageCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = payload._id ? await User.findById(payload._id).select("_id userCode") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, body } = parsed.data;
  const created = await Message.create({
    userCode,
    customer: user?._id,
    subject,
    body,
    sender: "customer",
  });

  // TODO: notify support team via email/webhook if needed

  return NextResponse.json({
    message_id: String(created._id),
    subject: created.subject || null,
    body: created.body,
    sender: created.sender,
    created_at: created.createdAt?.toISOString() || new Date().toISOString(),
  });
}
