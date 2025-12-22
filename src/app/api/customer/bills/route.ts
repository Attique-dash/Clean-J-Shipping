// Example: src/app/api/customer/bills/route.ts
// Apply this pattern to ALL customer API routes

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

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

    const pkgs = await Package.find({ userId, status: { $ne: "Deleted" } })
      .select("trackingNumber invoiceDocuments invoiceRecords updatedAt createdAt description")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

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

    const bills: Bill[] = pkgs.flatMap((p: IPackage & { 
      invoiceRecords?: Array<{ 
        invoiceNumber?: string; 
        invoiceDate?: Date | string; 
        currency?: string; 
        totalValue?: number; 
        status?: string; 
        amountPaid?: number;
      }>; 
      invoiceDocuments?: unknown[] 
    }) => {
      const recs = Array.isArray(p.invoiceRecords) ? p.invoiceRecords : [];
      if (recs.length === 0) {
        const docs = Array.isArray(p.invoiceDocuments) ? p.invoiceDocuments : [];
        const payment_status: Bill["payment_status"] = docs.length > 0 ? "submitted" : "none";
        return [
          {
            tracking_number: p.trackingNumber,
            description: (p as { description?: string }).description,
            amount_due: 0,
            payment_status,
            last_updated: (p.updatedAt || p.createdAt) ? new Date((p.updatedAt || p.createdAt) as any).toISOString() : undefined,
          },
        ];
      }
      
      // Get the most recent invoice record
      const latest = recs[recs.length - 1];
      const totalAmount = typeof latest.totalValue === "number" ? latest.totalValue : 0;
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
          description: (p as { description?: string }).description,
          invoice_number: latest.invoiceNumber,
          invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : undefined,
          currency: latest.currency || "JMD",
          amount_due: amountDue,
          payment_status: paymentStatus,
          last_updated: (p.updatedAt || p.createdAt) ? new Date((p.updatedAt || p.createdAt) as any).toISOString() : undefined,
        },
      ];
    });

    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error in /api/customer/bills:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}