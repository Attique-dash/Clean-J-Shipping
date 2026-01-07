// Example: src/app/api/customer/bills/route.ts
// Apply this pattern to ALL customer API routes

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import Invoice from "@/models/Invoice";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

export async function GET(req: Request) {
  try {
    // ✅ FIX: Added await here
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get consistent user ID
    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch package-based bills first
    const pkgs = await Package.find({ userId, status: { $ne: "Deleted" } })
      .select("trackingNumber invoiceDocuments invoiceRecords updatedAt createdAt description totalAmount shippingCost itemDescription")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    
    // Fetch admin invoices separately with error handling
    let invoices: any[] = [];
    try {
      invoices = await Invoice.find({ userId: new Types.ObjectId(userId) })
        .populate('package', 'trackingNumber')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
    } catch (err) {
      console.error("Error fetching invoices:", err);
      // Continue without invoices if there's an error
      invoices = [];
    }

    type Bill = {
      tracking_number: string;
      description?: string;
      invoice_number?: string;
      invoice_date?: string;
      currency?: string;
      amount_due: number;
      payment_status: "submitted" | "reviewed" | "rejected" | "none" | "paid" | "overdue" | "partially_paid";
      document_url?: string;
      last_updated?: string;
    };

    // Create bills from admin invoices
    const invoiceBills: Bill[] = invoices.map((inv: {
      _id?: string;
      invoiceNumber: string;
      status: string;
      issueDate?: Date | string;
      createdAt?: Date | string;
      currency?: string;
      total?: number;
      amountPaid?: number;
      balanceDue?: number;
      items?: Array<{
        description?: string;
      }>;
      notes?: string;
      package?: {
        trackingNumber?: string;
      };
      updatedAt?: Date | string;
    }) => {
      const amountPaid = Number(inv.amountPaid) || 0;
      const total = Number(inv.total) || 0;
      const balanceDue = Number(inv.balanceDue) || (total - amountPaid);
      
      let paymentStatus: Bill["payment_status"];
      if (inv.status === "paid" || amountPaid >= total) {
        paymentStatus = "paid";
      } else if (inv.status === "overdue") {
        paymentStatus = "overdue";
      } else if (amountPaid > 0) {
        paymentStatus = "partially_paid";
      } else if (inv.status === "sent") {
        paymentStatus = "submitted";
      } else {
        paymentStatus = "none";
      }
      
      // Ensure tracking_number is always a string
      const trackingNumber = inv.package?.trackingNumber || inv.invoiceNumber || 'UNKNOWN';
            
      return {
        tracking_number: trackingNumber,
        description: inv.items?.[0]?.description || inv.notes || `Invoice ${inv.invoiceNumber}`,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.issueDate ? new Date(inv.issueDate).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        currency: inv.currency || "JMD",
        amount_due: Math.max(0, balanceDue),
        payment_status: paymentStatus,
        last_updated: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
      };
    });

    // Create bills from package records (legacy)
    const packageBills: Bill[] = (pkgs as unknown[]).flatMap((p) => {
      const pkg = p as IPackage & { 
        invoiceRecords?: Array<{ 
          invoiceNumber?: string; 
          invoiceDate?: Date | string; 
          currency?: string; 
          totalValue?: number; 
          status?: string; 
          amountPaid?: number;
        }>;
        invoiceDocuments?: unknown[];
        totalAmount?: number;
        shippingCost?: number;
        itemDescription?: string;
      };
      const recs = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
      
      // Use package's totalAmount (includes tax) as primary source
      // Fallback to shippingCost + 15% tax if totalAmount not set
      let packageAmount = 0;
      if (typeof pkg.totalAmount === "number" && pkg.totalAmount > 0) {
        packageAmount = pkg.totalAmount;
      } else if (typeof pkg.shippingCost === "number" && pkg.shippingCost > 0) {
        packageAmount = pkg.shippingCost + (pkg.shippingCost * 0.15); // Add 15% tax
      }
            
      if (recs.length === 0) {
        const docs = Array.isArray(pkg.invoiceDocuments) ? pkg.invoiceDocuments : [];
        let payment_status: Bill["payment_status"];
        let description: string;
        
        if (packageAmount > 0) {
          payment_status = "submitted"; // Package has automatic invoice
          description = `${pkg.itemDescription || pkg.description} (Auto-generated invoice)`;
        } else {
          payment_status = docs.length > 0 ? "submitted" : "none";
          description = pkg.itemDescription || pkg.description || "Invoice pending generation";
        }
        
        return [
          {
            tracking_number: pkg.trackingNumber,
            description,
            invoice_number: packageAmount > 0 ? `AUTO-INV-${pkg.trackingNumber}` : `PKG-${pkg.trackingNumber}`,
            invoice_date: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : undefined,
            amount_due: packageAmount,
            payment_status,
            currency: "JMD",
            last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date(pkg.updatedAt || pkg.createdAt).toISOString() : undefined,
          },
        ];
      }
      
      // Get the most recent invoice record
      const latest = recs[recs.length - 1];
      const totalAmount = typeof latest.totalValue === "number" ? latest.totalValue : packageAmount;
      const amountPaid = typeof latest.amountPaid === "number" ? latest.amountPaid : 0;
      
      // Determine payment status and amount due
      let paymentStatus: Bill["payment_status"];
      let amountDue: number;
      
      if (latest.status === "paid" || amountPaid >= totalAmount) {
        paymentStatus = "paid";
        amountDue = 0;
      } else if (latest.status === "overdue") {
        paymentStatus = "overdue";
        amountDue = Math.max(0, totalAmount - amountPaid);
      } else if (amountPaid > 0) {
        paymentStatus = "partially_paid";
        amountDue = Math.max(0, totalAmount - amountPaid);
      } else {
        paymentStatus = (latest.status as Bill["payment_status"]) || "submitted";
        amountDue = totalAmount;
      }
      
      return [
        {
          tracking_number: pkg.trackingNumber,
          description: pkg.itemDescription || pkg.description,
          invoice_number: latest.invoiceNumber || `PKG-${pkg.trackingNumber}`,
          invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : 
                       pkg.createdAt ? new Date(pkg.createdAt).toISOString() : undefined,
          currency: latest.currency || "JMD",
          amount_due: amountDue,
          payment_status: paymentStatus,
          last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date(pkg.updatedAt || pkg.createdAt).toISOString() : undefined,
        },
      ];
    });

    // Combine both types of bills, with admin invoices taking precedence
    // Create a map to track the most recent status for each tracking number
    const billStatusMap = new Map<string, { bill: Bill; source: string; lastUpdated: Date }>();
    
    // Add admin invoices first (highest priority)
    invoiceBills.forEach(bill => {
      const lastUpdated = new Date(bill.last_updated || 0);
      billStatusMap.set(bill.tracking_number, { bill, source: 'admin', lastUpdated });
    });
    
    // Add package bills only if no admin invoice exists or if package bill is more recent
    packageBills.forEach(bill => {
      const lastUpdated = new Date(bill.last_updated || 0);
      const existing = billStatusMap.get(bill.tracking_number);
      
      if (!existing || lastUpdated > existing.lastUpdated) {
        billStatusMap.set(bill.tracking_number, { bill, source: 'package', lastUpdated });
      }
    });
    
    // Convert map back to array, sorted by last updated date
    const bills = Array.from(billStatusMap.values())
      .map(({ bill }) => bill)
      .sort((a, b) => new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime());
    
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error in /api/customer/bills:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}