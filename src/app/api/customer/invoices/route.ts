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

    // Query invoices - FIXED: More lenient matching for customer invoices
    const invoices = await Invoice.find({
      $or: [
        { userId: new Types.ObjectId(userId) },
        { userId: userId }, // Try string match too
        { 'customer.id': userId },
        { 'customer.id': new Types.ObjectId(userId) }
      ]
    })
      .where('status').ne('draft').ne('cancelled')
      .where('invoiceType').in(['billing', 'commercial', 'system'])
      .populate('package', 'trackingNumber')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    console.log(`[Customer Invoices API] Query userId: ${userId}`);
    console.log(`[Customer Invoices API] Found ${invoices.length} invoices`);

    if (invoices.length === 0) {
      // Debug: Check what invoices exist in database
      const allInvoices = await Invoice.find({}).limit(5).lean();
      console.log(`[Customer Invoices API] DEBUG - Total invoices in DB: ${allInvoices.length}`);
      if (allInvoices.length > 0) {
        console.log(`[Customer Invoices API] DEBUG - Sample invoice:`, {
          userId: allInvoices[0].userId,
          customerId: allInvoices[0]['customer.id'],
          status: allInvoices[0].status,
          invoiceType: allInvoices[0].invoiceType
        });
      }
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
