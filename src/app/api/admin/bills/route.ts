import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";
import { PosTransaction } from "@/models/PosTransaction";
import Invoice from "@/models/Invoice";
import { Package } from "@/models/Package";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // Aggregate bills from multiple sources:
    // 1. MongoDB Invoices
    // 2. MongoDB GeneratedInvoices  
    // 3. POS Transactions (as bills)

    const [invoices, generatedInvoices, posTransactions] = await Promise.all([
      // Fetch MongoDB invoices
      Invoice.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .catch(() => []),

      // Fetch MongoDB generated invoices
      GeneratedInvoice.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .catch(() => []),

      // Fetch POS transactions (as bills)
      PosTransaction.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .catch(() => []),
    ]);

    // Format MongoDB invoices as bills
    const formattedInvoiceBills = invoices.map((inv) => ({
      id: `invoice-${inv._id}`,
      billNumber: inv.invoiceNumber,
      trackingNumber: inv.customer?.name || "N/A",
      date: inv.issueDate ? new Date(inv.issueDate).toISOString() : new Date().toISOString(),
      branch: "Main Branch",
      dueAmount: inv.total,
      paidAmount: inv.amountPaid || 0,
      balance: inv.balanceDue || (inv.total - (inv.amountPaid || 0)),
      currency: inv.currency || "USD",
      status: inv.status === "paid" ? "paid" : inv.status === "overdue" ? "unpaid" : "unpaid",
      source: "invoice",
    }));

    // Format generated invoices as bills
    const formattedGeneratedInvoiceBills = generatedInvoices.map((inv) => ({
      id: `generated-invoice-${inv._id}`,
      billNumber: inv.invoiceNumber || `GEN-${inv._id}`,
      trackingNumber: inv.customerId || "N/A",
      date: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
      branch: "Generated",
      dueAmount: inv.total || 0,
      paidAmount: inv.paidAmount || 0,
      balance: inv.balance || 0,
      currency: inv.currency || "USD",
      status: inv.status || "pending",
      source: "generated",
    }));

    // Format POS transactions as bills
    const formattedPosBills = posTransactions.map((pos) => ({
      id: `pos-${pos._id}`,
      billNumber: pos.receiptNo,
      trackingNumber: pos.customerCode || "Walk-in",
      date: pos.createdAt ? new Date(pos.createdAt).toISOString() : new Date().toISOString(),
      branch: "POS Terminal",
      dueAmount: pos.total,
      paidAmount: pos.total, // POS transactions are always paid
      balance: 0,
      currency: "USD",
      status: "paid" as const,
      source: "pos",
    }));

    // Combine all bills and sort by date
    const allBills = [...formattedInvoiceBills, ...formattedGeneratedInvoiceBills, ...formattedPosBills]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);

    return NextResponse.json({ bills: allBills });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const body = await req.json();
    const { packageId, trackingNumber, date, branch, dueAmount, currency = "JMD" } = body;

    if (!packageId || !trackingNumber || !date || !branch || !dueAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, "0")}`;

    // Get package information for customer details
    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      issueDate: new Date(date),
      dueDate: new Date(date), // Same as issue date for now
      currency,
      customer: {
        id: packageData.userId,
        name: packageData.receiverName,
        email: packageData.receiverEmail || "",
        phone: packageData.receiverPhone,
        address: packageData.receiverAddress,
        city: packageData.receiverCity,
        country: packageData.receiverCountry,
      },
      items: [{
        description: `Shipping for package ${trackingNumber}`,
        quantity: 1,
        unitPrice: parseFloat(dueAmount),
        taxRate: 0,
        amount: parseFloat(dueAmount),
        taxAmount: 0,
        total: parseFloat(dueAmount),
      }],
      subtotal: parseFloat(dueAmount),
      taxTotal: 0,
      discountAmount: 0,
      total: parseFloat(dueAmount),
      amountPaid: 0,
      balanceDue: parseFloat(dueAmount),
      package: packageId,
      status: "sent", // Equivalent to "unpaid" in Prisma
    });

    return NextResponse.json({ bill: { id: invoice._id, billNumber: invoice.invoiceNumber } });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}

