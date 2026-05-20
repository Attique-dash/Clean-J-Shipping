import { Package } from '@/models/Package';

export interface KcdManifestPayload {
  APIToken?: string;
  CollectionCodes?: string[];
  PackageAWBs?: string[];
  RemoveFromManifest?: boolean;
  Manifest?: {
    ManifestID?: string;
    CourierID?: string;
    ServiceTypeID?: string;
    ManifestStatus?: string;
    ManifestCode?: string;
    FlightDate?: string;
    Weight?: number;
    ItemCount?: number;
    ManifestNumber?: number;
    StaffName?: string;
    EntryDate?: string;
    EntryDateTime?: string;
    AWBNumber?: string;
  };
}

const SERVICE_TYPE_MAP: Record<string, string> = {
  '59cadcd4-7508-450b-85aa-9ec908d168fe': 'AIR STANDARD',
  '25a1d8e5-a478-4cc3-b1fd-a37d0d787302': 'AIR EXPRESS',
  '8df142ca-0573-4ce9-b11d-7a3e5f8ba196': 'AIR PREMIUM',
  '7c9638e8-4bb3-499e-8af9-d09f757a099e': 'SEA STANDARD',
};

const MANIFEST_STATUS_MAP: Record<string, string> = {
  '0': 'AT WAREHOUSE',
  '1': 'DELIVERED TO AIRPORT',
  '2': 'IN TRANSIT TO LOCAL PORT',
  '3': 'AT LOCAL PORT',
  '4': 'AT LOCAL SORTING',
};

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => String(x).trim().toUpperCase());
}

export function parseKcdManifestBody(body: unknown): KcdManifestPayload {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  return body as KcdManifestPayload;
}

export function buildPackageManifestUpdates(
  payload: KcdManifestPayload,
  trackingNumber: string
): Record<string, unknown> {
  const tn = trackingNumber.trim().toUpperCase();
  const manifestBlock = payload.Manifest || {};
  const manifestId = String(manifestBlock.ManifestID || '').trim();
  const collectionCodes = asStringArray(payload.CollectionCodes);
  const packageAwbs = asStringArray(payload.PackageAWBs);

  if (payload.RemoveFromManifest === true) {
    return {
      ManifestID: '',
      ManifestCode: '',
      manifestId: null,
      CollectionCode: '',
      CollectionCodes: [],
      notes: `Removed from manifest at ${new Date().toISOString()}`,
    };
  }

  const updates: Record<string, unknown> = {
    ManifestID: manifestId,
    ManifestCode: manifestBlock.ManifestCode || '',
    ServiceTypeID: manifestBlock.ServiceTypeID || '',
    CollectionCode: collectionCodes[0] || '',
    CollectionCodes: collectionCodes,
    PackageAWBs: packageAwbs,
    manifestStatus: String(manifestBlock.ManifestStatus ?? '0'),
    manifestStatusLabel:
      MANIFEST_STATUS_MAP[String(manifestBlock.ManifestStatus ?? '0')] ||
      'AT WAREHOUSE',
    serviceTypeName:
      SERVICE_TYPE_MAP[manifestBlock.ServiceTypeID || ''] || 'UNSPECIFIED',
    awbNumber: manifestBlock.AWBNumber || '',
    staffName: manifestBlock.StaffName || '',
    notes: JSON.stringify({
      manifestId,
      manifestCode: manifestBlock.ManifestCode,
      collectionCodes,
      packageAwbs,
      updatedAt: new Date().toISOString(),
    }),
  };

  if (manifestBlock.Weight !== undefined) {
    updates.weight = Number(manifestBlock.Weight);
  }
  if (manifestBlock.FlightDate) {
    updates.flightDate = toDate(manifestBlock.FlightDate);
  }
  if (manifestBlock.EntryDate) {
    updates.entryDate = toDate(manifestBlock.EntryDate);
  }
  if (manifestBlock.EntryDateTime) {
    updates.entryDateTime = toDate(manifestBlock.EntryDateTime);
  }

  if (packageAwbs.includes(tn) || collectionCodes.length > 0) {
    updates.linkedToManifest = true;
  }

  return updates;
}

export async function linkPackagesToManifest(
  payload: KcdManifestPayload,
  pathTrackingNumber: string
): Promise<{ linkedByTracking: number; linkedByControl: number }> {
  const collectionCodes = asStringArray(payload.CollectionCodes);
  let packageAwbs = asStringArray(payload.PackageAWBs);
  const tn = pathTrackingNumber.trim().toUpperCase();

  if (!packageAwbs.includes(tn)) {
    packageAwbs = [...packageAwbs, tn];
  }

  const manifestId = String(payload.Manifest?.ManifestID || '').trim();
  const manifestCode = payload.Manifest?.ManifestCode || '';
  const setBase = {
    ManifestID: manifestId,
    ManifestCode: manifestCode,
    updatedAt: new Date(),
  };

  let linkedByTracking = 0;
  if (packageAwbs.length > 0) {
    const r = await Package.updateMany(
      { trackingNumber: { $in: packageAwbs } },
      { $set: setBase }
    );
    linkedByTracking = r.modifiedCount;
  }

  let linkedByControl = 0;
  if (collectionCodes.length > 0) {
    const r = await Package.updateMany(
      {
        $or: [
          { controlNumber: { $in: collectionCodes } },
          { ControlNumber: { $in: collectionCodes } },
        ],
      },
      { $set: setBase }
    );
    linkedByControl = r.modifiedCount;
  }

  return { linkedByTracking, linkedByControl };
}

export async function removePackageFromManifest(
  trackingNumber: string
): Promise<boolean> {
  const tn = trackingNumber.trim().toUpperCase();
  const result = await Package.findOneAndUpdate(
    { trackingNumber: tn },
    {
      $set: {
        ManifestID: '',
        ManifestCode: '',
        manifestId: null,
        CollectionCode: '',
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
  return !!result;
}

export function isManifestRemoveRequest(payload: KcdManifestPayload): boolean {
  if (payload.RemoveFromManifest === true) return true;
  const manifestId = String(payload.Manifest?.ManifestID ?? '').trim();
  return payload.Manifest !== undefined && !manifestId;
}
