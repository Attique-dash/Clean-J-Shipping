import { getExternalStatusLabel } from '@/lib/mappings';
import { CurrencyService } from '@/lib/currency-service';
import type { KcdPackage, KcdPackageRecord } from '@/types/kcd-package';

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

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Read tracking from KCD or legacy camelCase document */
export function getDocTrackingNumber(doc: Record<string, unknown>): string {
  return asString(doc.TrackingNumber || doc.trackingNumber).toUpperCase();
}

export function getDocUserCode(doc: Record<string, unknown>): string {
  return asString(doc.UserCode || doc.userCode);
}

export function getCustomerDisplayName(pkg: KcdPackage): string {
  const name = `${pkg.FirstName || ''} ${pkg.LastName || ''}`.trim();
  return name || 'N/A';
}

/** Format sender address without injecting default city/state/zip placeholders */
export function formatSenderAddressLine(pkg: {
  senderAddress?: string;
  senderCity?: string;
  senderState?: string;
  senderZipCode?: string;
}): string {
  const street = asString(pkg.senderAddress).trim();
  const city = asString(pkg.senderCity).trim();
  const state = asString(pkg.senderState).trim();
  const zip = asString(pkg.senderZipCode).trim();

  const localityParts: string[] = [];
  if (city) localityParts.push(city);
  if (state && state !== city) localityParts.push(state);
  if (zip && zip !== '00000') localityParts.push(zip);

  if (street && localityParts.length > 0) {
    return `${street}, ${localityParts.join(', ')}`;
  }
  return street || localityParts.join(', ') || '';
}

export function getPackageStatusLabel(pkg: KcdPackage): string {
  return getExternalStatusLabel(pkg.PackageStatus ?? 0);
}

/** Form status string → KCD PackageStatus number */
export function formStatusToPackageStatus(status: string): number {
  // Handle new numeric string values (warehouse status)
  const num = Number(status);
  if (!Number.isNaN(num) && num >= 0 && num <= 4) {
    return num;
  }
  // Handle new delivery status values
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'delivered_to_customer') return 4;
  if (s === 'picked_up' || s === 'picked_up_by_customer') return 5;
  // Fallback to legacy status mapping
  return legacyStatusToPackageStatus(status);
}

/** KCD PackageStatus / legacy status → admin form status string */
export function packageStatusToFormStatus(
  packageStatus: number,
  legacyStatus?: string
): string {
  // Return numeric string for warehouse status
  if (packageStatus >= 0 && packageStatus <= 4) {
    return String(packageStatus);
  }
  // Fallback to legacy status
  const legacy = asString(legacyStatus).toLowerCase();
  const known = [
    'received',
    'in_processing',
    'customs_pending',
    'customs_cleared',
    'ready_to_ship',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered',
  ];
  if (legacy && known.includes(legacy)) return legacy;

  const fromNumeric: Record<number, string> = {
    0: '0',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
  };
  return fromNumeric[packageStatus] ?? '0';
}

export function getPackagePaymentCurrency(
  doc?: Record<string, unknown>,
  parsed?: PackagePaymentMeta
): string {
  const candidates = [
    doc?.amountPaidCurrency,
    doc?.paymentCurrency,
    doc?.pricePaidCurrency,
    doc?.paymentCurrencyCode,
    doc?.currencyCode,
    doc?.currency,
    parsed?.currency,
  ];

  for (const candidate of candidates) {
    const value = asString(candidate).trim().toUpperCase();
    if (value) return value;
  }

  return 'USD';
}

export function formatPackageAmount(amount: number, currencyCode?: string): string {
  const code = (currencyCode || 'USD').toUpperCase();
  if (CurrencyService.isSupported(code)) {
    return CurrencyService.format(amount, code);
  }
  return `${code} ${amount.toFixed(2)}`;
}

export function getCurrencySymbol(currencyCode?: string): string {
  const info = CurrencyService.getCurrencyInfo((currencyCode || 'USD').toUpperCase());
  return info?.symbol ?? '$';
}

/** Build MongoDB $or search on KCD + legacy field names (migration) */
export function packageTextSearchOr(regex: RegExp): Record<string, unknown>[] {
  return [
    { TrackingNumber: regex },
    { trackingNumber: regex },
    { Description: regex },
    { description: regex },
    { Shipper: regex },
    { shipper: regex },
    { ControlNumber: regex },
    { controlNumber: regex },
    { UserCode: regex },
    { userCode: regex },
    { FirstName: regex },
    { LastName: regex },
  ];
}

