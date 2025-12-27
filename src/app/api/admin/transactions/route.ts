import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Payment } from "@/models/Payment";
import { PosTransaction } from "@/models/PosTransaction";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const method = (url.searchParams.get("method") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const per_page_raw = Math.max(parseInt(url.searchParams.get("per_page") || "20", 10) || 20, 1);
  const per_page = Math.min(per_page_raw, 100);

  // Build filters for Payment model
  const paymentFilter: Record<string, unknown> = {};
  if (method && ["visa", "mastercard", "amex", "bank", "wallet"].includes(method)) {
    paymentFilter.method = method;
  }
  if (status && ["initiated", "authorized", "captured", "failed", "refunded"].includes(status)) {
    paymentFilter.status = status;
  }
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    paymentFilter.$or = [
      { reference: regex },
      { trackingNumber: regex },
      { userCode: regex },
      { gatewayId: regex }
    ];
  }

  // Build filters for POS transactions
  const posFilter: Record<string, unknown> = {};
  if (method && ["cash", "card", "visa", "mastercard", "amex", "bank", "wallet"].includes(method)) {
    posFilter.method = method;
  }
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    posFilter.$or = [
      { receiptNo: regex },
      { customerCode: regex },
      { notes: regex }
    ];
  }

  // Fetch both Payment and POS transactions
  const [payments, posTransactions, paymentCount] = await Promise.all([
    Payment.find(paymentFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * per_page)
      .limit(per_page)
      .lean()
      .catch(() => []),
    PosTransaction.find(posFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * per_page)
      .limit(per_page)
      .lean()
      .catch(() => []),
    Payment.countDocuments(paymentFilter).catch(() => 0),
  ]);

  // Map Payment model transactions
  const paymentTransactions = payments.map((p) => ({
    id: `payment-${p._id}`,
    user_code: p.userCode,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    status: p.status === "captured" ? "completed" : p.status === "initiated" ? "pending" : p.status === "failed" ? "failed" : p.status,
    reference: p.reference || null,
    gateway_id: p.gatewayId || null,
    payment_gateway: p.gatewayId ? "paypal" : null,
    tracking_number: p.trackingNumber || null,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
  }));

  // Map POS transactions
  const posTransactionsMapped = posTransactions.map((pos) => ({
    id: `pos-${pos._id}`,
    user_code: pos.customerCode || null,
    amount: pos.total,
    currency: "USD",
    method: pos.method,
    status: "completed", // POS transactions are always completed
    reference: pos.receiptNo,
    gateway_id: null,
    payment_gateway: "pos",
    tracking_number: null,
    created_at: pos.createdAt ? new Date(pos.createdAt).toISOString() : null,
    updated_at: pos.updatedAt ? new Date(pos.updatedAt).toISOString() : null,
  }));

  // Combine and sort by date
  const allTransactions = [...paymentTransactions, ...posTransactionsMapped]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, per_page);

  // Apply status filter if needed (after combining)
  const filteredTransactions = status && status !== "all"
    ? allTransactions.filter(t => {
        if (status === "completed") return t.status === "completed" || t.status === "captured";
        if (status === "pending") return t.status === "pending" || t.status === "initiated" || t.status === "authorized";
        return t.status === status;
      })
    : allTransactions;

  return NextResponse.json({
    transactions: filteredTransactions,
    total_count: paymentCount + posTransactions.length,
    page,
    per_page,
  });
}

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
  }

  try {
    // Check if it's a Payment transaction
    if (id.startsWith("payment-")) {
      const paymentId = id.replace("payment-", "");
      const result = await Payment.findByIdAndDelete(paymentId);
      if (!result) {
        return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 });
      }
    }
    // Check if it's a POS transaction
    else if (id.startsWith("pos-")) {
      const posId = id.replace("pos-", "");
      const result = await PosTransaction.findByIdAndDelete(posId);
      if (!result) {
        return NextResponse.json({ error: "POS transaction not found" }, { status: 404 });
      }
    }
    else {
      return NextResponse.json({ error: "Invalid transaction ID format" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
