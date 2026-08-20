import { NextResponse } from 'next/server';

/** Internal mailbox codes (e.g. CLEAN0033) or external KCD codes (e.g. EPXUUYE) */
export const USER_CODE_REGEX = /^[A-Z0-9][A-Z0-9]{1,29}$/;

export interface KcdValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/** Canonical KCD field → accepted request aliases (any casing / legacy names) */
const KCD_FIELD_ALIASES: Record<string, string[]> = {
  PackageID: ['PackageID', 'packageId'],
  CourierID: ['CourierID', 'courierId'],
  ManifestID: ['ManifestID', 'manifestId'],
  CollectionID: ['CollectionID', 'collectionId'],
  TrackingNumber: ['TrackingNumber', 'trackingNumber'],
  ControlNumber: [
    'ControlNumber',
    'controlNumber',
    'houseNumber',
    'HouseNumber',
  ],
  FirstName: ['FirstName', 'firstName'],
  LastName: ['LastName', 'lastName'],
  UserCode: [
    'UserCode',
    'userCode',
    'customerMailbox',
    'customerCode',
    'MailboxNumber',
    'mailboxNumber',
  ],
  Weight: ['Weight', 'weight'],
  Shipper: ['Shipper', 'shipper'],
  EntryStaff: ['EntryStaff', 'entryStaff'],
  EntryDate: ['EntryDate', 'entryDate', 'receivedAt'],
  EntryDateTime: ['EntryDateTime', 'entryDateTime', 'receivedAt'],
  Branch: ['Branch', 'branch'],
  Description: ['Description', 'description'],
  Pieces: ['Pieces', 'pieces'],
  Cubes: ['Cubes', 'cubes'],
  Length: ['Length', 'length'],
  Width: ['Width', 'width'],
  Height: ['Height', 'height'],
  PackageStatus: ['PackageStatus', 'packageStatus', 'status', 'Status'],
  Claimed: ['Claimed', 'claimed'],
  APIToken: ['APIToken', 'apiToken', 'token'],
  ShowControls: ['ShowControls', 'showControls'],
  ManifestCode: ['ManifestCode', 'manifestCode'],
  CollectionCode: ['CollectionCode', 'collectionCode'],
  HSCode: ['HSCode', 'hsCode'],
  Unknown: ['Unknown', 'unknown'],
  AIProcessed: ['AIProcessed', 'aiProcessed'],
  OriginalHouseNumber: ['OriginalHouseNumber', 'originalHouseNumber'],
  Discrepancy: ['Discrepancy', 'discrepancy'],
  DiscrepancyDescription: [
    'DiscrepancyDescription',
    'discrepancyDescription',
  ],
  ServiceTypeID: ['ServiceTypeID', 'serviceTypeId'],
  HazmatCodeID: ['HazmatCodeID', 'hazmatCodeId'],
  Coloaded: ['Coloaded', 'coloaded'],
  ColoadIndicator: ['ColoadIndicator', 'coloadIndicator'],
  PackagePayments: ['PackagePayments', 'packagePayments'],
};

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function pushError(errors: KcdValidationError[], error: KcdValidationError) {
  if (errors.some((e) => e.field === error.field)) return;
  errors.push(error);
}

/**
 * Normalize any request body to canonical KCD PascalCase fields.
 * Accepts camelCase, PascalCase, and legacy names (e.g. customerMailbox → UserCode).
 */
export function normalizeKcdBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };

  for (const [canonical, aliases] of Object.entries(KCD_FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (isPresent(out[alias])) {
        if (!isPresent(out[canonical])) {
          out[canonical] = out[alias];
        }
        break;
      }
    }
  }

  if (isPresent(out.UserCode)) {
    out.UserCode = String(out.UserCode).trim().toUpperCase();
  }
  if (isPresent(out.TrackingNumber)) {
    out.TrackingNumber = String(out.TrackingNumber).trim().toUpperCase();
  }

  return out;
}

