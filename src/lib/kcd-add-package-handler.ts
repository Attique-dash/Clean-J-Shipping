import { Package } from '@/models/Package';
import { User } from '@/models/User';
import { sendNewPackageEmail } from '@/lib/email';
import {
  buildKcdPackageDocument,
  toPublicKcdPackage,
} from '@/lib/package-format';
import type { KcdPackage } from '@/types/kcd-package';
import {
  validateAddPackageBody,
  trackingNumberQuery,
  extractUserCode,
  extractTrackingNumber,
} from '@/lib/kcd-package-validation';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export type KcdAddPackageResult =
  | {
      ok: true;
      package: KcdPackage;
      notifications: {
        preAlertCreated: boolean;
        emailSent: boolean;
        invoiceCreated: boolean;
      };
    }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
    };

/**
 * Create one package from normalized KCD PascalCase body (Askenish/Tasoko format).
 */
export async function processKcdPackageAdd(
  rawBody: Record<string, unknown>,
  requestId: string
): Promise<KcdAddPackageResult> {
  const bodyValidation = validateAddPackageBody(rawBody);
  if (!bodyValidation.ok) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        message: 'Validation failed',
        errors: bodyValidation.errors,
        data: [],
      },
    };
  }

  const body = bodyValidation.normalized;
  const trackingNumber = extractTrackingNumber(body);
  const userCode = extractUserCode(body);

  const { dbConnect } = await import('@/lib/db');
  await dbConnect();

  const user = await User.findOne({ userCode });
  if (!user) {
    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        message: `User not found for UserCode: ${userCode}`,
        UserCode: userCode,
        data: [],
      },
    };
  }

  const existingPackage = await Package.findOne(
    trackingNumberQuery(trackingNumber)
  );
  if (existingPackage) {
    return {
      ok: false,
      status: 409,
      body: {
        success: false,
        message: 'Package already exists',
        TrackingNumber: trackingNumber,
        data: [],
      },
    };
  }

  const weight = body.Weight;
  const shipper = body.Shipper;
  const receivedAt = body.EntryDateTime || body.EntryDate;
  const receivedDate = receivedAt ? new Date(asString(receivedAt)) : new Date();

  const packageData = buildKcdPackageDocument(
    {
      ...body,
      TrackingNumber: trackingNumber,
      UserCode: userCode,
      EntryStaff: body.EntryStaff || 'KCD Webhook',
      EntryDate: receivedDate,
      EntryDateTime: receivedDate,
      Branch: body.Branch || 'KCD Main Warehouse',
    },
    user,
    {
      source: 'kcd_webhook',
      sourceDetails: {
        syncedAt: new Date(),
        syncStatus: 'synced',
        apiEndpoint: '/api/kcd/packages/add',
      },
    }
  );

  const createdPackage = await Package.create(packageData);
  const weightKg = asNumber(weight);

  let invoiceCreated = false;
  try {
    const { CurrencyService } = await import('@/lib/currency-service');
    const Invoice = (await import('@/models/Invoice')).default;
    const weightLbs = weightKg * 2.20462;
    const costBreakdown = CurrencyService.calculateTotalPackageCost(0, weightKg, 'JMD');
    const invoiceItems = [];
    if (costBreakdown.shippingCostJMD > 0) {
      invoiceItems.push({
        description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
        quantity: 1,
        unitPrice: costBreakdown.shippingCostJMD,
        taxRate: 0,
        amount: costBreakdown.shippingCostJMD,
        taxAmount: 0,
        total: costBreakdown.shippingCostJMD,
      });
    }
    const billingInvoice = await Invoice.create({
      userId: user._id,
      customer: {
        id: user._id.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
      package: {
        trackingNumber,
        userCode: user.userCode,
      },
      invoiceType: 'billing',
      currency: 'JMD',
      subtotal: costBreakdown.itemValueJMD,
      taxTotal: 0,
      discountAmount: 0,
      total: costBreakdown.totalJMD,
      amountPaid: 0,
      balanceDue: costBreakdown.totalJMD,
      items: invoiceItems,
      notes: `Auto-generated invoice for KCD package ${trackingNumber}`,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    invoiceCreated = true;
    await Package.findByIdAndUpdate(createdPackage._id, {
      $set: {
        billingInvoiceId: billingInvoice._id,
        invoiceStatus: 'pending',
        invoiceUploaded: false,
      },
    });
  } catch (invoiceError) {
    console.error(`[KCD Add ${requestId}] Invoice error:`, invoiceError);
  }

  let preAlertCreated = false;
  try {
    const { PreAlert } = await import('@/models/PreAlert');
    const existingPreAlert = await PreAlert.findOne({ trackingNumber });
    if (!existingPreAlert) {
      await PreAlert.create({
        userCode: user.userCode,
        customer: user._id,
        trackingNumber,
        carrier: shipper ? asString(shipper) : 'Unknown Carrier',
        origin: 'KCD Warehouse',
        expectedDate: receivedDate,
        status: 'approved',
        notes: 'Auto-created from KCD webhook',
        decidedAt: new Date(),
      });
      preAlertCreated = true;
    }
  } catch (preAlertError) {
    console.error(`[KCD Add ${requestId}] Pre-alert error:`, preAlertError);
  }

  let emailSent = false;
  try {
    if (user.email) {
      const kcdEmailPkg = toPublicKcdPackage(createdPackage.toObject());
      await sendNewPackageEmail({
        to: user.email,
        firstName: user.firstName || 'Customer',
        trackingNumber: kcdEmailPkg.TrackingNumber,
        status: String(kcdEmailPkg.PackageStatus ?? 0),
        weight: kcdEmailPkg.Weight ?? 0,
        shipper: kcdEmailPkg.Shipper || 'KCD Logistics',
        warehouse: kcdEmailPkg.Branch || 'KCD Main Warehouse',
        receivedDate: kcdEmailPkg.EntryDate
          ? new Date(kcdEmailPkg.EntryDate)
          : new Date(),
        description:
          kcdEmailPkg.Description ||
          `Package from ${shipper || 'KCD'}`,
      });
      emailSent = true;
    }
  } catch (emailError) {
    console.error(`[KCD Add ${requestId}] Email error:`, emailError);
  }

  return {
    ok: true,
    package: toPublicKcdPackage(createdPackage.toObject()),
    notifications: { preAlertCreated, emailSent, invoiceCreated },
  };
}
