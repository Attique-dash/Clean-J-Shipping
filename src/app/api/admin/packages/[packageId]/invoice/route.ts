import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";
import { generateInvoiceForPackage } from "@/app/api/warehouse/addpackage/subdir/invoice-generator";
import { User } from "@/models/User";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const { goodsCost = 0, goodsDescription = '' } = body;
    
    // Get package details
    const pkg = await Package.findById(packageId).populate('userId');
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const user = pkg.userId as unknown as { _id: string; firstName?: string; lastName?: string; email: string; };
    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create customer object for invoice generation
    const customer = {
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Jamaica'
    };

    // Generate invoice using the new system
    const invoiceResult = await generateInvoiceForPackage(
      {
        trackingNumber: pkg.trackingNumber,
        userId: customer._id.toString(),
        customer,
        weight: pkg.weight,
        shipper: pkg.shipper,
        description: pkg.description,
        shippingCost: pkg.shippingCost,
        totalAmount: pkg.shippingCost + goodsCost,
        entryDate: pkg.entryDate || pkg.createdAt
      },
      {
        goodsCost,
        goodsDescription: goodsDescription || `Goods from ${pkg.shipper || 'supplier'}`,
        includeShipping: true
      }
    );

    if (invoiceResult.success) {
      // Also create legacy invoice record for compatibility
      const invoiceNumber = invoiceResult.invoiceNumber;
      const total = invoiceResult.totalAmount;
      
      await GeneratedInvoice.create({
        invoiceNumber,
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`.trim() || customer.email,
        customerEmail: customer.email,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        items: [
          ...(goodsCost > 0 ? [{
            description: goodsDescription || `Goods from ${pkg.shipper}`,
            quantity: 1,
            unitPrice: goodsCost,
            total: goodsCost,
          }] : []),
          {
            description: `Shipping - ${pkg.description || 'Package'} (${pkg.trackingNumber})`,
            quantity: 1,
            unitPrice: pkg.shippingCost,
            total: pkg.shippingCost,
          }
        ],
        subtotal: total,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        total,
        currency: "JMD",
        status: "sent",
        createdBy: payload._id || payload.email,
        metadata: {
          packageId: pkg._id,
          trackingNumber: pkg.trackingNumber,
          goodsCost,
          goodsDescription,
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
        success: true,
        invoice_id: invoiceResult.invoiceId,
        invoice_number: invoiceNumber,
        payment_link: invoiceResult.paymentLink,
        package_id: packageId,
        tracking_number: pkg.trackingNumber,
        total_amount: total,
      });
    } else {
      return NextResponse.json(
        { error: invoiceResult.error || "Failed to generate invoice" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Package invoice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice from package" },
      { status: 500 }
    );
  }
}
