// src/lib/warehouse-api.ts
// Reusable API client for warehouse-backend communication

const WAREHOUSE_BACKEND_URL = process.env.WAREHOUSE_BACKEND_URL || 'http://localhost:5000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

/**
 * Make a request to the warehouse backend
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${WAREHOUSE_BACKEND_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: 'Invalid response from server',
    }));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data,
      message: data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Admin API
export const adminApi = {
  // API Keys
  getApiKeys: (token: string) => makeRequest('/api/admin/api-keys', { token }),
  createApiKey: (token: string, data: { name: string; description?: string }) =>
    makeRequest('/api/admin/api-keys', { method: 'POST', token, body: data }),
  revokeApiKey: (token: string, id: string) =>
    makeRequest(`/api/admin/api-keys/${id}`, { method: 'DELETE', token }),
  
  // KCD Key
  getKcdKey: (token: string) => makeRequest('/api/admin/kcd-key', { token }),
  generateKcdKey: (token: string, data: { courierCode: string }) =>
    makeRequest('/api/admin/kcd-key', { method: 'POST', token, body: data }),
};

// Warehouse API
export const warehouseApi = {
  // Staff
  getStaff: (token: string, params?: { page?: number; limit?: number }) => {
    const query = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return makeRequest(`/api/warehouse/staff${query}`, { token });
  },
  createStaff: (token: string, data: any) =>
    makeRequest('/api/warehouse/staff', { method: 'POST', token, body: data }),
  updateStaff: (token: string, id: string, data: any) =>
    makeRequest(`/api/warehouse/staff/${id}`, { method: 'PUT', token, body: data }),
  deleteStaff: (token: string, id: string) =>
    makeRequest(`/api/warehouse/staff/${id}`, { method: 'DELETE', token }),

  // Addresses
  getAddresses: (token: string) => makeRequest('/api/warehouse/addresses', { token }),
  createAddress: (token: string, data: any) =>
    makeRequest('/api/warehouse/addresses', { method: 'POST', token, body: data }),
  updateAddress: (token: string, id: string, data: any) =>
    makeRequest(`/api/warehouse/addresses/${id}`, { method: 'PUT', token, body: data }),
  deleteAddress: (token: string, id: string) =>
    makeRequest(`/api/warehouse/addresses/${id}`, { method: 'DELETE', token }),

  // Manifests
  startManifest: (token: string, id: string) =>
    makeRequest(`/api/warehouse/manifests/${id}/start`, { method: 'POST', token }),
  completeManifest: (token: string, id: string, data?: any) =>
    makeRequest(`/api/warehouse/manifests/${id}/complete`, { method: 'POST', token, body: data }),
  addPackageToManifest: (token: string, manifestId: string, packageData: any) =>
    makeRequest(`/api/warehouse/manifests/${manifestId}/packages`, {
      method: 'POST',
      token,
      body: packageData,
    }),
  removePackageFromManifest: (token: string, manifestId: string, packageId: string) =>
    makeRequest(`/api/warehouse/manifests/${manifestId}/packages/${packageId}`, {
      method: 'DELETE',
      token,
    }),

  // Analytics
  getAnalytics:  (token: string, params?: { from?: string; to?: string; type?: string }) => {
    const query = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString()}`
      : '';
    return makeRequest(`/api/warehouse/analytics${query}`, { token });
  },
};

// Customer API
export const customerApi = {
  // Pre-alerts
  getPreAlerts: (token: string, params?: { page?: number; limit?: number }) => {
    const query = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return makeRequest(`/api/customer/packages/pre-alert${query}`, { token });
  },
  createPreAlert: (token: string, data: any) =>
    makeRequest('/api/customer/packages/pre-alert', { method: 'POST', token, body: data }),

  // Shipping Calculator
  calculateShipping: (token: string, data: {
    weight: number;
    dimensions?: { length?: number; width?: number; height?: number };
    origin?: string;
    destination: string;
    serviceMode?: string;
    packageType?: string;
  }) => makeRequest('/api/customer/shipping/calculate', { method: 'POST', token, body: data }),
  
  getShippingRates: (token: string, params?: {
    weight?: string;
    destination?: string;
    serviceMode?: string;
  }) => {
    const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString()}` : '';
    return makeRequest(`/api/customer/shipping/calculate${query}`, { token });
  },
};

// Re-export everything
export { makeRequest, WAREHOUSE_BACKEND_URL };
export default {
  admin: adminApi,
  warehouse: warehouseApi,
  customer: customerApi,
};