/** Serialize DB document to canonical KCD array item */
export function toKcdPackage(
  doc: Record<string, unknown>,
  options?: { apiToken?: string; includeMeta?: boolean }
): KcdPackageRecord {
  const populatedUser =
    doc.userId && typeof doc.userId === 'object'
      ? (doc.userId as Record<string, unknown>)
      : null;

  const firstName =
    asString(doc.FirstName) ||
    (populatedUser ? asString(populatedUser.firstName) : '');
  const lastName =
    asString(doc.LastName) ||
    (populatedUser ? asString(populatedUser.lastName) : '');

  const packageStatus =
    doc.PackageStatus !== undefined && doc.PackageStatus !== null
      ? asNumber(doc.PackageStatus)
      : legacyStatusToPackageStatus(asString(doc.status));

  const entryDate = doc.EntryDate || doc.entryDate || doc.receivedAt || doc.createdAt;
  const entryDateTime = doc.EntryDateTime || doc.EntryDate || doc.entryDate || doc.createdAt;

  const kcd: KcdPackageRecord = {
    _id: String(doc._id || ''),
    PackageID: asString(doc.PackageID) || String(doc._id || ''),
    CourierID: asString(doc.CourierID || doc.courierId),
    ManifestID: asString(doc.ManifestID || doc.manifestId),
    CollectionID: asString(doc.CollectionID || doc.collectionId),
    TrackingNumber: getDocTrackingNumber(doc),
    ControlNumber: asString(doc.ControlNumber || doc.controlNumber),
    FirstName: firstName,
    LastName: lastName,
    UserCode: getDocUserCode(doc) || (populatedUser ? asString(populatedUser.userCode) : ''),
    Weight: asNumber(doc.Weight ?? doc.weight),
    Shipper: asString(doc.Shipper || doc.shipper),
    EntryStaff: asString(doc.EntryStaff || doc.entryStaff),
    EntryDate: toIso(entryDate),
    EntryDateTime: toIso(entryDateTime),
    Branch: asString(doc.Branch || doc.branch),
    Claimed: asBool(doc.Claimed ?? doc.claimed),
    APIToken: options?.apiToken ?? asString(doc.APIToken) ?? '',
    ShowControls: asBool(doc.ShowControls),
    ManifestCode: asString(doc.ManifestCode),
    CollectionCode: asString(doc.CollectionCode),
    Description: asString(doc.Description || doc.description || doc.itemDescription),
    HSCode: asString(doc.HSCode || doc.hsCode),
    Unknown: asBool(doc.Unknown ?? doc.unknown),
    AIProcessed: asBool(doc.AIProcessed ?? doc.aiProcessed),
    OriginalHouseNumber: asString(doc.OriginalHouseNumber),
    Cubes: asNumber(doc.Cubes ?? doc.cubes),
    Length: asNumber(doc.Length ?? doc.length),
    Width: asNumber(doc.Width ?? doc.width),
    Height: asNumber(doc.Height ?? doc.height),
    Pieces: asNumber(doc.Pieces ?? doc.pieces, 1),
    Discrepancy: asBool(doc.Discrepancy ?? doc.discrepancy),
    DiscrepancyDescription: asString(doc.DiscrepancyDescription || doc.discrepancyDescription),
    ServiceTypeID: asString(doc.ServiceTypeID || doc.serviceTypeId),
    HazmatCodeID: asString(doc.HazmatCodeID || doc.hazmatCodeId),
    Coloaded: asBool(doc.Coloaded ?? doc.coloaded),
    ColoadIndicator: asString(doc.ColoadIndicator || doc.coloadIndicator),
    PackageStatus: packageStatus,
    PackagePayments: asString(doc.PackagePayments || doc.packagePayments),
  };

  if (options?.includeMeta !== false) {
    kcd.createdAt = toIso(doc.createdAt);
    kcd.updatedAt = toIso(doc.updatedAt);
  }

  return enrichKcdPackageRecord(kcd, doc);
}

export function toKcdPackageArray(
  docs: Record<string, unknown>[],
  options?: { apiToken?: string }
): KcdPackageRecord[] {
  return docs.map((doc) => toKcdPackage(doc, options));
}

