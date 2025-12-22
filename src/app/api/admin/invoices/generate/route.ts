// my-app/src/app/api/admin/invoices/generate/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";
import { emailService } from "@/lib/email-service";
import { z } from "zod";

const invoiceSchema = z.object({
  invoice_number: z.string().min(1),
  customer_id: z.string().min(1),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  issue_date: z.string(),
  due_date: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total: z.number().min(0),
  })).min(1),
  subtotal: z.number().min(0),
  discount_percentage: z.number().min(0).max(100).default(0),
  discount_amount: z.number().min(0).default(0),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  total: z.number().min(0),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
});

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const validated = invoiceSchema.parse(body);

    // Check if invoice number already exists
    const existing = await GeneratedInvoice.findOne({ 
      invoiceNumber: validated.invoice_number 
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "Invoice number already exists" },
        { status: 409 }
      );
    }

    // Create invoice (map items to schema shape)
    const invoice = await GeneratedInvoice.create({
      invoiceNumber: validated.invoice_number,
      customerId: validated.customer_id,
      customerName: validated.customer_name,
      customerEmail: validated.customer_email,
      issueDate: new Date(validated.issue_date),
      dueDate: validated.due_date ? new Date(validated.due_date) : undefined,
      items: validated.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      subtotal: validated.subtotal,
      discountPercentage: validated.discount_percentage,
      discountAmount: validated.discount_amount,
      taxRate: validated.tax_rate,
      taxAmount: validated.tax_amount,
      total: validated.total,
      notes: validated.notes,
      currency: validated.currency,
      status: "draft",
      createdBy: payload._id || payload.email,
    });

    // Send email notification (optional)
    try {
      await emailService.sendEmail({
        to: validated.customer_email,
        subject: `Invoice ${validated.invoice_number} - Clean J Shipping`,
        html: `
          <h2>Invoice Generated</h2>
          <p>Dear ${validated.customer_name},</p>
          <p>A new invoice has been generated for you.</p>
          <p><strong>Invoice Number:</strong> ${validated.invoice_number}</p>
          <p><strong>Total Amount:</strong> ${validated.currency} ${validated.total.toFixed(2)}</p>
          <p>Please login to your account to view the full invoice details.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send invoice email:", emailError);
    }

    return NextResponse.json({
      ok: true,
      invoice_id: invoice._id,
      invoice_number: invoice.invoiceNumber,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Invoice generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status");

    const query: any = {};
    if (status) query.status = status;

    const [invoices, total] = await Promise.all([
      GeneratedInvoice.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GeneratedInvoice.countDocuments(query),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Invoice list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}