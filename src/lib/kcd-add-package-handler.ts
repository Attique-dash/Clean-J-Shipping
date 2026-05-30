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

  let createdPackage;
  try {
    createdPackage = await Package.create(packageData);
  } catch (createError: unknown) {
    const err = createError as { name?: string; message?: string; errors?: Record<string, { message?: string }> };
    if (err?.name === 'ValidationError') {
      const details = err.errors
        ? Object.entries(err.errors).map(([field, e]) => ({
            field,
            message: e?.message || 'Invalid value',
          }))
        : [];
      return {
        ok: false,
        status: 400,
        body: {
          success: false,
          message: 'Package validation failed',
          error: err.message || 'Validation failed',
          errorCode: 'KCD_PACKAGE_VALIDATION',
          errors: details,
          UserCode: userCode,
          TrackingNumber: trackingNumber,
          data: [],
        },
      };
    }
    throw createError;
  }
  const weightKg = asNumber(weight);

  let invoiceCreated = false;
  try {
    const { createBillingInvoiceForPackage } = await import('@/lib/package-billing');
    const billingInvoice = await createBillingInvoiceForPackage(
      createdPackage.toObject() as Record<string, unknown> & { _id: unknown },
      user,
      trackingNumber
    );
    if (billingInvoice) {
      invoiceCreated = true;
      await Package.findByIdAndUpdate(createdPackage._id, {
        $set: {
          billingInvoiceId: billingInvoice._id,
          invoiceStatus: 'pending',
          invoiceUploaded: false,
        },
      });
    }
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
