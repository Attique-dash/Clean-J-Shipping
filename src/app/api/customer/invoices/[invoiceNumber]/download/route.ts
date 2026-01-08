import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getAuthFromRequest } from "@/lib/rbac";
import { ExportService } from "@/lib/export-service";
import { Types } from "mongoose";

interface InvoiceItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  amount?: number;
  taxAmount?: number;
  total?: number;
}

interface PaymentHistory {
  amount?: number;
  date?: string | Date;
  method?: string;
  reference?: string;
}

interface InvoiceCustomer {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
}

interface InvoiceData {
  invoiceNumber?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  status?: string;
  customer?: InvoiceCustomer;
  items?: InvoiceItem[];
  subtotal?: number;
  taxTotal?: number;
  discountAmount?: number;
  total?: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
  notes?: string;
  paymentHistory?: PaymentHistory[];
}

export async function GET(req: Request, { params }: { params: Promise<{ invoiceNumber: string }> }) {
  try {
    const { invoiceNumber } = await params;
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
    const invoiceResult = await Invoice.findOne({ 
      invoiceNumber: invoiceNumber,
      userId: new Types.ObjectId(userId) 
    }).lean();

    if (!invoiceResult) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get format from query params
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'pdf';

    // Prepare invoice data for export
    const invoice = invoiceResult as InvoiceData;
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber || invoiceNumber,
      issueDate: invoice.issueDate ? new Date(String(invoice.issueDate)).toISOString() : new Date().toISOString(),
      dueDate: invoice.dueDate ? new Date(String(invoice.dueDate)).toISOString() : new Date().toISOString(),
      status: invoice.status || 'draft',
      customer: {
        name: invoice.customer?.name || 'N/A',
        email: invoice.customer?.email || 'N/A',
        address: invoice.customer?.address || '',
        phone: invoice.customer?.phone || ''
      },
      items: (invoice.items || []).map((item: InvoiceItem) => ({
        description: item.description || 'Service',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        amount: Number(item.amount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        total: Number(item.total) || 0
      })),
      subtotal: Number(invoice.subtotal) || 0,
      taxTotal: Number(invoice.taxTotal) || 0,
      discountAmount: Number(invoice.discountAmount) || 0,
      total: Number(invoice.total) || 0,
      amountPaid: Number(invoice.amountPaid) || 0,
      balanceDue: Number(invoice.balanceDue) || 0,
      currency: invoice.currency || 'USD',
      notes: invoice.notes || '',
      paymentHistory: (invoice.paymentHistory || []).map((payment: PaymentHistory) => ({
        amount: Number(payment.amount) || 0,
        date: payment.date ? new Date(String(payment.date)).toISOString() : new Date().toISOString(),
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
