import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { adminPosTransactionCreateSchema } from "@/lib/validators";
import { PosTransaction } from "@/models/PosTransaction";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 1), 50);
  const since = url.searchParams.get("since");

  const filter: Record<string, unknown> = {};
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      filter.createdAt = { $gte: sinceDate };
    }
  }

  const [transactions, overallTotals, todayTotals, methodBreakdown] = await Promise.all([
    PosTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    PosTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalTransactions: { $sum: 1 },
          averageOrder: { $avg: "$total" },
        },
      },
    ]),
    (() => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return PosTransaction.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]);
    })(),
    PosTransaction.aggregate([
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const stats = {
    total_revenue: overallTotals[0]?.totalRevenue || 0,
    total_transactions: overallTotals[0]?.totalTransactions || 0,
    avg_order_value: Number((overallTotals[0]?.averageOrder || 0).toFixed(2)),
    today_revenue: todayTotals[0]?.total || 0,
  };

  return NextResponse.json({
    stats,
    payment_breakdown: methodBreakdown.map((item) => ({
      method: item._id,
      count: item.count,
      total: Number(item.total.toFixed(2)),
    })),
    transactions: transactions.map((txn) => ({
      id: String(txn._id),
      receipt_no: txn.receiptNo,
      customer_code: txn.customerCode || null,
      method: txn.method,
      subtotal: txn.subtotal,
      tax: txn.tax,
      total: txn.total,
      notes: txn.notes || null,
      items: txn.items,
      created_at: txn.createdAt ? new Date(txn.createdAt).toISOString() : null,
    })),
  });
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
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

  return NextResponse.json({
    receipt_no: created.receiptNo,
    customer_code: created.customerCode || null,
    total: created.total,
    tax: created.tax,
    subtotal: created.subtotal,
    method: created.method,
    notes: created.notes || null,
    items: created.items,
    created_at: created.createdAt?.toISOString() || new Date().toISOString(),
  });
}
