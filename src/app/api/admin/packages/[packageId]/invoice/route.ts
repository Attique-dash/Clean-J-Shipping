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
    
    // Get package details
    const pkg = await Package.findById(packageId).populate('userId');
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const user = pkg.userId as unknown as { _id: string; firstName?: string; lastName?: string; email: string; };
    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Use manual charges only (regularCharge + customCharge)
    const regularCharge = pkg.regularCharge || 0;
    const customCharge = pkg.customCharge || 0;
    const totalAmount = regularCharge + customCharge;
    const currency = pkg.chargeCurrency || 'JMD';

    if (totalAmount === 0) {
      return NextResponse.json({ error: "No charges defined. Please set Regular Charge and/or Custom Charge before generating invoice." }, { status: 400 });
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

    // Generate invoice using only manual charges
    const invoiceResult = await generateInvoiceForPackage(
      {
        trackingNumber: pkg.trackingNumber,
        userId: customer._id.toString(),
        customer,
        weight: pkg.weight,
        shipper: pkg.shipper,
        description: pkg.description,
        shippingCost: 0, // No auto shipping cost
        totalAmount: totalAmount, // Only manual charges
        entryDate: pkg.entryDate || pkg.createdAt
      },
      {
        regularCharge,
        customCharge,
        currency,
        includeShipping: false // No auto shipping charges
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
          ...(regularCharge > 0 ? [{
            description: 'Regular Charge',
            quantity: 1,
            unitPrice: regularCharge,
            total: regularCharge,
          }] : []),
          ...(customCharge > 0 ? [{
            description: 'Custom Charge',
            quantity: 1,
            unitPrice: customCharge,
            total: customCharge,
          }] : []),
        ],
        subtotal: total,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        total,
        currency: currency,
        status: "sent",
        createdBy: payload._id || payload.email,
        metadata: {
          packageId: pkg._id,
          trackingNumber: pkg.trackingNumber,
          regularCharge,
          customCharge,
        },
      });

      // Update package with invoice reference
      await Package.findByIdAndUpdate(packageId, {
        $push: {
          invoiceRecords: {
            invoiceNumber,
            invoiceDate: new Date(),
            currency: currency,
            totalValue: total,
            status: "sent",
          }
        },
        paymentStatus: "pending",
        totalAmount: total,
        chargeCurrency: currency,
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
