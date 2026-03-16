/**
 * KCD API Client - TypeScript Implementation
 * Type-safe client for KCD API endpoints with proper error handling
 */

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiKeyGenerationOptions {
  courierCode?: string;
  expiresIn?: number;
  description?: string;
}

interface ApiKeyInfo {
  _id: string;
  courierCode: string;
  description: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  lastUsed: string | null;
  usageCount: number;
  isExpired: boolean;
}

interface ApiKeyListResponse {
  total: number;
  active: number;
  apiKeys: ApiKeyInfo[];
}

interface KCDConnectionInfo {
  hasActiveKey: boolean;
  activeKeyCount: number;
  instruction: string;
  kcdPortalConfiguration: {
    portalUrl: string;
    steps: string[];
    apiToken: string;
    endpoints: {
      getCustomers: string;
      addPackage: string;
      updatePackage: string;
      description: string;
    };
  };
  createdKeys: Array<{
    _id: string;
    courierCode: string;
    createdAt: string;
    expiresAt: string;
    usageCount: number;
    lastUsed: string | null;
  }>;
}

interface EndpointDocumentation {
  method: string;
  path: string;
  description: string;
  usage?: string;
  requestBody?: Record<string, string>;
  params?: string;
  response?: string;
}

interface DocumentationResponse {
  success: boolean;
  message: string;
  availableEndpoints: EndpointDocumentation[];
  notes: string[];
}

class KCDApiClient {
  private baseURL: string;
  private adminToken: string | null = null;
  private apiKey: string | null = null;

  constructor(baseURL: string = 'http://localhost:5000') {
    this.baseURL = baseURL;
  }

  // ✅ CORRECT: Set authentication tokens properly
  setAdminToken(token: string): void {
    this.adminToken = token;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // ✅ CORRECT: Create proper request configuration object
  private makeRequestConfig(method: string = 'GET', data?: any, useApiKey: boolean = false): RequestInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': useApiKey 
        ? `Bearer ${this.apiKey}` 
        : `Bearer ${this.adminToken}`
    };

    const config: RequestInit = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    return config;
  }

  // ✅ CORRECT: Generate new KCD API key using POST
  async generateApiKey(options: ApiKeyGenerationOptions = {}): Promise<ApiResponse<{ 
    apiKey: string; 
    courierCode: string; 
    description: string; 
    expiresAt: string; 
    createdAt: string;
    nextSteps: string[];
  }>> {
    try {
      const { courierCode = 'CLEAN', expiresIn = 365, description } = options;
      
      const requestData = {
        courierCode,
        expiresIn,
        description: description || 'KCD Logistics Integration API Key'
      };

      const config = this.makeRequestConfig('POST', requestData, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/kcd`, config);
      
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        console.log('✅ API Key generated successfully');
        console.log('🔑 Key (copy now):', result.data.apiKey);
        this.setApiKey(result.data.apiKey);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to generate API key:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: List API keys using GET
  async listApiKeys(): Promise<ApiResponse<ApiKeyListResponse>> {
    try {
      const config = this.makeRequestConfig('GET', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/list`, config);
      
      const result: ApiResponse<ApiKeyListResponse> = await response.json();
      
      if (result.success) {
        console.log(`✅ Found ${result.data.total} API keys`);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to list API keys:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: Get connection info using GET
  async getConnectionInfo(): Promise<ApiResponse<KCDConnectionInfo>> {
    try {
      const config = this.makeRequestConfig('GET', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/info`, config);
      
      const result: ApiResponse<KCDConnectionInfo> = await response.json();
      
      if (result.success) {
        console.log('✅ Connection info retrieved');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to get connection info:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: Deactivate API key using PUT
  async deactivateApiKey(keyId: string): Promise<ApiResponse<ApiKeyInfo>> {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this.makeRequestConfig('PUT', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}/deactivate`, config);
      
      const result: ApiResponse<ApiKeyInfo> = await response.json();
      
      if (result.success) {
        console.log('✅ API key deactivated');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to deactivate API key:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: Activate API key using PUT
  async activateApiKey(keyId: string): Promise<ApiResponse<ApiKeyInfo>> {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this.makeRequestConfig('PUT', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}/activate`, config);
      
      const result: ApiResponse<ApiKeyInfo> = await response.json();
      
      if (result.success) {
        console.log('✅ API key activated');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to activate API key:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: Delete API key using DELETE
  async deleteApiKey(keyId: string): Promise<ApiResponse<{ deletedKeyId: string; courierCode: string }>> {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this.makeRequestConfig('DELETE', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}`, config);
      
      const result: ApiResponse<{ deletedKeyId: string; courierCode: string }> = await response.json();
      
      if (result.success) {
        console.log('✅ API key deleted');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to delete API key:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ✅ CORRECT: Get available endpoints documentation
  async getEndpointsDocumentation(): Promise<DocumentationResponse> {
    try {
      const config = this.makeRequestConfig('GET', undefined, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys`, config);
      
      const result: DocumentationResponse = await response.json();
      
      if (result.success) {
        console.log('✅ API documentation retrieved');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to get API documentation:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

// ❌ WRONG EXAMPLES - DO NOT USE THESE
export const WRONG_EXAMPLES = {
  // ❌ ERROR: Cannot set property on string
  wrongExample1: () => {
    const endpoint = 'api/admin/api-keys/kcd';
    // This will cause "Cannot create property 'apiToken' on string" error
    (endpoint as any).apiToken = 'some-key';  
  },

  // ❌ ERROR: Using GET instead of POST for generating keys
  wrongExample2: async () => {
    // Wrong: Missing POST method
    const response = await fetch('/api/admin/api-keys/kcd'); 
  },

  // ❌ ERROR: Incorrect endpoint paths
  wrongExample3: async () => {
    // Wrong: Should be /api/admin/api-keys/list
    const response = await fetch('/api/admin/api-keys'); 
  },

  // ❌ ERROR: Missing proper configuration object
  wrongExample4: () => {
    // Wrong: String instead of config object
    const config = 'api/admin/api-keys/kcd'; 
    // This will cause an error
    (config as any).apiToken = 'key'; 
  }
};

// ✅ CORRECT USAGE EXAMPLES
export const CORRECT_EXAMPLES = {
  // ✅ CORRECT: Proper configuration object
  correctExample1: () => {
    const config = {
      endpoint: '/api/admin/api-keys/kcd',
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-token'
      },
      data: {
        courierCode: 'CLEAN',
        expiresIn: 365
      }
    };
    return config;
  },

  // ✅ CORRECT: Using client class
  correctExample2: async () => {
    const client = new KCDApiClient('http://localhost:5000');
    client.setAdminToken('your-admin-token');
    
    // Generate new API key
    const keyResult = await client.generateApiKey({
      courierCode: 'CLEAN',
      expiresIn: 365,
      description: 'My API Key'
    });

    // List all keys
    const listResult = await client.listApiKeys();

    // Get connection info
    const infoResult = await client.getConnectionInfo();

    return { keyResult, listResult, infoResult };
  }
};

export default KCDApiClient;
