# 🚀 Complete Warehouse API Endpoints Testing Guide
## Updated with Working Database Integration ✅

## 🎯 **WORKING ENDPOINTS** - Database Connected & Tested

### ✅ **Core Package Management**
- **Add Package**: Stores packages in MongoDB with complete customer validation
- **Get Packages**: Retrieves real package data from database  
- **Pull Customer**: Fetches actual customer information

### 🔑 **Authentication**
- **API Key**: `wh_test_abc123`
- **Methods**: Query parameter `?id=wh_test_abc123` or Header `x-warehouse-key: wh_test_abc123`

---

## 🔐 Authentication Setup

All warehouse endpoints require API key authentication using the test key:
- **API Key**: `wh_test_abc123`
- **Methods**: 
  - Query parameter: `?id=wh_test_abc123`
  - Header: `x-warehouse-key: wh_test_abc123`
  - Header: `x-api-key: wh_test_abc123`

---

## 📦 Package Management Endpoints

### 1. Get All Packages ✅ UPDATED
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages?id=wh_test_abc123&page=1&per_page=20`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `page`: Page number (default: 1)
- `per_page`: Items per page (1-100, default: 20)
- `q`: Search term (optional)
- `status`: Status filter (optional)
- `userCode`: Customer code filter (optional)

**Headers:**
```
Content-Type: application/json
```

**Response Format:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Found 15 packages",
  "data": {
    "packages": [
      {
        "PackageID": "64f8a1b2c3d4e5f6a7b8c9d0",
        "TrackingNumber": "DROPOFF-20240902-225642-547",
        "FirstName": "Courtney",
        "LastName": "Patterson",
        "UserCode": "EPXUUYE",
        "Weight": 1,
        "Shipper": "Amazon",
        "Description": "Merchandise from Amazon",
        "EntryDate": "2024-09-02T21:55:51.180Z",
        "Branch": "Down Town",
        "PackageStatus": "At Warehouse",
        "PackagePayments": {
          "totalAmount": 700,
          "shippingCost": 700,
          "storageFee": 0,
          "customsDuty": 0,
          "paymentStatus": "pending",
          "paidAmount": 0,
          "balanceAmount": 700
        }
      }
    ],
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 15,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 2. Add Package ✅ UPDATED - WORKING
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/addpackage/subdir`

**Headers:**
```
Content-Type: application/json
x-warehouse-key: wh_test_abc123
```

**Request Body (JSON):**
```json
[
  {
    "PackageID": "pkg-83383d43-a368-4fc1-a216-9e54e8ae7227",
    "TrackingNumber": "TEST-1769173301211",
    "UserCode": "C176824610743581L",
    "Weight": 65,
    "Shipper": "Shein",
    "Description": "Updated via API test",
    "PackageStatus": 0
  }
]
```

**Response Format (Complete Package Info):**
```json
{
  "status": "success",
  "code": 200,
  "message": "1 packages added successfully",
  "data": {
    "processed": 1,
    "successful": 1,
    "failed": 0,
    "results": [
      {
        "PackageID": "6973d2d91d88d945abaec8bc",
        "TrackingNumber": "TEST-1769173301211",
        "FirstName": "Muhammad",
        "LastName": "Attique",
        "UserCode": "C176824610743581L",
        "Weight": 65,
        "Shipper": "Shein",
        "Description": "Updated via API test",
        "EntryDate": "2026-01-23T19:58:15.220Z",
        "EntryDateTime": "2026-01-23T19:58:15.220Z",
        "Branch": "",
        "PackageStatus": "received",
        "PackagePayments": {
          "totalAmount": 50750,
          "shippingCost": 50750,
          "storageFee": 0,
          "customsDuty": 0,
          "paymentStatus": "pending",
          "paidAmount": 0,
          "balanceAmount": 50750
        },
        "customer": {
          "_id": "69654b5c2812f642f375e07c",
          "userCode": "C176824610743581L",
          "firstName": "Muhammad",
          "lastName": "Attique",
          "email": "attiqueshafeeq246@gmail.com"
        },
        "daysInStorage": 0,
        "weightLbs": 143.3003,
        "createdAt": "2026-01-23T19:58:15.221Z",
        "updatedAt": "2026-01-23T19:58:15.221Z",
        "ok": true
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-23T19:58:17.031Z",
    "api_version": "v1"
  }
}
```

