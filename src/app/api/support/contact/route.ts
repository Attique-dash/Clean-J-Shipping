import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { supportContactSchema } from "@/lib/validators";
import { sendSupportContactEmail } from "@/lib/email";

export async function POST(req: Request) {
  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = supportContactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = getAuthFromRequest(req);
  const isAuthed = Boolean(payload && (payload.role === "customer" || payload.role === "admin"));

  // If unauthenticated, require name+email
  if (!isAuthed && (!parsed.data.email || !parsed.data.name)) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  // Determine user context
  let userCode: string | undefined;
  let customerId: string | undefined;
  let fromEmail = parsed.data.email || "";
  let fromName = parsed.data.name || undefined;

  if (isAuthed) {
    const user = payload?._id ? await User.findById(payload._id).select("_id userCode email firstName lastName") : null;
    if (user) {
      userCode = user.userCode;
      customerId = String(user._id);
      fromEmail = user.email || fromEmail;
      fromName = fromName || [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
    }
  }

  // Store as a message (sender customer)
  if (!userCode) {
    // Fallback userCode for public contact
    userCode = "PUBLIC";
  }
  const created = await Message.create({
    userCode,
    customer: customerId,
    subject: parsed.data.subject,
    body: parsed.data.message,
    sender: "customer",
  });

  // Send email notification to admin
  try {
    await sendSupportContactEmail({
      fromEmail: fromEmail || "noreply@example.com",
      name: fromName,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch (e) {
    // Don't fail the request if email fails
    console.warn("sendSupportContactEmail failed", e);
  }

  return NextResponse.json({
    ticket_id: String(created._id),
    subject: created.subject || null,
    message: created.body,
    created_at: created.createdAt?.toISOString() || new Date().toISOString(),
  });
}
