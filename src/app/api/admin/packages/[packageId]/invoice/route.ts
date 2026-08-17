import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
  
  // Check auth using NextAuth session first, fallback to getAuthFromRequest
  const session = await getServerSession(authOptions);
  const payload = await getAuthFromRequest(req);
  const userRole = session?.user?.role || payload?.role;
  
  if (!userRole || !['admin', 'warehouse_staff', 'customer_support'].includes(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    // Get package details
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Resolve charges (prioritize request body, then existing package values)
    const regularCharge = body.regularCharge !== undefined && body.regularCharge !== ''
      ? Number(body.regularCharge)
      : Number(pkg.regularCharge || (pkg as any).regular_charge || 0);

    const customCharge = body.customCharge !== undefined && body.customCharge !== ''
      ? Number(body.customCharge)
      : Number(pkg.customCharge || (pkg as any).custom_charge || 0);

    const totalAmount = regularCharge + customCharge;
    const currency = (body.chargeCurrency || body.currency || pkg.chargeCurrency || (pkg as any).charge_currency || pkg.pricePaidCurrency || pkg.paymentCurrency || 'JMD').toString().trim().toUpperCase();

    console.log('[Invoice Generation] Package details & charges:', {
      packageId,
      trackingNumber: pkg.trackingNumber,
      regularCharge,
      customCharge,
      totalAmount,
      currency
    });

    if (totalAmount <= 0) {
      return NextResponse.json({ 
        error: "Total charges must be greater than 0. Please set Regular Charge and/or Custom Charge before generating invoice." 
      }, { status: 400 });
    }

    // Resolve customer with robust multi-tier fallback
    let user: any = null;
    const userIdCandidate = pkg.userId || (pkg as any).customer;
    if (userIdCandidate) {
      try {
        user = await User.findById(userIdCandidate).lean();
      } catch (err) {
        console.warn('[Invoice Generation] Error finding user by ID:', err);
      }
    }

    if (!user && (pkg.userCode || (pkg as any).UserCode)) {
      const code = (pkg.userCode || (pkg as any).UserCode).toString().toUpperCase();
      user = await User.findOne({
        $or: [{ userCode: code }, { shippingId: code }]
      }).lean();
    }

    if (!user && ((pkg as any).customerEmail || (pkg as any).receiverEmail || (pkg as any).recipient?.email)) {
      const emailToFind = (pkg as any).customerEmail || (pkg as any).receiverEmail || (pkg as any).recipient?.email;
      user = await User.findOne({ email: emailToFind }).lean();
    }

    const customerEmail = user?.email || (pkg as any).customerEmail || (pkg as any).receiverEmail || (pkg.recipient as any)?.email;
    if (!customerEmail) {
      return NextResponse.json({ 
        error: "Customer email not found for this package. Please ensure package has an assigned customer or recipient email." 
      }, { status: 400 });
    }

    // Create customer object for invoice generation
    const customer = {
      _id: user?._id || pkg._id,
      firstName: user?.firstName || (pkg as any).receiverName || (pkg.recipient as any)?.name || 'Valued',
      lastName: user?.lastName || (pkg.recipient as any)?.lastName || '',
      email: customerEmail,
      phone: user?.phone || (pkg.recipient as any)?.phone || '',
      address: user?.address || (pkg.recipient as any)?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zipCode: user?.zipCode || '',
      country: user?.country || (pkg.recipient as any)?.country || 'Jamaica'
    };

    // Generate invoice using manual charges
    console.log('[Invoice Generation] Calling invoice generator with:', {
      regularCharge,
      customCharge,
      currency,
      includeShipping: false
    });

    const invoiceResult = await generateInvoiceForPackage(
      {
        trackingNumber: pkg.trackingNumber,
        packageId: pkg._id.toString(),
        userId: customer._id.toString(),
        customer,
        weight: pkg.weight,
        shipper: pkg.shipper,
        description: pkg.description || (pkg as any).itemDescription || '',
        shippingCost: 0,
        totalAmount: totalAmount,
        entryDate: pkg.entryDate || pkg.createdAt || new Date()
      },
      {
        regularCharge,
        customCharge,
        currency,
        includeShipping: false
      }
    );

    console.log('[Invoice Generation] Invoice generator result:', invoiceResult);

    if (invoiceResult.success) {
      const invoiceNumber = invoiceResult.invoiceNumber;
      const total = invoiceResult.totalAmount;
      const creator = session?.user?.name || session?.user?.email || payload?.email || 'admin';
      
      // Also create legacy GeneratedInvoice record for backwards compatibility
      try {
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
          createdBy: creator,
          metadata: {
            packageId: pkg._id,
            trackingNumber: pkg.trackingNumber,
            regularCharge,
            customCharge,
          },
        });
      } catch (genInvErr) {
        console.warn('[Invoice Generation] Warning creating GeneratedInvoice doc:', genInvErr);
      }

      // Update package with invoice reference and synced charge amounts
      await Package.findByIdAndUpdate(packageId, {
        $set: {
          billingInvoiceId: invoiceResult.invoiceId,
          invoiceStatus: "billed",
          regularCharge: regularCharge,
          customCharge: customCharge,
          chargeCurrency: currency,
          regular_charge: regularCharge,
          custom_charge: customCharge,
          charge_currency: currency,
          totalAmount: total,
          paymentStatus: pkg.paymentStatus === 'paid' ? 'paid' : 'pending',
        },
        $push: {
          invoiceRecords: {
            invoiceNumber,
            invoiceDate: new Date(),
            currency: currency,
            totalValue: total,
            status: "sent",
          }
        },
      });

      return NextResponse.json({
        success: true,
        invoice_id: invoiceResult.invoiceId,
        invoice_number: invoiceNumber,
        payment_link: invoiceResult.paymentLink,
        package_id: packageId,
        tracking_number: pkg.trackingNumber,
        total_amount: total,
        currency,
        message: `Invoice ${invoiceNumber} generated and sent to ${customer.email}`
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
      { error: "Failed to generate invoice from package", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