**Key Features:**
- ✅ **Database Storage**: Package is properly stored in MongoDB
- ✅ **Customer Validation**: Validates customer exists with provided UserCode
- ✅ **Complete Response**: Returns full package information with customer details
- ✅ **Payment Calculations**: Automatically calculates shipping costs based on weight
- ✅ **Status Mapping**: Maps PackageStatus codes to readable strings (0→'received', 1→'in_transit', etc.)
- ✅ **Transaction Safety**: Uses MongoDB transactions for data integrity

---

### 3. Edit Package ✅ UPDATED
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/editpackage/subdir`

**Headers:**
```
Content-Type: application/json
x-warehouse-key: wh_test_abc123
```

**Request Body (JSON):**
```json
[
  {
    "TrackingNumber": "TEST-1769173301211",
    "UserCode": "EPXUUYE",
    "Weight": 2.5,
    "Description": "Updated description",
    "PackageStatus": 1,
    "Branch": "Kingston"
  }
]
```

---

### 4. Delete Package ✅ UPDATED
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/deletepackage/subdir`

**Headers:**
```
Content-Type: application/json
x-warehouse-key: wh_test_abc123
```

**Request Body (JSON):**
```json
[
  {
    "TrackingNumber": "TEST-1769173301211",
    "PackageID": "pkg-83383d43-a368-4fc1-a216-9e54e8ae7227",
    "UserCode": "EPXUUYE"
  }
]
```

---

### 5. Add Package (Alternative) ✅ UPDATED
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/packages/add`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer [warehouse-auth-token]
```

**Request Body (JSON):**
```json
{
  "trackingNumber": "TEST-123456789",
  "userCode": "EPXUUYE",
  "weight": 2.5,
  "shipper": "Amazon",
  "description": "Electronics package",
  "itemDescription": "Laptop and accessories",
  "entryDate": "2024-09-02",
  "status": "received",
  "dimensions": {
    "length": "30",
    "width": "20",
    "height": "10",
    "unit": "cm"
  },
  "recipient": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "country": "USA"
  },
  "sender": {
    "name": "Amazon Warehouse",
    "email": "shipping@amazon.com",
    "phone": "+1987654321",
    "address": "456 Warehouse Ave",
    "country": "USA"
  },
  "contents": "Electronics",
  "value": 500,
  "specialInstructions": "Handle with care",
  "receivedBy": "Warehouse Staff",
  "warehouse": "Main Warehouse"
}
```

**Response Format:**
```json
{
  "tracking_number": "TEST-123456789",
  "customer_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "description": "Electronics package",
  "weight": 2.5,
  "status": "At Warehouse",
  "dimensions": {
    "length": "30",
    "width": "20",
    "height": "10",
    "unit": "cm"
  },
  "recipient": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "country": "USA"
  },
  "sender": {
    "name": "Amazon Warehouse",
    "email": "shipping@amazon.com",
    "phone": "+1987654321",
    "address": "456 Warehouse Ave",
    "country": "USA"
  },
  "contents": "Electronics",
  "value": 500,
  "specialInstructions": "Handle with care",
  "received_date": "2024-09-02T21:55:51.180Z",
  "received_by": "Warehouse Staff",
  "warehouse": "Main Warehouse",
  "billingInvoice": {
    "id": "inv_123456789",
    "invoiceNumber": "INV-TEST-123456789",
    "total": 1750
  },
  "inventoryTransactions": [
    {
      "_id": "txn_123456789"
    }
  ],
  "message": "Package, billing invoice, and inventory deduction completed successfully"
}
```

---

### 6. Delete Package (Alternative) ✅ UPDATED
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/packages/delete`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer [warehouse-auth-token]
```

**Request Body (JSON):**
```json
{
  "trackingNumber": "TEST-123456789"
}
```

**Response Format:**
```json
{
  "ok": true,
  "package": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "trackingNumber": "TEST-123456789",
    "userCode": "EPXUUYE",
    "weight": 2.5,
    "shipper": "Amazon",
    "description": "Electronics package",
    "status": "received",
    "createdAt": "2024-09-02T21:55:51.180Z",
    "updatedAt": "2024-09-02T21:55:51.180Z"
  }
}
```

