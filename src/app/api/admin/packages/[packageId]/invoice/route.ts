import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";

export async function POST(
  req: Request,
  { params }: { params: { packageId: string } }
) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const packageId = params.packageId;
    
    // Get package details
    const pkg = await Package.findById(packageId).populate('userId');
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const user = pkg.userId as unknown as { _id: string; name?: string; email: string; };
    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    // Calculate shipping cost (you can customize this logic)
    const shippingCost = pkg.shippingCost || 0;
    const subtotal = shippingCost;
    const taxAmount = subtotal * 0.15; // 15% tax
    const total = subtotal + taxAmount;

    // Create invoice from package
    const invoice = await GeneratedInvoice.create({
      invoiceNumber,
      customerId: user._id,
      customerName: user.name || user.email,
      customerEmail: user.email,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      items: [{
        description: `Shipping - ${pkg.itemDescription || 'Package'} (${pkg.trackingNumber})`,
        quantity: 1,
        unitPrice: shippingCost,
        total: shippingCost,
      }],
      subtotal,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 15,
      taxAmount,
      total,
      currency: "JMD",
      status: "sent",
      createdBy: payload._id || payload.email,
      metadata: {
        packageId: pkg._id,
        trackingNumber: pkg.trackingNumber,
      },
    });

    // Update package with invoice reference
    await Package.findByIdAndUpdate(packageId, {
      $push: {
        invoiceRecords: {
          invoiceNumber,
          invoiceDate: new Date(),
          currency: "JMD",
          totalValue: total,
          status: "sent",
        }
      },
      paymentStatus: "pending",
    });

    return NextResponse.json({
      ok: true,
      invoice_id: invoice._id,
      invoice_number: invoiceNumber,
      package_id: packageId,
      tracking_number: pkg.trackingNumber,
      total_amount: total,
    });
  } catch (error) {
    console.error("Package invoice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice from package" },
      { status: 500 }
    );
  }
}
