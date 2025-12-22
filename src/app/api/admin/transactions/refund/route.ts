import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Payment } from "@/models/Payment";

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

  const data = json as { payment_id?: string };
  if (!data.payment_id) {
    return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
  }

  const payment = await Payment.findById(data.payment_id);
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only captured or authorized payments can be refunded in this simple flow
  if (!(payment.status === "captured" || payment.status === "authorized")) {
    return NextResponse.json({ error: `Cannot refund payment with status ${payment.status}` }, { status: 400 });
  }

  payment.status = "refunded";
  await payment.save();

  return NextResponse.json({ ok: true, payment_id: String(payment._id), status: payment.status });
}
