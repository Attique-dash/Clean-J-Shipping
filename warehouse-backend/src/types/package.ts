export interface PackageCreateRequest {
  // Legacy fields for backward compatibility
  senderId?: string;
  recipientId?: string;
  senderName?: string;
  recipientName?: string;
  senderAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  recipientAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  description?: string;
  value?: number;
  currency?: string;
  insurance?: boolean;
  signatureRequired?: boolean;
  estimatedDelivery?: Date;
  shippingMethod?: string;
  priority?: 'standard' | 'express' | 'overnight';
  fragile?: boolean;
  hazardous?: boolean;
  specialInstructions?: string;
  notes?: string;
  trackingNumber?: string;
  userCode?: string;
  shipper?: string;
  itemDescription?: string;
  entryDate?: Date;
  status?: string;
  serviceMode?: 'air' | 'ocean' | 'local';
  itemValue?: number;
  isFragile?: boolean;
  isHazardous?: boolean;
  requiresSignature?: boolean;
  customsRequired?: boolean;
  customsStatus?: string;
  
  // New Tasoko API fields (from JSON example)
  PackageID?: string;           // UUID from Tasoko
  CourierID?: string;          // UUID from Tasoko
  TrackingNumber?: string;     // Alternative tracking number field
  ControlNumber?: string;       // EP0096513 format
  FirstName?: string;          // First name from Tasoko
  LastName?: string;           // Last name from Tasoko
  UserCode?: string;          // User code from Tasoko (alternative field)
  Weight?: number;            // Weight from Tasoko (alternative field)
  Shipper?: string;           // Shipper from Tasoko (alternative field)
  EntryStaff?: string;         // Entry staff from Tasoko
  EntryDate?: Date;          // Entry date from Tasoko
  EntryDateTime?: Date;       // Entry datetime from Tasoko
  Branch?: string;            // Branch from Tasoko
  APIToken?: string;         // API token from Tasoko
  ShowControls?: boolean;     // Show controls from Tasoko
  ManifestCode?: string;      // Manifest code from Tasoko
  CollectionCode?: string;    // Collection code from Tasoko
  Description?: string;       // Description from Tasoko
  HSCode?: string;          // HS code from Tasoko
  Unknown?: boolean;         // Unknown flag from Tasoko
  AIProcessed?: boolean;     // AI processed from Tasoko
  OriginalHouseNumber?: string; // Original house number from Tasoko
  Cubes?: number;           // Cubes from Tasoko
  Length?: number;          // Length from Tasoko
  Width?: number;           // Width from Tasoko
  Height?: number;          // Height from Tasoko
  Pieces?: number;          // Pieces from Tasoko
  Discrepancy?: boolean;    // Discrepancy from Tasoko
  DiscrepancyDescription?: string; // Discrepancy description from Tasoko
  ServiceTypeID?: string;   // Service type ID from Tasoko
  HazmatCodeID?: string;    // Hazmat code ID from Tasoko
  Coloaded?: boolean;       // Coloaded from Tasoko
  ColoadIndicator?: string; // Coload indicator from Tasoko
}

export interface TasokoPackageRequest {
  // Required fields from your JSON example
  PackageID?: string;           // "83383d43-a368-4fc1-a216-9e54e8ae7227"
  CourierID?: string;          // "15fff123-f237-4571-b92a-ae69427d7a56"
  ManifestID?: string;         // ""
  CollectionID?: string;       // ""
  TrackingNumber?: string;     // "DROPOFF-20240902-225642-547"
  ControlNumber?: string;      // "EP0096513"
  FirstName?: string;          // "Courtney"
  LastName?: string;           // "Patterson"
  UserCode?: string;          // "EPXUUYE"
  Weight?: number;            // 1
  Shipper?: string;           // "Amazon"
  EntryStaff?: string;        // ""
  EntryDate?: Date;          // "2024-09-02T00:00:00-05:00"
  EntryDateTime?: Date;       // "2024-09-02T21:55:51.1806146-05:00"
  Branch?: string;            // "Down Town"
  Claimed?: boolean;          // false
  APIToken?: string;         // "<API-TOKEN>"
  ShowControls?: boolean;     // false
  ManifestCode?: string;     // ""
  CollectionCode?: string;   // ""
  Description?: string;      // "Merchandise from Amazon"
  HSCode?: string;          // ""
  Unknown?: boolean;         // false
  AIProcessed?: boolean;     // false
  OriginalHouseNumber?: string; // ""
  Cubes?: number;           // 0
  Length?: number;          // 0
  Width?: number;           // 0
  Height?: number;          // 0
  Pieces?: number;          // 1
  Discrepancy?: boolean;    // false
  DiscrepancyDescription?: string; // ""
  ServiceTypeID?: string;   // ""
  HazmatCodeID?: string;    // ""
  Coloaded?: boolean;       // false
  ColoadIndicator?: string; // ""
}

export interface PackageUpdateRequest {
  status?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  description?: string;
  value?: number;
  currency?: string;
  insurance?: boolean;
  signatureRequired?: boolean;
  estimatedDelivery?: Date;
  shippingMethod?: string;
  priority?: 'standard' | 'express' | 'overnight';
  fragile?: boolean;
  hazardous?: boolean;
  specialInstructions?: string;
  notes?: string;
}

export interface TrackingUpdate {
  status: string;
  location: string;
  description?: string;
}

export interface PackageQuery {
  page?: number;
  limit?: number;
  status?: string;
  senderId?: string;
  recipientId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PackageStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  returned: number;
  lost: number;
}
