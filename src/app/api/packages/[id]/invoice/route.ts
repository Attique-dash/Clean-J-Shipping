import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import Invoice, { IInvoice } from "@/models/Invoice";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Get package details
    const packageData = await Package.findById(params.id).populate('customer');
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Get customer details
    const customer = await User.findOne({ userCode: packageData.userCode });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate shipping cost (you can customize this logic)
    const shippingCost = packageData.weight ? packageData.weight * 5 : 10; // $5 per kg or minimum $10
    const taxRate = 15; // 15% tax
    const taxAmount = shippingCost * (taxRate / 100);
    const total = shippingCost + taxAmount;

    // Create invoice items
    const invoiceItems = [
      {
        description: `Shipping for package ${packageData.trackingNumber}`,
        quantity: 1,
        unitPrice: shippingCost,
        taxRate: taxRate,
        amount: shippingCost,
        taxAmount: taxAmount,
        total: total
      }
    ];

    // Create invoice
    const invoice = new Invoice({
      customer: {
        id: customer._id.toString(),
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        country: customer.country || 'Jamaica',
        taxId: ''
      },
      items: invoiceItems,
      subtotal: shippingCost,
      taxTotal: taxAmount,
      total: total,
      amountPaid: 0,
      balanceDue: total,
      package: packageData._id,
      notes: `Invoice for package ${packageData.trackingNumber}. ${packageData.description || ''}`
    });

    await invoice.save();

    return NextResponse.json({
      message: "Invoice created successfully",
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: invoice.status
      }
    });

  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Get invoices for this package
    const invoices = await Invoice.find({ package: params.id })
      .sort({ createdAt: -1 })
      .select('invoiceNumber status total amountPaid balanceDue createdAt');

    return NextResponse.json({ invoices });

  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
