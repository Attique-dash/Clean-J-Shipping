import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getAuthFromRequest } from "@/lib/rbac";
import { ExportService } from "@/lib/export-service";
import { Types } from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: { invoiceNumber: string } }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user ID
    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the invoice
    const invoice = await Invoice.findOne({ 
      invoiceNumber: params.invoiceNumber,
      userId: new Types.ObjectId(userId) 
    }).lean();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get format from query params
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'pdf';

    // Prepare invoice data for export
    const invoiceData = {
      invoiceNumber: (invoice as any).invoiceNumber,
      issueDate: (invoice as any).issueDate ? new Date((invoice as any).issueDate).toISOString() : new Date().toISOString(),
      dueDate: (invoice as any).dueDate ? new Date((invoice as any).dueDate).toISOString() : new Date().toISOString(),
      status: (invoice as any).status || 'draft',
      customer: {
        name: (invoice as any).customer?.name || 'N/A',
        email: (invoice as any).customer?.email || 'N/A',
        address: (invoice as any).customer?.address || '',
        phone: (invoice as any).customer?.phone || ''
      },
      items: ((invoice as any).items || []).map((item: any) => ({
        description: item.description || 'Service',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        amount: Number(item.amount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        total: Number(item.total) || 0
      })),
      subtotal: Number((invoice as any).subtotal) || 0,
      taxTotal: Number((invoice as any).taxTotal) || 0,
      discountAmount: Number((invoice as any).discountAmount) || 0,
      total: Number((invoice as any).total) || 0,
      amountPaid: Number((invoice as any).amountPaid) || 0,
      balanceDue: Number((invoice as any).balanceDue) || 0,
      currency: (invoice as any).currency || 'USD',
      notes: (invoice as any).notes || '',
      paymentHistory: ((invoice as any).paymentHistory || []).map((payment: any) => ({
        amount: Number(payment.amount) || 0,
        date: payment.date ? new Date(payment.date).toISOString() : new Date().toISOString(),
        method: payment.method || 'Unknown',
        reference: payment.reference || ''
      }))
    };

    if (format === 'excel') {
      // Excel export
      const invoiceSummary = {
        'Invoice Number': invoiceData.invoiceNumber,
        'Customer Name': invoiceData.customer.name,
        'Customer Email': invoiceData.customer.email,
        'Customer Phone': invoiceData.customer.phone,
        'Customer Address': invoiceData.customer.address,
        'Issue Date': new Date(invoiceData.issueDate).toLocaleDateString(),
        'Due Date': new Date(invoiceData.dueDate).toLocaleDateString(),
        'Status': invoiceData.status.toUpperCase(),
        'Currency': invoiceData.currency,
        'Subtotal': `$${invoiceData.subtotal.toFixed(2)}`,
        'Tax Total': `$${invoiceData.taxTotal.toFixed(2)}`,
        'Discount': `$${invoiceData.discountAmount.toFixed(2)}`,
        'Total Amount': `$${invoiceData.total.toFixed(2)}`,
        'Amount Paid': `$${invoiceData.amountPaid.toFixed(2)}`,
        'Balance Due': `$${invoiceData.balanceDue.toFixed(2)}`,
        'Notes': invoiceData.notes || 'N/A'
      };

      const itemsData = invoiceData.items.map((item: any, index: number) => ({
        'Item #': index + 1,
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit Price': `$${item.unitPrice.toFixed(2)}`,
        'Amount': `$${item.amount.toFixed(2)}`,
        'Tax Rate': `${item.taxRate}%`,
        'Tax Amount': `$${item.taxAmount.toFixed(2)}`,
        'Line Total': `$${item.total.toFixed(2)}`
      }));

      ExportService.toExcelMultiSheet([
        { name: 'Invoice Summary', data: [invoiceSummary] },
        { name: 'Invoice Items', data: itemsData }
      ], `invoice_${invoiceData.invoiceNumber}_complete`);

      return NextResponse.json({ success: true, message: 'Excel download started' });
    } else {
      // PDF export
      ExportService.toInvoicePDF(invoiceData, `invoice_${invoiceData.invoiceNumber}`);
      return NextResponse.json({ success: true, message: 'PDF download started' });
    }

  } catch (error) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Failed to download invoice" },
      { status: 500 }
    );
  }
}
