import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { adminPosTransactionCreateSchema } from "@/lib/validators";
import { PosTransaction } from "@/models/PosTransaction";

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
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
  const parsed = adminPosTransactionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { customer_code, method, items, notes } = parsed.data;
  // compute totals
  const calculated = items.map((it) => ({
    sku: it.sku,
    productId: it.product_id,
    name: it.name,
    qty: it.qty,
    unitPrice: typeof it.unit_price === "number" ? it.unit_price : 0,
    total: it.qty * (typeof it.unit_price === "number" ? it.unit_price : 0),
  }));
  const subtotal = calculated.reduce((s, i) => s + i.total, 0);
  const taxRate = Number(process.env.POS_TAX_RATE || 0.0);
  const tax = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  // Validate calculated total (server-side) and enforce minimum amount
  const expectedTotal = Number((subtotal + tax).toFixed(2));
  if (Math.abs(total - expectedTotal) > 0.01) {
    return NextResponse.json(
      { error: "Transaction total mismatch", calculated: total, expected: expectedTotal },
      { status: 400 }
    );
  }
  if (total < 0.01) {
    return NextResponse.json({ error: "Invalid transaction amount" }, { status: 400 });
  }

  // Generate stronger unique receipt number
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const receiptNo = `R${timestamp}-${random}`;
  const created = await PosTransaction.create({
    receiptNo,
    customerCode: customer_code,
    method,
    items: calculated,
    subtotal,
    tax,
    total,
    notes,
    cashierId: payload._id as string | undefined,
  });

  // TODO: inventory update integration and printable receipt generation

  return NextResponse.json({
    receipt_no: created.receiptNo,
    total: created.total,
    tax: created.tax,
    subtotal: created.subtotal,
    method: created.method,
    created_at: created.createdAt?.toISOString() || new Date().toISOString(),
  });
}
