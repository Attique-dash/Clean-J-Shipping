import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';
import { syncBillingInvoiceForPackage, createBillingInvoiceForPackage } from '@/lib/package-billing';
import { EmailService } from '@/lib/email-service';
import {
  toKcdPackage,
  formStatusToPackageStatus,
  packageStatusToFormStatus,
  parsePackagePayments,
  serializePackagePayments,
  getPackagePaymentCurrency,
  calcShippingCostUsd,
} from '@/lib/package-format';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const packageData = await Package.findById(packageId)
      .populate('userId', 'firstName lastName email phone userCode')
      .lean();
    
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const doc = packageData as Record<string, unknown>;
    const kcd = toKcdPackage(doc);
    const payment = parsePackagePayments(kcd.PackagePayments, doc);

    const formPayload = {
      ...kcd,
      trackingNumber: kcd.TrackingNumber,
      userCode: kcd.UserCode,
      weight: kcd.weightLbs ?? kcd.Weight,
      weightLbs: kcd.weightLbs ?? kcd.Weight,
      description: kcd.Description,
      itemDescription: asString(doc.itemDescription),
      entryDate: kcd.EntryDate,
      status: packageStatusToFormStatus(kcd.PackageStatus ?? 0, asString(doc.status)),
      serviceMode: asString(doc.serviceMode) || 'air',
      shipper: kcd.Shipper,
      senderName: asString(doc.senderName) || asString((doc.sender as Record<string, unknown>)?.name),
      senderEmail: asString(doc.senderEmail) || asString((doc.sender as Record<string, unknown>)?.email),
      senderPhone: asString(doc.senderPhone) || asString((doc.sender as Record<string, unknown>)?.phone),
      senderAddress: asString(doc.senderAddress) || asString((doc.sender as Record<string, unknown>)?.address),
      senderCity: asString(doc.senderCity),
      senderState: asString(doc.senderState),
      senderZipCode: asString(doc.senderZipCode),
      senderCountry: asString(doc.senderCountry) || asString((doc.sender as Record<string, unknown>)?.country),
      itemValue: payment.itemValueUsd,
      itemValueUsd: payment.itemValueUsd,
      totalAmount: payment.totalAmountUsd,
      paymentCurrency: payment.currency,
      pricePaidCurrency: payment.currency,
      specialInstructions: asString(doc.specialInstructions),
      branch: asString(doc.Branch || doc.branch),
      pieces: doc.Pieces ?? doc.pieces ?? 1,
      dimensions: {
        length: kcd.Length ?? doc.length,
        width: kcd.Width ?? doc.width,
        height: kcd.Height ?? doc.height,
        unit:
          asString(doc.dimensionUnit) ||
          asString((doc.dimensions as Record<string, unknown> | undefined)?.unit) ||
          'cm',
      },
      regularCharge: asNumber(doc.regularCharge ?? doc.regular_charge),
      customCharge: asNumber(doc.customCharge ?? doc.custom_charge),
      chargeCurrency: asString(doc.chargeCurrency ?? doc.charge_currency) || 'JMD',
    };

    console.log('[Admin Package Detail API] KCD format:', JSON.stringify(formPayload, null, 2));
    return NextResponse.json(formPayload);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'warehouse_staff', 'customer_support'].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const body = await req.json();
    
    const existingPackage = await Package.findById(packageId);
    if (!existingPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const existingDoc = existingPackage.toObject() as Record<string, unknown>;
    const weightLbs = asNumber(
      body.weightLbs ?? body.Weight ?? body.weight ?? existingDoc.Weight ?? existingDoc.weightLbs
    );
    const itemValueUsd = asNumber(
      body.itemValueUSD ?? body.itemValue ?? body.value ?? existingDoc.itemValueUSD ?? existingDoc.itemValue
    );
    const totalAmount = body.totalAmount !== undefined && body.totalAmount !== ''
      ? asNumber(body.totalAmount)
      : asNumber(existingDoc.totalAmount) || itemValueUsd;
    const paymentCurrency = getPackagePaymentCurrency(body, parsePackagePayments(
      asString(existingDoc.PackagePayments),
      existingDoc
    ));

    const existingPayment = parsePackagePayments(
      asString(existingDoc.PackagePayments),
      existingDoc
    );
    const paymentMeta = {
      ...existingPayment,
      itemValueUsd,
      shippingCostUsd: calcShippingCostUsd(weightLbs),
      totalAmountUsd: totalAmount,
      currency: paymentCurrency,
      paymentMethod: asString(body.paymentMethod) || existingPayment.paymentMethod,
      paymentStatus: asString(body.paymentStatus) || existingPayment.paymentStatus,
    };

    const statusStr = asString(body.status);
    const packageStatus = statusStr
      ? formStatusToPackageStatus(statusStr)
      : asNumber(existingDoc.PackageStatus, 0);

    const dimensions = body.dimensions as Record<string, unknown> | undefined;
    const sender = body.sender as Record<string, unknown> | undefined;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      TrackingNumber: asString(body.trackingNumber || existingDoc.TrackingNumber).toUpperCase(),
      trackingNumber: asString(body.trackingNumber || existingDoc.trackingNumber).toUpperCase(),
      UserCode: asString(body.userCode || existingDoc.UserCode || existingDoc.userCode),
      userCode: asString(body.userCode || existingDoc.UserCode || existingDoc.userCode),
      Weight: weightLbs,
      weightLbs: weightLbs,
      weight: weightLbs,
      WeightUnit: 'lb',
      Shipper: asString(body.shipper ?? existingDoc.Shipper ?? existingDoc.shipper),
      shipper: asString(body.shipper ?? existingDoc.Shipper ?? existingDoc.shipper),
      Description: asString(body.description ?? body.contents ?? existingDoc.Description ?? existingDoc.description),
      description: asString(body.description ?? body.contents ?? existingDoc.Description ?? existingDoc.description),
      itemDescription: asString(body.itemDescription ?? existingDoc.itemDescription),
      EntryDate: body.entryDate ? new Date(asString(body.entryDate)) : existingDoc.EntryDate,
      entryDate: body.entryDate ? new Date(asString(body.entryDate)) : existingDoc.entryDate,
      PackageStatus: packageStatus,
      status: statusStr || existingDoc.status,
      serviceMode: asString(body.serviceMode ?? existingDoc.serviceMode),
      Length: dimensions?.length !== undefined ? asNumber(dimensions.length) : existingDoc.Length ?? existingDoc.length,
      Width: dimensions?.width !== undefined ? asNumber(dimensions.width) : existingDoc.Width ?? existingDoc.width,
      Height: dimensions?.height !== undefined ? asNumber(dimensions.height) : existingDoc.Height ?? existingDoc.height,
      length: dimensions?.length !== undefined ? asNumber(dimensions.length) : existingDoc.length,
      width: dimensions?.width !== undefined ? asNumber(dimensions.width) : existingDoc.width,
      height: dimensions?.height !== undefined ? asNumber(dimensions.height) : existingDoc.height,
      dimensionUnit: asString(dimensions?.unit ?? existingDoc.dimensionUnit) || 'cm',
      senderName: asString(sender?.name ?? body.senderName ?? existingDoc.senderName),
      senderEmail: asString(sender?.email ?? body.senderEmail ?? existingDoc.senderEmail),
      senderPhone: asString(sender?.phone ?? body.senderPhone ?? existingDoc.senderPhone),
      senderAddress: asString(sender?.address ?? body.senderAddress ?? existingDoc.senderAddress),
      senderCity: asString(sender?.city ?? body.senderCity ?? existingDoc.senderCity),
      senderState: asString(sender?.state ?? body.senderState ?? existingDoc.senderState),
      senderZipCode: asString(sender?.zipCode ?? body.senderZipCode ?? existingDoc.senderZipCode),
      senderCountry: asString(sender?.country ?? body.senderCountry ?? existingDoc.senderCountry),
      sender: sender ?? existingDoc.sender,
      itemValueUSD: itemValueUsd,
      itemValue: itemValueUsd,
      value: itemValueUsd,
      totalAmount,
      amountPaidCurrency: paymentCurrency,
      paymentCurrency,
      Branch: asString(body.branch ?? body.Branch ?? existingDoc.Branch ?? existingDoc.branch),
      branch: asString(body.branch ?? body.Branch ?? existingDoc.Branch ?? existingDoc.branch),
      Pieces: body.pieces !== undefined ? asNumber(body.pieces) : asNumber(existingDoc.Pieces ?? existingDoc.pieces, 1),
      pieces: body.pieces !== undefined ? asNumber(body.pieces) : asNumber(existingDoc.Pieces ?? existingDoc.pieces, 1),
      PackagePayments: serializePackagePayments(paymentMeta),
      paymentStatus: paymentMeta.paymentStatus,
      paymentMethod: paymentMeta.paymentMethod,
      specialInstructions: asString(body.specialInstructions ?? existingDoc.specialInstructions),
    };

    if (body.recipient) {
      const recipient = body.recipient as Record<string, unknown>;
      updateData.receiverName = asString(recipient.name);
      updateData.receiverEmail = asString(recipient.email);
      updateData.receiverPhone = asString(recipient.phone);
      updateData.receiverAddress = asString(recipient.address);
      updateData.receiverCountry = asString(recipient.country);
    }

    if (body.status && body.status !== existingDoc.status) {
      updateData.$push = {
        history: {
          status: body.status,
          at: new Date(),
          note: `Status updated by admin staff`,
        },
      };
    }

    const packageData = await Package.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true, runValidators: false }
    );

    if (!packageData) {
      return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
    }

    const updatedDoc = packageData.toObject() as Record<string, unknown>;
    const tracking = asString(updatedDoc.TrackingNumber || updatedDoc.trackingNumber);
    const userId = updatedDoc.userId || updatedDoc.customer;

    if (userId) {
      try {
        const user = await User.findById(userId).lean();
        if (user) {
          const userData = user as unknown as {
            _id: unknown;
            userCode?: string;
            firstName?: string;
            lastName?: string;
            email: string;
            phone?: string;
            address?: string;
            city?: string;
            country?: string;
          };
          
          // Check if package needs a new invoice (no existing invoice)
          if (!updatedDoc.billingInvoiceId) {
            const invoiceResult = await createBillingInvoiceForPackage(
              updatedDoc as Record<string, unknown> & { _id: unknown },
              userData,
              tracking
            );

            if (invoiceResult) {
              // Link invoice to package
              await Package.findByIdAndUpdate(packageId, {
                billingInvoiceId: invoiceResult._id
              });

              // Send invoice email
              const emailService = new EmailService();
              const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/bills`;

              await emailService.sendInvoiceEmail({
                to: userData.email,
                customerName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
                invoiceNumber: invoiceResult.invoiceNumber,
                trackingNumber: tracking,
                totalAmount: asNumber(updatedDoc.totalAmount),
                paymentLink,
                items: []
              });

              console.log(`[Admin Package Update] Invoice ${invoiceResult.invoiceNumber} created and email sent to ${userData.email}`);
            }
          } else {
            // Sync existing invoice
            const syncResult = await syncBillingInvoiceForPackage(
              updatedDoc,
              userData,
              tracking
            );
            
            // Send invoice email notification about the update
            if (syncResult) {
              try {
                const emailService = new EmailService();
                const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/bills`;

                await emailService.sendInvoiceEmail({
                  to: userData.email,
                  customerName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
                  invoiceNumber: `INV-${tracking}`, // Use tracking number as reference
                  trackingNumber: tracking,
                  totalAmount: asNumber(updatedDoc.totalAmount),
                  paymentLink,
                  items: []
                });

                console.log(`[Admin Package Update] Invoice update email sent to ${userData.email}`);
              } catch (emailErr) {
                console.error('[Admin Package Update] Failed to send invoice update email:', emailErr);
              }
            }
          }
        }
      } catch (invoiceErr) {
        console.error('Failed to handle billing invoice on package update:', invoiceErr);
      }
    }

    const kcd = toKcdPackage(updatedDoc);

    return NextResponse.json({ 
      message: "Package updated successfully",
      package: kcd,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}