export function extractUserCode(body: Record<string, unknown>): string {
  const raw = body.UserCode;
  return typeof raw === 'string' || typeof raw === 'number'
    ? String(raw).trim().toUpperCase()
    : '';
}

export function extractTrackingNumber(body: Record<string, unknown>): string {
  const raw = body.TrackingNumber;
  return typeof raw === 'string' || typeof raw === 'number'
    ? String(raw).trim().toUpperCase()
    : '';
}

export function validateUserCode(
  code: string,
  options: { required?: boolean } = { required: true }
): KcdValidationError | null {
  if (!code) {
    if (options.required === false) return null;
    return {
      field: 'UserCode',
      message:
        'UserCode is required. Send UserCode (or legacy: customerMailbox, customerCode, userCode).',
    };
  }
  if (!USER_CODE_REGEX.test(code)) {
    return {
      field: 'UserCode',
      message:
        'UserCode must be 2–30 characters (letters, numbers), e.g. CLEAN0033 or EPXUUYE',
      value: code,
    };
  }
  return null;
}

export function validateAddPackageBody(body: Record<string, unknown>): {
  ok: boolean;
  errors: KcdValidationError[];
  normalized: Record<string, unknown>;
} {
  const normalized = normalizeKcdBody(body);
  const errors: KcdValidationError[] = [];

  const userCode = extractUserCode(normalized);
  const userCodeErr = validateUserCode(userCode, { required: true });
  if (userCodeErr) pushError(errors, userCodeErr);

  const tracking = extractTrackingNumber(normalized);
  if (!tracking) {
    pushError(errors, {
      field: 'TrackingNumber',
      message:
        'TrackingNumber is required. Send TrackingNumber (or legacy: trackingNumber).',
    });
  } else if (tracking.length < 3 || tracking.length > 50) {
    pushError(errors, {
      field: 'TrackingNumber',
      message: 'TrackingNumber must be 3–50 characters',
      value: tracking,
    });
  }

  const weight = normalized.Weight;
  if (weight !== undefined && weight !== null && weight !== '') {
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 0) {
      pushError(errors, {
        field: 'Weight',
        message: 'Weight must be a non-negative number',
        value: weight,
      });
    }
  }

  const serviceMode =
    normalized.serviceMode ?? normalized.ServiceMode ?? normalized.ServiceTypeID;
  // Tasoko API uses UUID ServiceTypeIDs as well as plain text
  const validServiceModes = ['air', 'ocean', 'local', 'sea'];
  const validServiceTypeUUIDs = [
    '59cadcd4-7508-450b-85aa-9ec908d168fe', // AIR STANDARD
    '25a1d8e5-a478-4cc3-b1fd-a37d0d787302', // AIR EXPRESS
    '8df142ca-0573-4ce9-b11d-7a3e5f8ba196', // AIR PREMIUM
    '7c9638e8-4bb3-499e-8af9-d09f757a099e', // SEA STANDARD
  ];
  if (
    serviceMode !== undefined &&
    serviceMode !== null &&
    serviceMode !== '' &&
    !validServiceModes.includes(String(serviceMode).toLowerCase()) &&
    !validServiceTypeUUIDs.includes(String(serviceMode).toLowerCase())
  ) {
    pushError(errors, {
      field: 'ServiceTypeID',
      message: 'Service mode must be air, ocean, sea, local, or a valid Tasoko ServiceTypeID UUID',
      value: serviceMode,
    });
  }

  return { ok: errors.length === 0, errors, normalized };
}

export function validationFailedResponse(
  errors: KcdValidationError[],
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message: 'Validation failed',
      errors,
      data: [],
    },
    { status }
  );
}

/** Mongo filter: match package by TrackingNumber (PascalCase or legacy camelCase) */
export function trackingNumberQuery(tracking: string): {
  $or: Array<{ TrackingNumber: string } | { trackingNumber: string }>;
} {
  const tn = tracking.trim().toUpperCase();
  return {
    $or: [{ TrackingNumber: tn }, { trackingNumber: tn }],
  };
}
