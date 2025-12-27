import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Payment } from "@/models/Payment";
import { PosTransaction } from "@/models/PosTransaction";
import jsPDF from 'jspdf';

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
  const format = (url.searchParams.get("format") || "").trim();

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

  try {
    // Fetch all transactions for export
    const [payments, posTransactions] = await Promise.all([
      Payment.find(paymentFilter)
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => []),
      PosTransaction.find(posFilter)
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => []),
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
      status: "completed",
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
      });

    // Apply status filter if needed (after combining)
    const filteredTransactions = status && status !== "all"
      ? allTransactions.filter(t => {
          if (status === "completed") return t.status === "completed" || t.status === "captured";
          if (status === "pending") return t.status === "pending" || t.status === "initiated" || t.status === "authorized";
          return t.status === status;
        })
      : allTransactions;

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Transaction ID",
        "User Code", 
        "Amount",
        "Currency",
        "Method",
        "Status",
        "Reference",
        "Gateway ID",
        "Payment Gateway",
        "Tracking Number",
        "Created At",
        "Updated At"
      ];

      const csvData = filteredTransactions.map(t => [
        t.id,
        t.user_code || "",
        t.amount,
        t.currency,
        t.method,
        t.status,
        t.reference || "",
        t.gateway_id || "",
        t.payment_gateway || "",
        t.tracking_number || "",
        t.created_at || "",
        t.updated_at || ""
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === "pdf") {
      // Generate simple PDF-like HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Transactions Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #0f4d8a; border-bottom: 2px solid #0f4d8a; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0f4d8a; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .even { background-color: #f9f9f9; }
            .amount { text-align: right; font-weight: bold; }
            .status-completed { color: green; }
            .status-pending { color: orange; }
            .status-failed { color: red; }
          </style>
        </head>
        <body>
          <h1>Transactions Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User Code</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Method</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Gateway</th>
                <th>Tracking Number</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map((t, index) => `
                <tr class="${index % 2 === 0 ? 'even' : ''}">
                  <td>${t.id}</td>
                  <td>${t.user_code || ''}</td>
                  <td class="amount">${t.amount}</td>
                  <td>${t.currency}</td>
                  <td>${t.method}</td>
                  <td class="status-${t.status}">${t.status}</td>
                  <td>${t.reference || ''}</td>
                  <td>${t.payment_gateway || ''}</td>
                  <td>${t.tracking_number || ''}</td>
                  <td>${t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    } else {
      return NextResponse.json({ error: "Invalid format. Use 'csv' or 'pdf'" }, { status: 400 });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export transactions" }, { status: 500 });
  }
}