---

### 7. Get Packages (Alternative) ✅ WORKING
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/getpackages/subdir?id=C176824610743581L`

**Query Parameters:**
- `id` (required): Customer UserCode (e.g., `C176824610743581L`)
- **Note**: This endpoint uses UserCode as the ID parameter, not the API key

**Headers:**
```
x-warehouse-key: wh_test_abc123
```

**Response Format (Complete Package List):**
```json
[
  {
    "PackageID": "pkg-6973d2d9-mkrazrqa",
    "CourierID": "cour-mkrazrqa-czmqbm",
    "TrackingNumber": "TEST-1769173301215",
    "FirstName": "Muhammad",
    "LastName": "Attique",
    "UserCode": "C176824610743581L",
    "Weight": 65,
    "Shipper": "Shein",
    "EntryDate": "2026-01-23",
    "EntryDateTime": "2026-01-23T19:58:15.221Z",
    "Branch": "",
    "Description": "Updated via API test",
    "PackageStatus": 0,
    "PackagePayments": {
      "totalAmount": 50750,
      "shippingCost": 50750,
      "storageFee": 0,
      "customsDuty": 0,
      "deliveryFee": 0,
      "additionalFees": 0,
      "amountPaid": 0,
      "outstandingBalance": 50750,
      "paymentStatus": "pending"
    },
    "createdAt": "2026-01-23T19:58:15.221Z",
    "updatedAt": "2026-01-23T19:58:15.221Z",
    "status": "received",
    "customerId": "69654b5c2812f642f375e07c",
    "customerEmail": "attiqueshafeeq246@gmail.com",
    "customerName": "Muhammad Attique"
  }
]
```

**Key Features:**
- ✅ **Database Fetch**: Retrieves packages directly from MongoDB
- ✅ **Customer Filter**: Returns packages for specific customer UserCode
- ✅ **Complete Data**: Includes all package fields with payment information
- ✅ **Real-time Data**: Shows current database state with latest updates

---

### 8. Get Package by ID
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/[id]?id=wh_test_abc123`

---

### 9. Link Package
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/packages/[id]/link`

---

### 10. Check Package Exists
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/exist?trackingNumber=TRACKING&id=wh_test_abc123`

---

### 11. Search Packages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/search?q=SEARCH_TERM&id=wh_test_abc123`

---

### 12. Get Package Stats
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/stats?id=wh_test_abc123`

---

### 13. Get Unknown Packages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/unknown?id=wh_test_abc123`

---

### 14. Count Unknown Packages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/packages/unknown/count?id=wh_test_abc123`

---

### 15. Update Package Status
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/packages/update-status`

**Request Body (JSON):**
```json
{
  "trackingNumber": "TEST-123456789",
  "status": "in_transit",
  "note": "Package shipped to customer"
}
```

---

### 16. Bulk Upload Packages
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/packages/bulk-upload`

**Request Body (JSON):**
```json
{
  "packages": [
    {
      "trackingNumber": "BULK-001",
      "userCode": "EPXUUYE",
      "weight": 1.5,
      "shipper": "FedEx",
      "description": "Bulk package 1"
    },
    {
      "trackingNumber": "BULK-002",
      "userCode": "EPXUUYE",
      "weight": 2.0,
      "shipper": "UPS",
      "description": "Bulk package 2"
    }
  ]
}
```

---

## 👥 Customer Endpoints

### 17. Pull Customer ✅ WORKING
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/pullcustomer/subdir?id=wh_test_abc123`

**Headers:**
```
x-warehouse-key: wh_test_abc123
```

**Response Format:**
```json
[
  {
    "UserCode": "C176824610743581L",
    "FirstName": "Muhammad",
    "LastName": "Attique",
    "Email": "attiqueshafeeq246@gmail.com",
    "Phone": "",
    "Address": {
      "street": "",
      "city": "",
      "country": "Jamaica"
    },
    "AccountStatus": "active",
    "EmailVerified": true,
    "CreatedAt": "2026-01-23T19:43:03.939Z",
    "LastLogin": null,
    "RegistrationStep": 3,
    "Branch": "",
    "CustomerServiceTypeID": "standard",
    "CustomerLevelInstructions": "",
    "CourierServiceTypeID": "express",
    "CourierLevelInstructions": ""
  }
]
```

**Key Features:**
- ✅ **Database Integration**: Fetches customer data directly from MongoDB
- ✅ **Real Customer Data**: Shows actual customer with UserCode C176824610743581L
- ✅ **Complete Profile**: Includes all customer fields and account status

---

### 18. Get Customers
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/customers?id=wh_test_abc123`

