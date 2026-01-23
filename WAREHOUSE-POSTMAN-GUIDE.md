# Warehouse API Postman Collection Guide

## 🔐 Authentication Setup

All warehouse endpoints require API key authentication using the test key:
- **API Key**: `wh_test_abc123`
- **Methods**: 
  - Query parameter: `?id=wh_test_abc123`
  - Header: `x-warehouse-key: wh_test_abc123`

---

## 📦 Package Management Endpoints

### 1. Get All Packages
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

---

### 2. Get Packages (Alternative)
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/getpackages/subdir?id=wh_test_abc123&page=1&limit=20`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `status`: Filter by status
- `userCode`: Filter by customer code
- `trackingNumber`: Filter by tracking number

**Headers:**
```
Content-Type: application/json
```

---

### 3. Add Package
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
    "CourierID": "cour-15fff123-f237-4571-b92a-ae69427d7a56",
    "TrackingNumber": "DROPOFF-20240902-225642-547",
    "ControlNumber": "EP0096513",
    "FirstName": "Courtney",
    "LastName": "Patterson",
    "UserCode": "EPXUUYE",
    "Weight": 1,
    "Shipper": "Amazon",
    "EntryDate": "2024-09-02",
    "EntryDateTime": "2024-09-02T21:55:51.1806146-05:00",
    "Branch": "Down Town",
    "Description": "Merchandise from Amazon",
    "Length": 10,
    "Width": 8,
    "Height": 6,
    "Pieces": 1,
    "PackageStatus": 0
  }
]
```

---

### 4. Edit Package
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
    "TrackingNumber": "DROPOFF-20240902-225642-547",
    "UserCode": "EPXUUYE",
    "Weight": 2.5,
    "Description": "Updated description",
    "PackageStatus": 1,
    "Branch": "Kingston"
  }
]
```

---

### 5. Delete Package
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
    "TrackingNumber": "DROPOFF-20240902-225642-547",
    "PackageID": "pkg-83383d43-a368-4fc1-a216-9e54e8ae7227",
    "UserCode": "EPXUUYE"
  }
]
```

---

## 👥 Customer Endpoints

### 6. Pull Customer
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/pullcustomer/subdir?id=wh_test_abc123`

**Headers:**
```
Content-Type: application/json
```

---

## 📦 Inventory Endpoints

### 7. Get Inventory
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/inventory?id=wh_test_abc123&limit=100`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `limit`: Number of items (default: 100)
- `location`: Filter by location
- `category`: Filter by category

**Headers:**
```
Content-Type: application/json
```

---

### 8. Create Inventory Item
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

## 📋 Manifest Endpoints

### 9. Get Manifests
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/manifests?id=wh_test_abc123&limit=50`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `limit`: Number of manifests (default: 50)

**Headers:**
```
Content-Type: application/json
```

---

## 🔧 Utility Endpoints

### 10. Test Connection
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/test?id=wh_test_abc123`

**Headers:**
```
Content-Type: application/json
```

---

### 11. Rate Calculator
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/rate-calculator?id=wh_test_abc123&weight=2.5&value=100`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `weight`: Package weight in kg
- `value`: Package value in USD

**Headers:**
```
Content-Type: application/json
```

---

### 12. Search Packages
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/search?id=wh_test_abc123&q=test&type=packages`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `q`: Search term
- `type`: Search type (packages, customers, all)

**Headers:**
```
Content-Type: application/json
```

---

### 13. Get Reports
**Method**: `GET`  
**URL**: `http://localhost:3000/api/warehouse/reports?id=wh_test_abc123&type=summary`

**Query Parameters:**
- `id` (required): `wh_test_abc123`
- `type`: Report type (summary, daily, customer, shipper, export)
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)

**Headers:**
```
Content-Type: application/json
```

---

## 📊 Package Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | Unknown | Package not identified |
| 1 | At Warehouse | Package received at warehouse |
| 2 | In Transit | Package in transit |
| 3 | Delivered | Package delivered |
| 4 | Returned | Package returned |

---

## 🎯 Quick Test Examples

### Test Basic Connection:
```bash
curl -X GET "http://localhost:3000/api/warehouse/test?id=wh_test_abc123"
```

### Test Get Packages:
```bash
curl -X GET "http://localhost:3000/api/warehouse/packages?id=wh_test_abc123&page=1&per_page=5"
```

### Test Add Package:
```bash
curl -X POST "http://localhost:3000/api/warehouse/addpackage/subdir" \
  -H "Content-Type: application/json" \
  -H "x-warehouse-key: wh_test_abc123" \
  -d '[{"TrackingNumber": "TEST123", "UserCode": "CUS001", "Weight": 1, "Shipper": "Test"}]'
```

---

## 📝 Notes

1. **Base URL**: `http://localhost:3000` (for local development)
2. **Authentication**: Use `wh_test_abc123` for testing
3. **Content-Type**: Always use `application/json` for POST requests
4. **Rate Limiting**: 200 requests per minute per API key
5. **CORS**: All endpoints support cross-origin requests

---

## 🔍 Response Format Examples

### Success Response (Get Packages):
```json
[
  {
    "PackageID": "pkg-69656795-a368-4fc1-a216-9e54e8ae7227",
    "TrackingNumber": "DROPOFF-20240902-225642-547",
    "FirstName": "Courtney",
    "LastName": "Patterson",
    "UserCode": "EPXUUYE",
    "Weight": 1,
    "Shipper": "Amazon",
    "PackageStatus": 0,
    "PackagePayments": {
      "totalAmount": 700,
      "shippingCost": 700,
      "paymentStatus": "pending"
    }
  }
]
```

### Success Response (Add Package):
```json
{
  "success": true,
  "processed": 1,
  "results": [
    {
      "package_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "trackingNumber": "TEST123",
      "ok": true
    }
  ],
  "message": "Warehouse packages processed successfully"
}
```

### Error Response:
```json
{
  "error": "Unauthorized",
  "message": "API key required"
}
```

---

**🚀 Ready for Postman Testing!**

Import these endpoints into Postman and start testing your warehouse API functionality.
