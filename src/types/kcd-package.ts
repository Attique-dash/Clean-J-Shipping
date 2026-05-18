// KCD / Tasoko canonical package shape (PascalCase fields)

export interface KcdPackage {
  PackageID?: string;
  CourierID?: string;
  ManifestID?: string;
  CollectionID?: string;
  TrackingNumber: string;
  ControlNumber?: string;
  FirstName?: string;
  LastName?: string;
  UserCode?: string;
  Weight?: number;
  Shipper?: string;
  EntryStaff?: string;
  EntryDate?: string;
  EntryDateTime?: string;
  Branch?: string;
  Claimed?: boolean;
  APIToken?: string;
  ShowControls?: boolean;
  ManifestCode?: string;
  CollectionCode?: string;
  Description?: string;
  HSCode?: string;
  Unknown?: boolean;
  AIProcessed?: boolean;
  OriginalHouseNumber?: string;
  Cubes?: number;
  Length?: number;
  Width?: number;
  Height?: number;
  Pieces?: number;
  Discrepancy?: boolean;
  DiscrepancyDescription?: string;
  ServiceTypeID?: string;
  HazmatCodeID?: string;
  Coloaded?: boolean;
  ColoadIndicator?: string;
  PackageStatus?: number;
  PackagePayments?: string;
}

/** Mongo document id + timestamps + optional legacy fields for UI during migration */
export interface KcdPackageRecord extends KcdPackage {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  dateReceived?: string | null;
  daysInStorage?: number;
  totalAmount?: number;
  amountPaid?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  serviceMode?: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceStatus?: string;
  pricePaid?: number;
  pricePaidCurrency?: string;
  itemValueUsd?: number;
  weightLbs?: number;
  itemDescription?: string;
  specialInstructions?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCity?: string;
  senderState?: string;
  senderZipCode?: string;
  senderCountry?: string;
  dimensionUnit?: string;
  billingInvoiceId?: string;
}