/** KCD webhook/public API shape — PascalCase fields only, no Mongo metadata */
export function toPublicKcdPackage(
  doc: Record<string, unknown>,
  options?: { apiToken?: string }
): KcdPackage {
  const full = toKcdPackage(doc, { ...options, includeMeta: false });
  const {
    _id: _omitId,
    createdAt: _omitCreated,
    updatedAt: _omitUpdated,
    dateReceived: _omitReceived,
    daysInStorage: _omitDays,
    totalAmount: _omitTotal,
    amountPaid: _omitPaid,
    paymentStatus: _omitPayStatus,
    paymentMethod: _omitPayMethod,
    serviceMode: _omitMode,
    customerEmail: _omitEmail,
    customerPhone: _omitPhone,
    invoiceStatus: _omitInv,
    pricePaid: _omitPrice,
    pricePaidCurrency: _omitPriceCur,
    itemValueUsd: _omitVal,
    weightLbs: _omitLbs,
    itemDescription: _omitDesc,
    specialInstructions: _omitSpec,
    senderName: _omitSender,
    senderEmail: _omitSenderEmail,
    senderPhone: _omitSenderPhone,
    senderAddress: _omitSenderAddr,
    senderCity: _omitSenderCity,
    senderState: _omitSenderState,
    senderZipCode: _omitSenderZip,
    senderCountry: _omitSenderCountry,
    dimensionUnit: _omitDimUnit,
    billingInvoiceId: _omitBill,
    ...kcd
  } = full;
  void _omitId;
  void _omitCreated;
  void _omitUpdated;
  void _omitReceived;
  void _omitDays;
  void _omitTotal;
  void _omitPaid;
  void _omitPayStatus;
  void _omitPayMethod;
  void _omitMode;
  void _omitEmail;
  void _omitPhone;
  void _omitInv;
  void _omitPrice;
  void _omitPriceCur;
  void _omitVal;
  void _omitLbs;
  void _omitDesc;
  void _omitSpec;
  void _omitSender;
  void _omitSenderEmail;
  void _omitSenderPhone;
  void _omitSenderAddr;
  void _omitSenderCity;
  void _omitSenderState;
  void _omitSenderZip;
  void _omitSenderCountry;
  void _omitDimUnit;
  void _omitBill;
  return kcd;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

function calcDaysInStorage(dateReceived: unknown, createdAt: unknown): number {
  const base = dateReceived || createdAt;
  if (!base) return 0;
  const d = new Date(String(base));
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function calcShippingCostUsd(weightLbs: number): number {
  if (weightLbs <= 0) return 0;
  const firstLb = 5;
  const perLb = 2.5;
  return firstLb + Math.max(0, Math.ceil(weightLbs) - 1) * perLb;
}

export type PackagePaymentMeta = {
  paymentStatus: string;
  paymentMethod: string;
  itemValueUsd: number;
  shippingCostUsd: number;
  totalAmountUsd: number;
  amountPaidUsd: number;
  currency: string;
};

export function serializePackagePayments(meta: PackagePaymentMeta): string {
  return JSON.stringify(meta);
}

export function parsePackagePayments(
  raw: string | undefined,
  doc?: Record<string, unknown>
): PackagePaymentMeta {
  let parsed: Record<string, unknown> = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  const itemValueUsd = asNumber(
    doc?.itemValueUSD ?? doc?.itemValue ?? doc?.value ?? parsed.itemValueUsd
  );
  const weightLbs = getWeightLbsFromDoc(doc || {});
  const shippingCostUsd =
    asNumber(doc?.shippingCostUsd ?? parsed.shippingCostUsd) ||
    calcShippingCostUsd(weightLbs);
  const totalAmountUsd =
    asNumber(doc?.totalAmount ?? parsed.totalAmountUsd) ||
    (itemValueUsd > 0 ? itemValueUsd + shippingCostUsd : shippingCostUsd);
  const amountPaidUsd = asNumber(doc?.amountPaid ?? parsed.amountPaidUsd);

  return {
    paymentStatus:
      asString(doc?.paymentStatus ?? parsed.paymentStatus) || 'pending',
    paymentMethod: asString(doc?.paymentMethod ?? parsed.paymentMethod) || 'cash',
    itemValueUsd,
    shippingCostUsd,
    totalAmountUsd,
    amountPaidUsd,
    currency:
      getPackagePaymentCurrency(doc, parsed as PackagePaymentMeta | undefined) ||
      'USD',
  };
}

export function getWeightLbsFromDoc(doc: Record<string, unknown>): number {
  const unit = asString(doc.WeightUnit || doc.weightUnit).toLowerCase();
  const w = asNumber(doc.Weight ?? doc.weight);
  if (unit === 'kg') return kgToLbs(w);
  if (w > 0) return w;
  const legacyKg = asNumber(doc.weight);
  if (legacyKg > 0 && doc.weightUnit !== 'lb') return kgToLbs(legacyKg);
  return asNumber(doc.weightLbs);
}

/** Add UI fields: weight in lb, USD payment, customer contact */
export function enrichKcdPackageRecord(
  kcd: KcdPackageRecord,
  doc: Record<string, unknown>
): KcdPackageRecord {
  const weightLbs = getWeightLbsFromDoc({
    ...doc,
    Weight: kcd.Weight,
    WeightUnit: doc.WeightUnit,
  });
  const payment = parsePackagePayments(kcd.PackagePayments, doc);
  const entryDate = kcd.EntryDate || kcd.createdAt;

  const populatedUser =
    doc.userId && typeof doc.userId === 'object'
      ? (doc.userId as Record<string, unknown>)
      : null;

  const sender =
    doc.sender && typeof doc.sender === 'object'
      ? (doc.sender as Record<string, unknown>)
      : null;

  return {
    ...kcd,
    weightLbs: Math.round(weightLbs * 100) / 100,
    itemValueUsd: payment.itemValueUsd,
    totalAmount: payment.totalAmountUsd,
    amountPaid: payment.amountPaidUsd,
    paymentStatus: payment.paymentStatus,
    paymentMethod: payment.paymentMethod,
    pricePaid: payment.amountPaidUsd,
    pricePaidCurrency: payment.currency,
    customerEmail: populatedUser ? asString(populatedUser.email) : undefined,
    customerPhone: populatedUser ? asString(populatedUser.phone) : undefined,
    dateReceived: entryDate || null,
    daysInStorage: calcDaysInStorage(entryDate, kcd.createdAt),
    serviceMode: asString(doc.serviceMode) || 'air',
    invoiceStatus: asString(doc.invoiceStatus) || 'pending',
    itemDescription: asString(doc.itemDescription),
    specialInstructions: asString(doc.specialInstructions),
    dimensionUnit:
      asString(doc.dimensionUnit) ||
      asString((doc.dimensions as Record<string, unknown> | undefined)?.unit) ||
      'cm',
    senderName: asString(doc.senderName) || (sender ? asString(sender.name) : ''),
    senderEmail: asString(doc.senderEmail) || (sender ? asString(sender.email) : ''),
    senderPhone: asString(doc.senderPhone) || (sender ? asString(sender.phone) : ''),
    senderAddress:
      asString(doc.senderAddress) || (sender ? asString(sender.address) : ''),
    senderCity: asString(doc.senderCity) || (sender ? asString(sender.city) : ''),
    senderState: asString(doc.senderState) || (sender ? asString(sender.state) : ''),
    senderZipCode:
      asString(doc.senderZipCode) || (sender ? asString(sender.zipCode) : ''),
    senderCountry:
      asString(doc.senderCountry) || (sender ? asString(sender.country) : ''),
    billingInvoiceId: asString(doc.billingInvoiceId) || undefined,
  };
}

/** Map legacy string status to KCD numeric PackageStatus */
function legacyStatusToPackageStatus(status: string): number {
  const s = status.toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'at local port' || s === 'customs_cleared') return 3;
  if (s === 'in_transit' || s === 'shipped' || s === 'in_transit_to_local_port') return 2;
  if (s === 'ready_to_ship' || s === 'delivered_to_airport') return 1;
  if (s === 'received' || s === 'at warehouse' || s === 'in_storage') return 0;
  return 0;
}

export type KcdPackageInput = Record<string, unknown>;

/** Build mongoose create/update payload from webhook or form body */
export function buildKcdPackageDocument(
  body: KcdPackageInput,
  user: { _id: unknown; userCode?: string; firstName?: string; lastName?: string },
  overrides?: Partial<KcdPackageInput>
): Record<string, unknown> {
  const trackingRaw = asString(
    body.TrackingNumber || body.trackingNumber
  );
  const tracking = trackingRaw ? trackingRaw.toUpperCase() : '';
  
  if (!tracking) {
    throw new Error('TrackingNumber is required and cannot be empty');
  }
  const receivedAt =
    body.EntryDateTime ||
    body.EntryDate ||
    body.receivedAt ||
    body.entryDate;

  const parsedEntry = receivedAt ? new Date(asString(receivedAt)) : new Date();
  const entryDate = Number.isNaN(parsedEntry.getTime()) ? new Date() : parsedEntry;
  const weightUnit = asString(body.weightUnit || body.WeightUnit).toLowerCase() || 'lb';
  const weightLbs = asNumber(
    body.weightLbs ?? body.weightLb ?? (weightUnit === 'lb' ? body.Weight ?? body.weight : 0)
  );
  const weightStored =
    weightLbs > 0
      ? weightLbs
      : weightUnit === 'kg'
        ? kgToLbs(asNumber(body.Weight ?? body.weight))
        : asNumber(body.Weight ?? body.weight);

  const dimensions =
    body.dimensions && typeof body.dimensions === 'object'
      ? (body.dimensions as Record<string, unknown>)
      : null;
  const sender =
    body.sender && typeof body.sender === 'object'
      ? (body.sender as Record<string, unknown>)
      : null;

  const itemValueUsd = asNumber(
    body.itemValueUSD ?? body.itemValueUsd ?? body.itemValue ?? body.value
  );
  const totalUsd = asNumber(body.totalAmount) || itemValueUsd;
  const paymentCurrency = getPackagePaymentCurrency(body);
  const paymentMeta: PackagePaymentMeta = {
    paymentStatus: asString(body.paymentStatus) || 'pending',
    paymentMethod: asString(body.paymentMethod) || 'cash',
    itemValueUsd,
    shippingCostUsd: calcShippingCostUsd(weightStored),
    totalAmountUsd: totalUsd,
    amountPaidUsd: asNumber(body.amountPaid),
    currency: paymentCurrency,
  };

  return {
    PackageID: asString(body.PackageID || body.packageId) || undefined,
    CourierID: asString(body.CourierID || body.courierId) || undefined,
    ManifestID: asString(body.ManifestID || body.manifestId) || undefined,
    CollectionID: asString(body.CollectionID || body.collectionId) || undefined,
    TrackingNumber: tracking,
    ControlNumber: asString(
      body.ControlNumber || body.controlNumber || body.houseNumber || body.HouseNumber
    ) || undefined,
    FirstName:
      asString(body.FirstName || body.firstName) || user.firstName || '',
    LastName: asString(body.LastName || body.lastName) || user.lastName || '',
    UserCode: asString(body.UserCode || body.userCode || body.customerMailbox) || user.userCode,
    Weight: weightStored,
    WeightUnit: 'lb',
    Shipper: asString(body.Shipper || body.shipper) || 'Unknown Shipper',
    EntryStaff: asString(body.EntryStaff || body.entryStaff) || 'System',
    EntryDate: entryDate,
    EntryDateTime: entryDate,
    Branch: asString(body.Branch || body.branch) || 'KCD Main Warehouse',
    Claimed: asBool(body.Claimed ?? body.claimed),
    APIToken: asString(body.APIToken),
    ShowControls: asBool(body.ShowControls),
    ManifestCode: asString(body.ManifestCode),
    CollectionCode: asString(body.CollectionCode),
    Description:
      asString(body.Description || body.description) ||
      `Package from ${asString(body.Shipper || body.shipper) || 'Unknown'}`,
    HSCode: asString(body.HSCode || body.hsCode),
    Unknown: asBool(body.Unknown ?? body.unknown),
    AIProcessed: asBool(body.AIProcessed ?? body.aiProcessed),
    OriginalHouseNumber: asString(body.OriginalHouseNumber),
    Cubes: asNumber(body.Cubes ?? body.cubes),
    Length: asNumber(body.Length ?? dimensions?.length ?? body.length),
    Width: asNumber(body.Width ?? dimensions?.width ?? body.width),
    Height: asNumber(body.Height ?? dimensions?.height ?? body.height),
    dimensionUnit: asString(dimensions?.unit ?? body.dimensionUnit) || 'cm',
    length: asNumber(body.Length ?? dimensions?.length ?? body.length),
    width: asNumber(body.Width ?? dimensions?.width ?? body.width),
    height: asNumber(body.Height ?? dimensions?.height ?? body.height),
    Pieces: asNumber(body.Pieces ?? body.pieces, 1),
    Discrepancy: asBool(body.Discrepancy ?? body.discrepancy),
    DiscrepancyDescription: asString(
      body.DiscrepancyDescription || body.discrepancyDescription
    ),
    ServiceTypeID: asString(body.ServiceTypeID || body.serviceTypeId),
    HazmatCodeID: asString(body.HazmatCodeID || body.hazmatCodeId),
    Coloaded: asBool(body.Coloaded ?? body.coloaded),
    ColoadIndicator: asString(body.ColoadIndicator || body.coloadIndicator),
    PackageStatus: body.status
      ? formStatusToPackageStatus(asString(body.status))
      : asNumber(body.PackageStatus ?? body.packageStatus, 0),
    PackagePayments:
      asString(body.PackagePayments || body.packagePayments) ||
      serializePackagePayments(paymentMeta),
    itemValueUSD: itemValueUsd,
    totalAmount: totalUsd,
    amountPaid: asNumber(body.amountPaid),
    amountPaidCurrency: paymentCurrency,
    pricePaidCurrency: paymentCurrency,
    paymentStatus: paymentMeta.paymentStatus,
    paymentMethod: paymentMeta.paymentMethod,
    paymentCurrency,
    currency: paymentCurrency,
    serviceMode: asString(body.serviceMode) || 'air',
    itemDescription: asString(body.itemDescription),
    specialInstructions: asString(body.specialInstructions),
    senderName: asString(body.senderName) || (sender ? asString(sender.name) : ''),
    senderEmail: asString(body.senderEmail) || (sender ? asString(sender.email) : ''),
    senderPhone: asString(body.senderPhone) || (sender ? asString(sender.phone) : ''),
    senderAddress:
      asString(body.senderAddress) || (sender ? asString(sender.address) : ''),
    senderCity: asString(body.senderCity) || (sender ? asString(sender.city) : ''),
    senderState: asString(body.senderState) || (sender ? asString(sender.state) : ''),
    senderZipCode:
      asString(body.senderZipCode) || (sender ? asString(sender.zipCode) : ''),
    senderCountry:
      asString(body.senderCountry) || (sender ? asString(sender.country) : ''),
    sender: sender ?? {
      name: asString(body.senderName),
      email: asString(body.senderEmail),
      phone: asString(body.senderPhone),
      address: asString(body.senderAddress),
      city: asString(body.senderCity),
      state: asString(body.senderState),
      zipCode: asString(body.senderZipCode),
      country: asString(body.senderCountry),
    },
    status: asString(body.status) || 'received',
    userId: user._id,
    customer: user._id,
    source: asString(body.source) || 'manual',
    ...overrides,
  };
}

/** Log canonical KCD fields only (no UI enrichment) */
export function logKcdPackageConsole(context: string, pkg: KcdPackageRecord): void {
  const {
    _id,
    createdAt,
    updatedAt,
    weightLbs,
    itemValueUsd,
    totalAmount,
    amountPaid,
    paymentStatus,
    paymentMethod,
    customerEmail,
    customerPhone,
    daysInStorage,
    dateReceived,
    invoiceStatus,
    serviceMode,
    pricePaid,
    pricePaidCurrency,
    ...kcdCore
  } = pkg;
  void _id;
  void createdAt;
  void updatedAt;
  void weightLbs;
  void itemValueUsd;
  void totalAmount;
  void amountPaid;
  void paymentStatus;
  void paymentMethod;
  void customerEmail;
  void customerPhone;
  void daysInStorage;
  void dateReceived;
  void invoiceStatus;
  void serviceMode;
  void pricePaid;
  void pricePaidCurrency;
  console.log(`[${context}] KCD format:`, JSON.stringify(kcdCore, null, 2));
}

/** Log full KCD payload for list responses */
export function logKcdPackages(context: string, packages: KcdPackageRecord[]): void {
  packages.forEach((p) => logKcdPackageConsole(context, p));
}