---

## 📦 Inventory Endpoints

### 19. Get Inventory ✅
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/inventory?id=wh_test_abc123&limit=100`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `limit`: Number of items (default: 100, max: 1000)
- `skip`: Number of items to skip (default: 0)
- `location`: Filter by location (optional)
- `category`: Filter by category (optional)
- `lowStock`: Set to 'true' to get only low stock items (optional)

**Response Format:**
```json
{
  "items": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Packaging Box",
      "category": "Packaging",
      "currentStock": 100,
      "minStock": 10,
      "maxStock": 1000,
      "unit": "pieces",
      "location": "Warehouse 1",
      "supplier": "Box Company",
      "notes": "Standard shipping box",
      "stockStatus": "in_stock",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-09-02T21:55:51.180Z"
    }
  ],
  "total": 1
}
```

---

### 20. Create Inventory Item ✅
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/inventory`

**Headers:**
```
Content-Type: application/json
x-warehouse-key: wh_test_abc123
```

**Request Body (JSON):**
```json
{
  "name": "Packaging Box",
  "category": "Packaging",
  "currentStock": 100,
  "location": "Warehouse 1",
  "description": "Standard shipping box"
}
```

---

### 21. Get Inventory Item by ID
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/inventory/[id]?id=wh_test_abc123`

---

## 📋 Manifest Endpoints

### 22. Get Manifests ✅
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/manifests?id=wh_test_abc123&limit=50`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `limit`: Number of manifests (default: 100)
- `skip`: Number of manifests to skip (default: 0)

**Response Format:**
```json
{
  "manifests": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "manifestNumber": "MAN-2024-001",
      "status": "active",
      "packages": ["TRACKING-001", "TRACKING-002"],
      "createdAt": "2024-09-02T21:55:51.180Z",
      "updatedAt": "2024-09-02T21:55:51.180Z"
    }
  ]
}
```

---

### 23. Update Manifest
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/manifests/update`

**Request Body (JSON):**
```json
{
  "manifestId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "status": "completed",
  "notes": "Manifest completed successfully"
}
```

---

### 24. Update Manifest (Alternative)
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/updatemanifest/subdir`

**Request Body (JSON):**
```json
{
  "ManifestID": "MAN-2024-001",
  "Status": "completed",
  "Notes": "Manifest completed successfully"
}
```

---

## 🔧 Utility Endpoints

