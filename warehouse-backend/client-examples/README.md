# KCD API Client Usage Guide

This directory contains correct examples of how to interact with the KCD API endpoints, preventing common client-side errors.

## 🚨 Common Client-Side Errors to Avoid

### 1. String vs Object Confusion

**❌ WRONG - This will cause an error:**
```javascript
// This is a STRING, not an object
const endpoint = 'api/admin/api-keys/kcd';
endpoint.apiToken = apiKey;  // ERROR: Cannot create property 'apiToken' on string
```

**✅ CORRECT - Use proper configuration object:**
```javascript
const config = {
  endpoint: 'api/admin/api-keys/kcd',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  data: {
    courierCode: 'CLEAN',
    expiresIn: 365
  }
};
```

### 2. Incorrect HTTP Methods

**❌ WRONG - Using GET instead of POST:**
```javascript
// Wrong: This endpoint requires POST
const response = await fetch('/api/admin/api-keys/kcd');
```

**✅ CORRECT - Use proper HTTP methods:**
```javascript
// Generate API Key: POST
const response = await fetch('/api/admin/api-keys/kcd', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ courierCode: 'CLEAN' })
});

// List API Keys: GET
const response = await fetch('/api/admin/api-keys/list', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 3. Incorrect Endpoint Paths

**❌ WRONG - Wrong endpoint paths:**
```javascript
// Wrong: Root endpoint returns documentation, not list
const response = await fetch('/api/admin/api-keys');

// Wrong: Old endpoint names
const response = await fetch('/api/admin/kcd-api-keys/generate');
```

**✅ CORRECT - Use proper endpoint paths:**
```javascript
// Generate new key
POST /api/admin/api-keys/kcd

// List all keys
GET /api/admin/api-keys/list

// Get connection info
GET /api/admin/api-keys/info

// Deactivate key
PUT /api/admin/api-keys/:keyId/deactivate

// Activate key
PUT /api/admin/api-keys/:keyId/activate

// Delete key
DELETE /api/admin/api-keys/:keyId

// Get API documentation
GET /api/admin/api-keys
```

## 📁 Files Available

### `kcd-api-client.js`
- JavaScript implementation of the KCD API client
- Works in both Node.js and browser environments
- Includes wrong vs right examples

### `kcd-api-client.ts`
- TypeScript implementation with full type safety
- Includes interface definitions for all API responses
- Better IDE support and error catching

## 🔧 Quick Start

### Using the JavaScript Client

```javascript
// Import or include the client
const { KCDApiClient } = require('./kcd-api-client.js');

// Create client instance
const client = new KCDApiClient('http://localhost:5000');

// Set admin authentication
client.setAdminToken('your-admin-jwt-token');

// Generate new API key
const result = await client.generateApiKey({
  courierCode: 'CLEAN',
  expiresIn: 365,
  description: 'My Integration Key'
});

console.log('Generated key:', result.data.apiKey);
```

### Using the TypeScript Client

```typescript
import KCDApiClient from './kcd-api-client';

// Create client instance
const client = new KCDApiClient('http://localhost:5000');

// Set admin authentication
client.setAdminToken('your-admin-jwt-token');

// Generate new API key with full type safety
const result = await client.generateApiKey({
  courierCode: 'CLEAN',
  expiresIn: 365,
  description: 'My Integration Key'
});

console.log('Generated key:', result.data.apiKey);
```

## 📋 Complete API Usage Examples

### 1. Generate New API Key

```javascript
const result = await client.generateApiKey({
  courierCode: 'CLEAN',
  expiresIn: 365,
  description: 'KCD Logistics Integration'
});

// Response structure:
// {
//   success: true,
//   message: '✅ KCD API key generated...',
//   data: {
//     apiKey: 'kcd_xxxxxxxxxxxx',
//     courierCode: 'CLEAN',
//     description: 'KCD Logistics Integration',
//     expiresAt: '2025-02-22T12:00:00.000Z',
//     createdAt: '2024-02-22T12:00:00.000Z',
//     nextSteps: ['1. Copy the API key above', ...]
//   }
// }
```

### 2. List All API Keys

```javascript
const result = await client.listApiKeys();

