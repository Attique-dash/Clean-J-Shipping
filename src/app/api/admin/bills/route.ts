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
      // Fetch MongoDB invoices with populated package data
      Invoice.find({})
        .populate('package')
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
    const formattedInvoiceBills = invoices.map((inv) => {
      // Debug logging to see the actual data structure
      console.log('Invoice data:', JSON.stringify(inv, null, 2));
      
      // Try multiple sources for tracking number
      let trackingNumber = "N/A";
      
      // 1. Check populated package tracking number
      if (inv.package && typeof inv.package === 'object' && inv.package.trackingNumber) {
        trackingNumber = inv.package.trackingNumber;
        console.log('Found tracking number in populated package:', trackingNumber);
      }
      // 2. Check invoice items for tracking number
      else if (inv.items && inv.items.length > 0 && inv.items[0].trackingNumber) {
        trackingNumber = inv.items[0].trackingNumber;
        console.log('Found tracking number in invoice items:', trackingNumber);
      }
      // 3. Check if package reference exists but not populated (fallback to package ID)
      else if (inv.package) {
        trackingNumber = `PKG-${inv.package}`;
        console.log('Using package ID as tracking number:', trackingNumber);
      }
      // 4. Check customer name as last resort (original behavior)
      else if (inv.customer && inv.customer.name) {
        trackingNumber = inv.customer.name;
        console.log('Using customer name as tracking number:', trackingNumber);
      }

      console.log('Final tracking number:', trackingNumber);

      return {
        id: `invoice-${inv._id}`,
        billNumber: inv.invoiceNumber,
        trackingNumber,
        date: inv.issueDate ? new Date(inv.issueDate).toISOString() : new Date().toISOString(),
        branch: "Main Branch",
        dueAmount: inv.total,
        paidAmount: inv.amountPaid || 0,
        balance: inv.balanceDue || (inv.total - (inv.amountPaid || 0)),
        currency: inv.currency || "USD",
        status: inv.status === "paid" ? "paid" : inv.status === "overdue" ? "unpaid" : "unpaid",
        source: "invoice",
      };
    });

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

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type") || "invoice";
    
    if (!id) {
      return NextResponse.json({ error: "Bill ID is required" }, { status: 400 });
    }

    let result;

    // Handle different bill types
    if (type === "invoice") {
      result = await Invoice.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
    } else if (type === "generated") {
      result = await GeneratedInvoice.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ error: "Generated invoice not found" }, { status: 404 });
      }
    } else if (type === "pos") {
      result = await PosTransaction.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ error: "POS transaction not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Invalid bill type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Delete bill error:", error);
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
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
    const { packageId, trackingNumber, date, branch, dueAmount, currency = "USD" } = body;

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
      currency: "USD", // Default to USD instead of JMD
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

    // Create pre-alert automatically when bill is created
    try {
      const { PreAlert } = await import('@/models/PreAlert');
      const { User } = await import('@/models/User');
      const user = await User.findById(packageData.userId);
      if (user) {
        const existingPreAlert = await PreAlert.findOne({ trackingNumber });
        if (!existingPreAlert) {
          await PreAlert.create({
            userCode: user.userCode,
            customer: user._id,
            trackingNumber,
            carrier: packageData.shipper || "Unknown Carrier",
            origin: branch || "Main Warehouse",
            expectedDate: new Date(date),
            status: "approved",
            notes: `Bill created for package ${trackingNumber}`,
            decidedAt: new Date(),
          });
          console.log(`Pre-alert created for bill ${invoice.invoiceNumber}`);
        }
      }
    } catch (preAlertError) {
      console.error('Failed to create pre-alert for bill:', preAlertError);
      // Don't fail bill creation if pre-alert creation fails
    }

    return NextResponse.json({ bill: { id: invoice._id, billNumber: invoice.invoiceNumber } });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}

