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
      
            
      return {
        tracking_number: inv.package?.trackingNumber || inv.invoiceNumber,
        description: inv.items?.[0]?.description || inv.notes || `Invoice ${inv.invoiceNumber}`,
        invoice_number: inv.invoiceNumber,
        invoice_date: inv.issueDate ? new Date(inv.issueDate).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
        currency: inv.currency || "USD",
        amount_due: Math.max(0, balanceDue),
        payment_status: paymentStatus,
        last_updated: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined),
      };
    });

    // Create bills from package records (legacy)
    const packageBills: Bill[] = pkgs.flatMap((p: IPackage & { 
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
    }) => {
      const recs = Array.isArray(p.invoiceRecords) ? p.invoiceRecords : [];
      
      // Use package's totalAmount or shippingCost as fallback if no invoice records
      // Handle missing fields - default to 0 if no financial data exists
      const packageAmount = (typeof p.totalAmount === "number" && p.totalAmount > 0) ? p.totalAmount : 
                           (typeof p.shippingCost === "number" && p.shippingCost > 0) ? p.shippingCost : 0;
      
            
      if (recs.length === 0) {
        const docs = Array.isArray(p.invoiceDocuments) ? p.invoiceDocuments : [];
        const payment_status: Bill["payment_status"] = docs.length > 0 ? "submitted" : "none";
        return [
          {
            tracking_number: p.trackingNumber,
            description: p.itemDescription || p.description,
            invoice_number: `PKG-${p.trackingNumber}`,
            invoice_date: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
            amount_due: packageAmount,
            payment_status,
            currency: "JMD",
            last_updated: (p.updatedAt || p.createdAt) ? new Date(p.updatedAt || p.createdAt).toISOString() : undefined,
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
          tracking_number: p.trackingNumber,
          description: p.itemDescription || p.description,
          invoice_number: latest.invoiceNumber || `PKG-${p.trackingNumber}`,
          invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : 
                       p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
          currency: latest.currency || "JMD",
          amount_due: amountDue,
          payment_status: paymentStatus,
          last_updated: (p.updatedAt || p.createdAt) ? new Date(p.updatedAt || p.createdAt).toISOString() : undefined,
        },
      ];
    });

    // Combine both types of bills, with admin invoices taking precedence
    // Only include package bills that don't have corresponding admin invoices
    const invoiceTrackingNumbers = new Set(invoiceBills.map(b => b.tracking_number));
    
    // Filter out package bills that have corresponding admin invoices
    const filteredPackageBills = packageBills.filter(bill => 
      !invoiceTrackingNumbers.has(bill.tracking_number) && bill.amount_due > 0
    );
    
    const bills = [...invoiceBills, ...filteredPackageBills];
    
    
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error in /api/customer/bills:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}