// Response structure:
// {
//   success: true,
//   message: 'API keys retrieved successfully',
//   data: {
//     total: 5,
//     active: 3,
//     apiKeys: [
//       {
//         _id: '507f1f77bcf86cd799439011',
//         courierCode: 'CLEAN',
//         description: 'Integration Key',
//         isActive: true,
//         expiresAt: '2025-02-22T12:00:00.000Z',
//         createdAt: '2024-02-22T12:00:00.000Z',
//         lastUsed: '2024-02-21T15:30:00.000Z',
//         usageCount: 42,
//         isExpired: false
//       }
//     ]
//   }
// }
```

### 3. Get KCD Connection Info

```javascript
const result = await client.getConnectionInfo();

// Response structure:
// {
//   success: true,
//   message: 'KCD connection information retrieved successfully',
//   data: {
//     hasActiveKey: true,
//     activeKeyCount: 2,
//     instruction: '✅ Active key exists...',
//     kcdPortalConfiguration: {
//       portalUrl: 'https://pack.kcdlogistics.com/',
//       steps: ['Login with: Username: CleanJShip...'],
//       apiToken: '✅ Use the key from POST response',
//       endpoints: {
//         getCustomers: 'http://localhost:5000/api/kcd/customers',
//         addPackage: 'http://localhost:5000/api/kcd/packages/add',
//         updatePackage: 'http://localhost:5000/api/kcd/packages/update'
//       }
//     }
//   }
// }
```

### 4. Deactivate API Key

```javascript
const keyId = '507f1f77bcf86cd799439011';
const result = await client.deactivateApiKey(keyId);
```

### 5. Activate API Key

```javascript
const keyId = '507f1f77bcf86cd799439011';
const result = await client.activateApiKey(keyId);
```

### 6. Delete API Key

```javascript
const keyId = '507f1f77bcf86cd799439011';
const result = await client.deleteApiKey(keyId);
```

### 7. Get API Documentation

```javascript
const result = await client.getEndpointsDocumentation();

// Returns complete API documentation with all available endpoints,
// request/response formats, and usage examples
```

## 🔒 Authentication

### Admin Authentication (for key management)
```javascript
client.setAdminToken('your-jwt-admin-token');
```

### API Key Authentication (for KCD endpoints)
```javascript
client.setApiKey('your-generated-kcd-api-key');
```

## 🛡️ Error Handling

All client methods throw errors with descriptive messages:

```javascript
try {
  const result = await client.generateApiKey();
  console.log('Success:', result.data);
} catch (error) {
  console.error('Error:', error.message);
  // Examples:
  // - "Valid key ID is required"
  // - "Courier code is required and must be a non-empty string"
  // - "Failed to generate API key: Network error"
}
```

## 📝 Response Format

All API responses follow the same structure:

```typescript
interface ApiResponse<T> {
  success: boolean;    // true if request succeeded
  message: string;     // human-readable message
  data: T;            // response payload
}
```

## 🚀 Best Practices

1. **Always use the client class** - Don't make raw fetch calls
2. **Check response.success** - Always verify the success flag
3. **Handle errors gracefully** - Wrap calls in try/catch
4. **Store API keys securely** - Never expose them in frontend code
5. **Use TypeScript** - Better type safety and IDE support
6. **Follow HTTP method semantics** - POST for creation, GET for retrieval, etc.

## 🔍 Debugging

Enable debug logging by checking the console output from the client. All operations log their status:

```
✅ API Key generated successfully
🔑 Key (copy now): kcd_xxxxxxxxxxxx
✅ Found 3 API keys
✅ Connection info retrieved
✅ API key deactivated
❌ Failed to generate API key: Courier code is required
```

## 📞 Support

If you encounter issues:

1. Check you're using the correct HTTP methods
2. Verify endpoint paths match the documentation
3. Ensure authentication tokens are valid
4. Check the browser console for detailed error messages
5. Use the TypeScript client for better error catching
