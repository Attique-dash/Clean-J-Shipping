/**
 * KCD API Client - Correct Usage Examples
 * This file demonstrates the proper way to interact with the KCD API endpoints
 * Prevents common errors like string vs object confusion and wrong HTTP methods
 */

class KCDApiClient {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.adminToken = null;
    this.apiKey = null;
  }

  // ✅ CORRECT: Set authentication tokens properly
  setAdminToken(token) {
    this.adminToken = token;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // ✅ CORRECT: Create proper request configuration object
  _makeRequestConfig(method = 'GET', data = null, useApiKey = false) {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': useApiKey 
          ? `Bearer ${this.apiKey}` 
          : `Bearer ${this.adminToken}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    return config;
  }

  // ✅ CORRECT: Generate new KCD API key using POST
  async generateApiKey(options = {}) {
    try {
      const { courierCode = 'CLEAN', expiresIn = 365, description } = options;
      
      const requestData = {
        courierCode,
        expiresIn,
        description: description || 'KCD Logistics Integration API Key'
      };

      const config = this._makeRequestConfig('POST', requestData, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/kcd`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ API Key generated successfully');
        console.log('🔑 Key (copy now):', result.data.apiKey);
        this.setApiKey(result.data.apiKey);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to generate API key:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: List API keys using GET
  async listApiKeys() {
    try {
      const config = this._makeRequestConfig('GET', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/list`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Found ${result.data.total} API keys`);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to list API keys:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: Get connection info using GET
  async getConnectionInfo() {
    try {
      const config = this._makeRequestConfig('GET', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/info`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Connection info retrieved');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to get connection info:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: Deactivate API key using PUT
  async deactivateApiKey(keyId) {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this._makeRequestConfig('PUT', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}/deactivate`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ API key deactivated');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to deactivate API key:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: Activate API key using PUT
  async activateApiKey(keyId) {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this._makeRequestConfig('PUT', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}/activate`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ API key activated');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to activate API key:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: Delete API key using DELETE
  async deleteApiKey(keyId) {
    try {
      if (!keyId || keyId.length !== 24) {
        throw new Error('Valid key ID is required');
      }

      const config = this._makeRequestConfig('DELETE', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys/${keyId}`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ API key deleted');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to delete API key:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT: Get available endpoints documentation
  async getEndpointsDocumentation() {
    try {
      const config = this._makeRequestConfig('GET', null, false);
      const response = await fetch(`${this.baseURL}/api/admin/api-keys`, config);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ API documentation retrieved');
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to get API documentation:', error.message);
      throw error;
    }
  }
}

// ❌ WRONG EXAMPLES - DO NOT USE THESE
const WRONG_EXAMPLES = {
  // ❌ ERROR: Cannot set property on string
  wrongExample1: () => {
    const endpoint = 'api/admin/api-keys/kcd';
    endpoint.apiToken = 'some-key';  // THIS CAUSES ERROR!
  },

  // ❌ ERROR: Using GET instead of POST for generating keys
  wrongExample2: async () => {
    const response = await fetch('/api/admin/api-keys/kcd'); // Missing POST method
  },

  // ❌ ERROR: Incorrect endpoint paths
  wrongExample3: async () => {
    const response = await fetch('/api/admin/api-keys'); // Should be /api/admin/api-keys/list
  },

  // ❌ ERROR: Missing proper configuration object
  wrongExample4: () => {
    const config = 'api/admin/api-keys/kcd'; // String instead of config object
    config.apiToken = 'key'; // Error!
  }
};

// ✅ CORRECT USAGE EXAMPLES
const CORRECT_EXAMPLES = {
  // ✅ CORRECT: Proper configuration object
  correctExample1: () => {
    const config = {
      endpoint: '/api/admin/api-keys/kcd',
      method: 'POST',
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

  // ✅ CORRECT: Using the client class
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KCDApiClient, WRONG_EXAMPLES, CORRECT_EXAMPLES };
}

// Example usage
if (typeof window !== 'undefined') {
  // Browser environment
  window.KCDApiClient = KCDApiClient;
  window.WRONG_EXAMPLES = WRONG_EXAMPLES;
  window.CORRECT_EXAMPLES = CORRECT_EXAMPLES;
}
