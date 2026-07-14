import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
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

    // Query invoices - ensure we're checking for invoiceType
    const invoices = await Invoice.find({
      $or: [
        { userId: new Types.ObjectId(userId) },
        { 'customer.id': userId }
      ],
      // IMPORTANT: Only show invoices that are NOT draft and NOT cancelled
      status: { $in: ['sent', 'paid', 'unpaid', 'overdue'] },
      // Optional: filter by invoiceType
      invoiceType: { $in: ['billing', 'commercial'] }
    })
      .populate('package', 'trackingNumber')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    console.log(`[Customer Invoices API] Found ${invoices.length} invoices for user ${userId}`);
    
    if (invoices.length === 0) {
      console.log(`[Customer Invoices API] No invoices found. User ID: ${userId}`);
      console.log(`[Customer Invoices API] Query filter applied for status and invoiceType`);
    }

    // Transform invoices for customer view
    const transformedInvoices = invoices.map((inv: any) => ({
      _id: inv._id?.toString(),
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: inv.total,
      amountPaid: inv.amountPaid,
      balanceDue: inv.balanceDue,
      currency: inv.currency,
      trackingNumber: inv.package?.trackingNumber || inv.tracking_number,
      description: inv.items?.[0]?.description || 'Invoice',
      customer: inv.customer,
      items: inv.items,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json({ 
      invoices: transformedInvoices,
      total: invoices.length 
    });

  } catch (error) {
    console.error("[Customer Invoices API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
