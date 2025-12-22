import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Message } from "@/models/Message";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function POST(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user_code = String(body.user_code || "").trim();
  const subject = String(body.subject || "").trim() || undefined;
  const message = String(body.body || "").trim();
  if (!user_code || !message) {
    return NextResponse.json({ error: "user_code and body are required" }, { status: 400 });
  }

  const customer = await User.findOne({ userCode: user_code, role: "customer" }).select("_id userCode");
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const created = await Message.create({
    userCode: customer.userCode,
    customer: customer._id,
    subject,
    body: message,
    sender: "support",
    read: false,
  });

  return NextResponse.json({ ok: true, id: String(created._id) });
}
