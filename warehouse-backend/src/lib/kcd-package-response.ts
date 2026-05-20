import type { Document } from 'mongoose';

/** Format a package document as Tasoko/KCD PascalCase (matches POST /packages/add response). */
export function toKcdPackagePayload(
  pkg: Record<string, unknown>,
  customer?: {
    firstName?: string;
    lastName?: string;
  } | null
): Record<string, unknown> {
  const recipient = pkg.recipient as Record<string, unknown> | undefined;
  const firstFromRecipient = String(recipient?.name || '')
    .split(' ')
    .filter(Boolean);
  const firstName =
    pkg.FirstName ||
    customer?.firstName ||
    firstFromRecipient[0] ||
    '';
  const lastName =
    pkg.LastName ||
    customer?.lastName ||
    firstFromRecipient.slice(1).join(' ') ||
    '';

  const dateReceived = pkg.dateReceived || pkg.EntryDate;
  const entryIso =
    dateReceived instanceof Date
      ? dateReceived.toISOString()
      : dateReceived
        ? String(dateReceived)
        : new Date().toISOString();

  return {
    PackageID: String(pkg.PackageID || pkg.packageId || pkg._id || ''),
    CourierID: String(pkg.CourierID || pkg.courierId || pkg._id || ''),
    ManifestID: String(pkg.ManifestID || pkg.manifestId || ''),
    CollectionID: String(pkg.CollectionID || pkg.CollectionCode || ''),
    TrackingNumber: String(pkg.trackingNumber || pkg.TrackingNumber || ''),
    ControlNumber: String(pkg.ControlNumber || pkg.controlNumber || ''),
    FirstName: String(firstName),
    LastName: String(lastName),
    UserCode: String(pkg.userCode || pkg.UserCode || ''),
    Weight: Number(pkg.weight ?? pkg.Weight ?? 0),
    Shipper: String(pkg.shipper || pkg.Shipper || ''),
    EntryStaff: String(pkg.entryStaff || pkg.EntryStaff || ''),
    EntryDate: entryIso.split('T')[0],
    EntryDateTime: String(pkg.entryDateTime || pkg.EntryDateTime || entryIso),
    Branch: String(pkg.branch || pkg.Branch || 'Down Town'),
    Claimed: Boolean(pkg.claimed ?? pkg.Claimed ?? false),
    APIToken: String(pkg.APIToken || pkg.apiToken || ''),
    ShowControls: Boolean(pkg.ShowControls ?? false),
    ManifestCode: String(pkg.ManifestCode || ''),
    CollectionCode: String(pkg.CollectionCode || ''),
    Description: String(pkg.description || pkg.Description || ''),
    HSCode: String(pkg.HSCode || pkg.hsCode || ''),
    Unknown: Boolean(pkg.unknown ?? pkg.Unknown ?? false),
    AIProcessed: Boolean(pkg.aiProcessed ?? pkg.AIProcessed ?? false),
    OriginalHouseNumber: String(pkg.OriginalHouseNumber || ''),
    Cubes: Number(pkg.cubes ?? pkg.Cubes ?? 0),
    Length: Number(
      pkg.Length ??
        (pkg.dimensions as { length?: number } | undefined)?.length ??
        0
    ),
    Width: Number(
      pkg.Width ??
        (pkg.dimensions as { width?: number } | undefined)?.width ??
        0
    ),
    Height: Number(
      pkg.Height ??
        (pkg.dimensions as { height?: number } | undefined)?.height ??
        0
    ),
    Pieces: Number(pkg.pieces ?? pkg.Pieces ?? 1),
    Discrepancy: Boolean(pkg.discrepancy ?? pkg.Discrepancy ?? false),
    DiscrepancyDescription: String(pkg.DiscrepancyDescription || ''),
    ServiceTypeID: String(pkg.ServiceTypeID || pkg.serviceTypeId || ''),
    HazmatCodeID: String(pkg.HazmatCodeID || pkg.hazmatCodeId || ''),
    Coloaded: Boolean(pkg.coloaded ?? pkg.Coloaded ?? false),
    ColoadIndicator: String(pkg.ColoadIndicator || ''),
    PackageStatus: Number(pkg.packageStatus ?? pkg.PackageStatus ?? 0),
  };
}

export function packageBelongsToCourier(
  packageCourier: string | undefined,
  authenticatedCourierCode: string | undefined
): boolean {
  if (!packageCourier) return true;
  if (!authenticatedCourierCode) return true;
  return (
    packageCourier === authenticatedCourierCode || packageCourier === 'ADMIN'
  );
}
