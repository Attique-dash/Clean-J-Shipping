export interface PackageCreateRequest {
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  senderAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  recipientAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  weight: number;
  dimensions: {
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
