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
  console.log(`[KCD Add Package ${requestId}] Processing package add request`, {
    trackingNumber: rawBody.TrackingNumber,
    userCode: rawBody.UserCode,
  });
  
  const bodyValidation = validateAddPackageBody(rawBody);
  if (!bodyValidation.ok) {
    console.log(`[KCD Add Package ${requestId}] Validation failed`, bodyValidation.errors);
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
  
  console.log(`[KCD Add Package ${requestId}] Validated package`, {
    trackingNumber,
    userCode,
  });

  const { dbConnect } = await import('@/lib/db');
  await dbConnect();

  const rawUserCode = String(userCode || '').trim();
  const cleanUserCode = rawUserCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const user = await User.findOne({
    $or: [
      { userCode: rawUserCode },
      { userCode: cleanUserCode },
      { shippingId: rawUserCode },
      { shippingId: cleanUserCode },
    ]
  });

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

  // Fix: Convert shipper and weight to proper types
  const weight = asNumber(body.Weight);
  const shipper = asString(body.Shipper);
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
    console.log(`[KCD Add Package ${requestId}] Package created successfully`, {
      packageId: createdPackage._id,
      trackingNumber: createdPackage.TrackingNumber,
      userCode: createdPackage.UserCode,
    });
  } catch (createError: unknown) {
    const err = createError as { name?: string; message?: string; errors?: Record<string, { message?: string }>; code?: number };
    
    // Check for MongoDB duplicate key error
    if (err?.message?.includes('E11000') || err?.message?.includes('duplicate key')) {
      let duplicateField = 'unknown field';
      if (err.message.includes('trackingNumber')) {
        duplicateField = 'tracking number';
      } else if (err.message.includes('UserCode')) {
        duplicateField = 'user code';
      }
      
      return {
        ok: false,
        status: 409,
        body: {
          success: false,
          message: `A package with this ${duplicateField} already exists`,
          error: `Duplicate ${duplicateField}`,
          errorCode: 'DUPLICATE_KEY',
          UserCode: userCode,
          TrackingNumber: trackingNumber,
          data: [],
        },
      };
    }
    
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
  const weightKg = weight; // Now weight is already a number

  // DISABLED: Auto-create billing invoice removed - manual billing only
  // let invoiceCreated = false;
  // let billingInvoiceId: string | undefined;
  // try {
  //   const { createBillingInvoiceForPackage } = await import('@/lib/package-billing');
  //   const billingInvoice = await createBillingInvoiceForPackage(
  //     createdPackage.toObject() as Record<string, unknown> & { _id: unknown },
  //     user,
  //     trackingNumber
  //   );
  //   if (billingInvoice) {
  //     invoiceCreated = true;
  //     billingInvoiceId = String(billingInvoice._id);
  //     await Package.findByIdAndUpdate(createdPackage._id, {
  //       $set: {
  //         billingInvoiceId: billingInvoice._id,
  //         invoiceStatus: 'pending',
  //         invoiceUploaded: false,
  //       },
  //     });
  //   }
  // } catch (invoiceError) {
  //   console.error(`[KCD Add ${requestId}] Invoice error:`, invoiceError);
  // }

  // DISABLED: Do not auto-create pre-alert when package is added via KCD webhook
  // Pre-alerts should only be created by customers via the customer portal
  // let preAlertCreated = false;
  // try {
  //   const { PreAlert } = await import('@/models/PreAlert');
  //   const existingPreAlert = await PreAlert.findOne({ trackingNumber });
  //   if (!existingPreAlert) {
  //     await PreAlert.create({
  //       userCode: user.userCode,
  //       customer: user._id,
  //       trackingNumber,
  //       carrier: shipper || 'Unknown Carrier',
  //       origin: 'KCD Warehouse',
  //       expectedDate: receivedDate,
  //       status: 'approved',
  //       notes: 'Auto-created from KCD webhook',
  //       decidedAt: new Date(),
  //     });
  //     preAlertCreated = true;
  //   }
  // } catch (preAlertError) {
  //   console.error(`[KCD Add ${requestId}] Pre-alert error:`, preAlertError);
  // }

  let emailSent = false;
  try {
    if (user.email) {
      console.log(`[KCD Add Package ${requestId}] Sending email to customer`, {
        email: user.email,
        trackingNumber,
      });
      
      const kcdEmailPkg = toPublicKcdPackage(createdPackage.toObject());
      const emailPackage: typeof kcdEmailPkg = {
        ...kcdEmailPkg,
        FirstName: kcdEmailPkg.FirstName || asString(body.FirstName) || user.firstName,
        LastName: kcdEmailPkg.LastName || asString(body.LastName) || user.lastName,
        UserCode: kcdEmailPkg.UserCode || userCode,
        ControlNumber: kcdEmailPkg.ControlNumber || asString(body.ControlNumber),
        Description:
          kcdEmailPkg.Description ||
          asString(body.Description) ||
          `Merchandise from ${shipper || 'warehouse'}`,
        Pieces: kcdEmailPkg.Pieces ?? (body.Pieces != null ? asNumber(body.Pieces) : undefined),
        EntryStaff: kcdEmailPkg.EntryStaff || asString(body.EntryStaff),
        Branch: kcdEmailPkg.Branch || asString(body.Branch) || 'KCD Main Warehouse',
        ManifestCode: kcdEmailPkg.ManifestCode || asString(body.ManifestCode),
        CollectionCode: kcdEmailPkg.CollectionCode || asString(body.CollectionCode),
        Length: kcdEmailPkg.Length ?? (body.Length != null ? asNumber(body.Length) : undefined),
        Width: kcdEmailPkg.Width ?? (body.Width != null ? asNumber(body.Width) : undefined),
        Height: kcdEmailPkg.Height ?? (body.Height != null ? asNumber(body.Height) : undefined),
      };

      let warehouseAddresses: {
        airAddress?: string;
        seaAddress?: string;
        chinaAddress?: string;
      } = {};
      try {
        const { Warehouse } = await import('@/models/Warehouse');
        const defaultWarehouse = await Warehouse.findOne({
          isActive: true,
          isDefault: true,
        })
          .select('airAddress seaAddress chinaAddress address')
          .lean();
        if (defaultWarehouse) {
          const wh = defaultWarehouse as {
            airAddress?: string;
            seaAddress?: string;
            chinaAddress?: string;
            address?: string;
          };
          warehouseAddresses = {
            airAddress: wh.airAddress || wh.address || '',
            seaAddress: wh.seaAddress || wh.address || '',
            chinaAddress: wh.chinaAddress || wh.address || '',
          };
        }
      } catch {
        /* optional */
      }

      await sendNewPackageEmail({
        to: user.email,
        firstName: user.firstName || 'Customer',
        trackingNumber: emailPackage.TrackingNumber,
        status: 'AT WAREHOUSE',
        weight: emailPackage.Weight ?? weightKg,
        shipper: emailPackage.Shipper || shipper || 'KCD Logistics', // Now shipper is properly typed as string
        warehouse: emailPackage.Branch || 'KCD Main Warehouse',
        receivedDate: emailPackage.EntryDateTime
          ? new Date(asString(emailPackage.EntryDateTime))
          : emailPackage.EntryDate
            ? new Date(asString(emailPackage.EntryDate))
            : receivedDate,
        description: emailPackage.Description,
        kcdPackage: emailPackage,
        warehouseAddresses,
        userCode: user.userCode,
      });
      emailSent = true;
      console.log(`[KCD Add Package ${requestId}] Email sent successfully`, {
        email: user.email,
        trackingNumber,
      });
    }
  } catch (emailError) {
    console.error(`[KCD Add ${requestId}] Email error:`, emailError);
  }

  return {
    ok: true,
    package: toPublicKcdPackage(createdPackage.toObject()),
    notifications: { preAlertCreated: false, emailSent, invoiceCreated: false },
  };
}