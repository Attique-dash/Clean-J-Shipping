import { NextResponse } from 'next/server';

/** e.g. CLEAN-001322 (prefix 2–6 letters, 2–6 digits) */
export const USER_CODE_REGEX = /^[A-Z]{2,6}-\d{2,6}$/;

export interface KcdValidationError {
  field: string;
  message: string;
  value?: unknown;
}

const PASCAL_TO_CAMEL: Record<string, string> = {
  PackageID: 'packageId',
  TrackingNumber: 'trackingNumber',
  ControlNumber: 'controlNumber',
  HouseNumber: 'houseNumber',
  FirstName: 'firstName',
  LastName: 'lastName',
  UserCode: 'userCode',
  Weight: 'weight',
  Shipper: 'shipper',
  EntryDate: 'entryDate',
  EntryDateTime: 'entryDateTime',
  EntryStaff: 'entryStaff',
  Branch: 'branch',
  Description: 'description',
  Pieces: 'pieces',
  Cubes: 'cubes',
  Length: 'length',
  Width: 'width',
  Height: 'height',
  PackageStatus: 'status',
  Status: 'status',
  CourierID: 'courierId',
  ManifestID: 'manifestId',
  CollectionID: 'collectionId',
};

export function normalizeKcdBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const [pascal, camel] of Object.entries(PASCAL_TO_CAMEL)) {
    if (out[pascal] !== undefined && out[camel] === undefined) {
      out[camel] = out[pascal];
    }
  }
  if (out.customerMailbox !== undefined && out.userCode === undefined) {
    out.userCode = out.customerMailbox;
  }
  if (out.customerCode !== undefined && out.userCode === undefined) {
    out.userCode = out.customerCode;
  }
  return out;
}

export function extractUserCode(body: Record<string, unknown>): string {
  const raw =
    body.userCode ??
    body.UserCode ??
    body.customerMailbox ??
    body.customerCode;
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
      field: 'userCode',
      message: 'Customer code is required (userCode, UserCode, customerMailbox, or customerCode)',
    };
  }
  if (!USER_CODE_REGEX.test(code)) {
    return {
      field: 'userCode',
      message: 'Customer code must be in format PREFIX-NNNN (2-6 digits, e.g. CLEAN-001322)',
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
  if (userCodeErr) errors.push(userCodeErr);
  else {
    normalized.userCode = userCode;
    normalized.UserCode = userCode;
  }

  const tracking =
    normalized.trackingNumber ?? normalized.TrackingNumber;
  if (tracking !== undefined && tracking !== null && String(tracking).trim()) {
    const tn = String(tracking).trim();
    if (tn.length < 3 || tn.length > 50) {
      errors.push({
        field: 'trackingNumber',
        message: 'Tracking number must be 3-50 characters',
        value: tracking,
      });
    }
  }

  const weight = normalized.weight ?? normalized.Weight;
  if (weight !== undefined && weight !== null && weight !== '') {
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 0) {
      errors.push({
        field: 'weight',
        message: 'Weight must be a positive number',
        value: weight,
      });
    }
  }

  const serviceMode = normalized.serviceMode ?? normalized.ServiceMode;
  if (
    serviceMode !== undefined &&
    serviceMode !== null &&
    serviceMode !== '' &&
    !['air', 'ocean', 'local'].includes(String(serviceMode))
  ) {
    errors.push({
      field: 'serviceMode',
      message: 'Service mode must be air, ocean, or local',
      value: serviceMode,
    });
  }

  return { ok: errors.length === 0, errors, normalized };
}

export function validationFailedResponse(errors: KcdValidationError[], status = 400) {
  return NextResponse.json(
    {
      success: false,
      message: 'Validation failed',
      errors,
    },
    { status }
  );
}
