// File: src/lib/tasoko-validators.ts
export interface CustomerPayload {
  UserCode: string;
  FirstName: string;
  LastName: string;
  Branch?: string;
  CustomerServiceTypeID?: string;
  CustomerLevelInstructions?: string;
  CourierServiceTypeID?: string;
  CourierLevelInstructions?: string;
}

export interface PackagePayload {
  PackageID: string;
  CourierID: string;
  TrackingNumber: string;
  FirstName: string;
  LastName: string;
  UserCode: string;
  Weight: number;
  Shipper: string;
  Description: string;
  EntryDate: string;
  EntryDateTime: string;
  Branch?: string;
  // ... other fields as per specification
}

export interface ManifestPayload {
  APIToken: string;
  CollectionCodes: string[];
  PackageAWBs: string[];
  Manifest: {
    ManifestID: string;
    CourierID: string;
    ServiceTypeID: string;
    ManifestStatus: string;
    ManifestCode: string;
    FlightDate: string;
    Weight: number;
    ItemCount: number;
    ManifestNumber: number;
    StaffName: string;
    EntryDate: string;
    EntryDateTime: string;
    AWBNumber: string;
  };
}

export class TasokoValidator {
  /**
   * Validate package payload
   */
  static validatePackage(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.TrackingNumber?.trim()) {
      errors.push('TrackingNumber is required');
    }
    if (!payload.UserCode?.trim()) {
      errors.push('UserCode is required');
    }
    if (typeof payload.Weight !== 'number' || payload.Weight < 0) {
      errors.push('Weight must be a non-negative number');
    }
    if (!payload.Shipper?.trim()) {
      errors.push('Shipper is required');
    }
    if (!payload.FirstName?.trim() || !payload.LastName?.trim()) {
      errors.push('FirstName and LastName are required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate customer payload
   */
  static validateCustomer(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.UserCode?.trim()) {
      errors.push('UserCode is required');
    }
    if (!payload.FirstName?.trim() || !payload.LastName?.trim()) {
      errors.push('FirstName and LastName are required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate manifest payload
   */
  static validateManifest(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.Manifest?.ManifestID?.trim()) {
      errors.push('Manifest.ManifestID is required');
    }
    if (!Array.isArray(payload.CollectionCodes)) {
      errors.push('CollectionCodes must be an array');
    }
    if (!Array.isArray(payload.PackageAWBs)) {
      errors.push('PackageAWBs must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ==============