### 25. Test Connection ✅
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/test?id=wh_test_abc123`

**Response Format:**
```json
{
  "success": true,
  "message": "API key is valid",
  "keyInfo": {
    "keyPrefix": "wh_test_abc123",
    "name": "Test Warehouse Key",
    "permissions": ["packages:read", "packages:write", "inventory:read", "customers:read", "manifests:read"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "testEndpoints": [
    "GET /api/warehouse/test?id=wh_test_abc123 (this endpoint)",
    "GET /api/warehouse/pullcustomer/subdir?id=wh_test_abc123",
    "GET /api/warehouse/packages?id=wh_test_abc123",
    "GET /api/warehouse/inventory?id=wh_test_abc123"
  ]
}
```

---

### 26. Rate Calculator
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/rate-calculator?id=wh_test_abc123&weight=2.5&value=100`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `weight`: Package weight in kg (required)
- `value`: Package value in USD (required)

---

### 27. Search Packages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/search?id=wh_test_abc123&q=test&type=packages`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `q`: Search query (required)
- `type`: Search type - "packages" or "customers" (optional)

---

### 28. Get Reports
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/reports?id=wh_test_abc123&type=summary`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `type`: Report type - "summary", "detailed", "packages", "customers" (optional)

---

### 29. Scan Package
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/scan`

**Request Body (JSON):**
```json
{
  "trackingNumber": "TEST-123456789",
  "action": "receive",
  "location": "Main Warehouse",
  "scannedBy": "John Doe"
}
```

---

### 30. Get Analytics
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/analytics?id=wh_test_abc123&period=monthly`

---

### 31. Get Messages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/messages?id=wh_test_abc123`

---

## ⚙️ Settings Endpoints

### 32. Update Profile Settings
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/settings/profile`

**Request Body (JSON):**
```json
{
  "name": "Warehouse Manager",
  "email": "manager@warehouse.com",
  "phone": "+1234567890",
  "notifications": {
    "email": true,
    "sms": false
  }
}
```

---

### 33. Update Password
**Method**: `POST`  
**URL**: `http://localhost:3000/api/warehouse/settings/password`

**Request Body (JSON):**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}
```

---

### 34. Get Account Info
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/account?id=wh_test_abc123`

---

---

## 📊 Package Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | At Warehouse | Package received at warehouse |
| 1 | In Transit | Package in transit |
| 2 | At Local Port | Package at local port |
| 3 | Delivered | Package delivered |
| 4 | Unknown | Package not identified |

---

## 🧪 Quick Test Commands

### Test Basic Connection:
```bash
curl -X GET "http://localhost:3000/api/warehouse/test?id=wh_test_abc123"
```

### Test Get Packages:
```bash
curl -X GET "http://localhost:3000/api/warehouse/packages?id=wh_test_abc123&page=1&per_page=5"
```

### Test Add Package (Working Example):
```bash
curl -X POST "http://localhost:3000/api/warehouse/addpackage/subdir" \
  -H "Content-Type: application/json" \
  -H "x-warehouse-key: wh_test_abc123" \
  -d '[{
    "PackageID": "pkg-83383d43-a368-4fc1-a216-9e54e8ae7227",
    "TrackingNumber": "TEST-1769173301211",
    "UserCode": "C176824610743581L",
    "Weight": 65,
    "Shipper": "Shein",
    "Description": "Updated via API test",
    "PackageStatus": 0
  }]'
```

### Test Get Packages (Working Example):
```bash
curl -X GET "http://localhost:3000/api/warehouse/getpackages/subdir?id=C176824610743581L" \
  -H "x-warehouse-key: wh_test_abc123"
```

### Test Create Inventory:
```bash
curl -X POST "http://localhost:3000/api/warehouse/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [warehouse-auth-token]" \
  -d '{
    "name": "Test Item",
    "category": "Test",
    "currentStock": 50
  }'
```

---

## 📝 Error Response Format

All endpoints now return consistent error responses:

```json
{
  "status": "error",
  "code": 401,
  "message": "API key required in headers (x-warehouse-key or x-api-key) or query parameter (id)",
  "meta": {
    "timestamp": "2024-09-02T21:55:51.180Z",
    "api_version": "v1"
  }
}
```

---

## 🔍 Key Features

1. **✅ Consistent Authentication**: All endpoints use API key authentication
2. **✅ Rate Limiting**: 200 requests per minute per API key
3. **✅ Standardized Responses**: Consistent JSON response format
4. **✅ Input Validation**: POST endpoints validate request bodies
5. **✅ Better Error Handling**: Consistent error messages and codes
6. **✅ CORS Support**: Proper OPTIONS handlers for all POST endpoints
7. **✅ Package Management**: Full CRUD operations for packages
8. **✅ Inventory Tracking**: Complete inventory management system
9. **✅ Customer Management**: Customer data retrieval and management
10. **✅ Manifest Tracking**: Manifest creation and updates
11. **✅ Analytics**: Reporting and analytics endpoints
12. **✅ Settings**: User profile and password management

---

## 🎯 Testing Priority

1. **High Priority** (Core Features):
   - ✅ Test Connection
   - ✅ Get Packages
   - ✅ Add Package (Warehouse Auth)
   - ✅ Edit Package
   - ✅ Delete Package (Warehouse Auth)
   - ✅ Get Inventory
   - ✅ Create Inventory Item
   - ✅ Pull Customer

2. **Medium Priority** (Additional Features):
   - ✅ Get Manifests
   - ✅ Update Manifest
   - Rate Calculator
   - Search Packages
   - Get Reports
   - Package Stats

3. **Low Priority** (Advanced Features):
   - Analytics
   - Messages
   - Settings
   - Account Management
   - Bulk Operations

---

**🚀 All 34 warehouse endpoints are documented and ready for testing!**
