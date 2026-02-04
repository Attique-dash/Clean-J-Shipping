export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: string;
}

export interface CustomerUpdateRequest {
  name?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ShippingAddress {
  _id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
  createdAt?: Date;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  shippingAddresses?: ShippingAddress[];
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: string;
    timezone: string;
  };
}

export interface CustomerStats {
  total: number;
  active: number;
  new: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    packageCount: number;
    totalValue: number;
  }>;
}
