import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { Invoice } from "@/models/Invoice";
import { Bill } from "@/models/Bill";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")),
  ].join("\n");
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  try {
    // Get comprehensive dashboard data
    const [packages, customers, payments, invoices, bills] = await Promise.all([
      Package.find({ status: { $ne: "Deleted" } })
        .select("trackingNumber userCode status weight branch createdAt updatedAt itemValue serviceMode")
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean(),
      User.find({ role: "customer" })
        .select("userCode firstName lastName email createdAt lastLogin accountStatus")
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean(),
      Payment.find()
        .select("userCode amount currency method status reference gatewayId createdAt")
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean(),
      Invoice.find()
        .select("invoiceNumber invoiceType customer total amountPaid balanceDue status issueDate dueDate currency")
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean(),
      Bill.find()
        .select("billNumber trackingNumber date branch dueAmount paidAmount balance currency status")
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean(),
    ]);

    // Combine all data into comprehensive export
    const allRows: Array<Record<string, unknown>> = [];

    // Add packages with complete data
    packages.forEach((pkg) => {
      allRows.push({
        type: "Package",
        id: pkg.trackingNumber,
        user_code: pkg.userCode ?? null,
        status: pkg.status ?? null,
        branch: pkg.branch ?? null,
        weight: typeof pkg.weight === "number" ? pkg.weight : null,
        value: typeof pkg.itemValue === "number" ? pkg.itemValue : null,
        service_mode: pkg.serviceMode ?? null,
        created_at: pkg.createdAt ? new Date(pkg.createdAt as Date).toISOString() : null,
        updated_at: pkg.updatedAt ? new Date(pkg.updatedAt as Date).toISOString() : null,
        // Additional package fields for complete export
        description: (pkg as any).description ?? null,
        shipper: (pkg as any).shipper ?? null,
        receiver_name: (pkg as any).receiverName ?? null,
        receiver_email: (pkg as any).receiverEmail ?? null,
        receiver_phone: (pkg as any).receiverPhone ?? null,
        customs_required: (pkg as any).customsRequired ?? null,
        customs_status: (pkg as any).customsStatus ?? null,
      });
    });

    // Add customers with complete data
    customers.forEach((customer) => {
      allRows.push({
        type: "Customer",
        id: customer.userCode,
        name: [customer.firstName || "", customer.lastName || ""].filter(Boolean).join(" ") || null,
        first_name: customer.firstName ?? null,
        last_name: customer.lastName ?? null,
        email: customer.email,
        account_status: customer.accountStatus ?? "active",
        email_verified: (customer as any).emailVerified ?? null,
        created_at: customer.createdAt ? new Date(customer.createdAt as Date).toISOString() : null,
        last_login: customer.lastLogin ? new Date(customer.lastLogin as Date).toISOString() : null,
      });
    });

    // Add payments/transactions
    payments.forEach((payment) => {
      allRows.push({
        type: "Payment",
        id: String(payment._id),
        user_code: payment.userCode,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        reference: payment.reference ?? null,
        gateway_id: payment.gatewayId ?? null,
        created_at: payment.createdAt ? new Date(payment.createdAt as Date).toISOString() : null,
      });
    });

    // Add invoices with complete data
    invoices.forEach((invoice) => {
      const customerData = invoice.customer && typeof invoice.customer === 'object' ? invoice.customer as any : {};
      allRows.push({
        type: "Invoice",
        id: invoice.invoiceNumber,
        invoice_type: invoice.invoiceType ?? "billing",
        customer_id: customerData.id ?? null,
        customer_name: customerData.name ?? null,
        customer_email: customerData.email ?? null,
        subtotal: (invoice as any).subtotal ?? 0,
        tax_total: (invoice as any).taxTotal ?? 0,
        discount_amount: (invoice as any).discountAmount ?? 0,
        total: invoice.total ?? 0,
        amount_paid: invoice.amountPaid ?? 0,
        balance_due: invoice.balanceDue ?? 0,
        status: invoice.status ?? null,
        currency: invoice.currency ?? "USD",
        issue_date: invoice.issueDate ? new Date(invoice.issueDate as Date).toISOString() : null,
        due_date: invoice.dueDate ? new Date(invoice.dueDate as Date).toISOString() : null,
        package_id: (invoice as any).package ?? null,
        items_count: Array.isArray((invoice as any).items) ? (invoice as any).items.length : 0,
      });
    });

    // Add bills with complete data
    bills.forEach((bill) => {
      allRows.push({
        type: "Bill",
        id: bill.billNumber,
        tracking_number: bill.trackingNumber ?? null,
        due_amount: bill.dueAmount ?? 0,
        paid_amount: bill.paidAmount ?? 0,
        balance: bill.balance ?? 0,
        status: bill.status ?? null,
        currency: bill.currency ?? "USD",
        branch: bill.branch ?? null,
        date: bill.date ? new Date(bill.date as Date).toISOString() : null,
        created_at: (bill as any).createdAt ? new Date((bill as any).createdAt as Date).toISOString() : null,
        updated_at: (bill as any).updatedAt ? new Date((bill as any).updatedAt as Date).toISOString() : null,
      });
    });

    if (format === "csv") {
      const csv = toCsv(allRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=dashboard-export-${new Date().toISOString().split('T')[0]}.csv`,
        },
      });
    }

    return NextResponse.json({ count: allRows.length, rows: allRows });
  } catch (error) {
    console.error("Dashboard export error:", error);
    return NextResponse.json(
      { error: "Failed to export dashboard data" },
      { status: 500 }
    );
  }
}
