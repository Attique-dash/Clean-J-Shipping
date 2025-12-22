# Warehouse API Documentation

This document provides detailed API endpoint documentation for the Clean J Shipping warehouse portal, specifically for warehouse team integration and testing.

## Base URL
```
http://localhost:3000/api/warehouse
```

## Authentication

### Web Portal Authentication
- Uses NextAuth.js session-based authentication
- Warehouse users must login through `/warehouse/login`

### API Authentication
- API Key authentication for external systems
- API keys must start with `wh_live_` (production) or `wh_test_` (testing)
- Include API key in query parameter: `?id=API_KEY`

---

## Customer Information APIs

### 1. Get Customer Search (Web Portal)
**Endpoint**: `GET /api/warehouse/customers`

**Authentication**: Warehouse session required

**Query Parameters**:
- `q` (optional): Search term - searches name, email, userCode, phone, address

**Response**:
```json
{
  "customers": [
    {
      "user_code": "CUST001",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address_line": "123 Main St, Kingston, Jamaica",
      "active_packages": 3
    }
  ],
  "total_count": 1
}
```

### 2. Pull Customer Data (External Systems)
**Endpoint**: `GET /api/warehouse/pullcustomer/subdir`

**Authentication**: API Key required in query parameter

**Query Parameters**:
- `id` (required): API key (`wh_live_XXXXXXXX` or `wh_test_XXXXXXXX`)

**Rate Limiting**: 200 requests per minute per API key

**Response**:
```json
[
  {
    "UserCode": "CUST001",
    "FirstName": "John",
    "LastName": "Doe",
    "Branch": "Kingston",
    "CustomerServiceTypeID": "",
    "CustomerLevelInstructions": "",
    "CourierServiceTypeID": "",
    "CourierLevelInstructions": ""
  }
]
```

**Headers**:
- `X-RateLimit-Limit`: 200
- `X-RateLimit-Remaining`: Number of requests left
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Package Management APIs

### 1. Get Packages
**Endpoint**: `GET /api/warehouse/packages`

**Authentication**: Warehouse session required

**Query Parameters**:
- `status` (optional): Filter by package status
- `search` (optional): Search term for tracking number, recipient name, sender name
- `limit` (optional): Number of results (default: 50)
- `page` (optional): Page number (default: 1)

**Response**:
```json
{
  "packages": [
    {
      "_id": "package_id",
      "trackingNumber": "241221-123456",
      "status": "At Warehouse",
      "weight": 2.5,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 5
      },
      "recipient": {
        "name": "John Doe",
        "email": "john@example.com",
        "shippingId": "CUST001"
      },
      "sender": {
        "name": "Amazon",
        "address": "123 Commerce St"
      },
      "receivedAt": "2024-12-21T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 2. Create Package
**Endpoint**: `POST /api/warehouse/packages`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "trackingNumber": "241221-123456",
  "weight": 2.5,
  "dimensions": {
    "length": 10,
    "width": 8,
    "height": 5
  },
  "recipient": {
    "shippingId": "CUST001",
    "name": "John Doe"
  },
  "sender": {
    "name": "Amazon",
    "address": "123 Commerce St, Seattle, WA"
  },
  "contents": "Electronics",
  "declaredValue": 150.00,
  "receivedAt": "2024-12-21T10:30:00.000Z"
}
```

**Response**: Created package object (201 status)

### 3. Update Package
**Endpoint**: `PUT /api/warehouse/packages/[id]`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "status": "In Transit",
  "location": "Jamaica Post Office",
  "notes": "Package forwarded to local port",
  "weight": 2.6,
  "dimensions": {
    "length": 10,
    "width": 8,
    "height": 5
  }
}
```

### 4. Delete Package
**Endpoint**: `DELETE /api/warehouse/packages/[id]`

**Authentication**: Warehouse session required

**Response**: Success confirmation (200 status)

---

## Package Search API

### Advanced Package Search
**Endpoint**: `GET /api/warehouse/search`

**Authentication**: Warehouse session required

**Query Parameters**:
- `trackingNumber`: Search by tracking number
- `recipientName`: Search by recipient name
- `senderName`: Search by sender name
- `status`: Filter by status
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)
- `weightMin`: Minimum weight
- `weightMax`: Maximum weight
- `customerCode`: Filter by customer code

**Response**: Array of matching packages

---

## Scanning APIs

### 1. Scan Package
**Endpoint**: `POST /api/warehouse/scan`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "trackingNumber": "241221-123456",
  "action": "update_status",
  "newStatus": "In Transit",
  "location": "Scanning Station 1",
  "notes": "Processed through automated scanner"
}
```

### 2. Batch Scan
**Endpoint**: `POST /api/warehouse/scan/batch`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "packages": [
    {
      "trackingNumber": "241221-123456",
      "status": "In Transit"
    },
    {
      "trackingNumber": "241221-123457",
      "status": "At Local Port"
    }
  ],
  "location": "Bulk Scanning Station",
  "notes": "Batch processing"
}
```

---

## Bulk Upload API

### Upload Packages
**Endpoint**: `POST /api/warehouse/bulk-upload`

**Authentication**: Warehouse session required

**Request**: Multipart form data
- `file`: CSV file with package data
- `format`: File format ("csv" or "excel")

**CSV Format**:
```csv
trackingNumber,weight,length,width,height,recipientShippingId,recipientName,senderName,contents
241221-123456,2.5,10,8,5,CUST001,John Doe,Amazon,Electronics
241221-123457,1.8,8,6,4,CUST002,Jane Smith,eBay,Clothing
```

**Response**:
```json
{
  "success": true,
  "processed": 150,
  "created": 145,
  "errors": 5,
  "errorDetails": [
    {
      "row": 15,
      "error": "Invalid shipping ID: CUST999"
    }
  ]
}
```

---

## Manifest APIs

### 1. Get Manifests
**Endpoint**: `GET /api/warehouse/manifests`

**Authentication**: Warehouse session required

**Query Parameters**:
- `status` (optional): Filter by manifest status
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

**Response**:
```json
{
  "manifests": [
    {
      "_id": "manifest_id",
      "manifestNumber": "MAN-2024-12-001",
      "status": "Open",
      "packages": ["package_id_1", "package_id_2"],
      "createdAt": "2024-12-21T08:00:00.000Z",
      "createdBy": "warehouse_user",
      "totalPackages": 25,
      "totalWeight": 45.6
    }
  ]
}
```

### 2. Create Manifest
**Endpoint**: `POST /api/warehouse/manifests`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "packages": ["package_id_1", "package_id_2", "package_id_3"],
  "notes": "Manifest for Kingston delivery route",
  "destination": "Kingston Hub"
}
```

### 3. Update Manifest
**Endpoint**: `PUT /api/warehouse/updatemanifest`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "manifestId": "manifest_id",
  "status": "Closed",
  "notes": "Manifest closed and ready for shipment"
}
```

---

## Inventory APIs

### 1. Get Inventory
**Endpoint**: `GET /api/warehouse/inventory`

**Authentication**: Warehouse session required

**Response**:
```json
{
  "inventory": [
    {
      "_id": "item_id",
      "itemName": "Small Box",
      "category": "Packaging Materials",
      "quantity": 150,
      "minStockLevel": 50,
      "unit": "pieces",
      "location": "Storage Area A",
      "lastUpdated": "2024-12-21T09:15:00.000Z"
    }
  ]
}
```

### 2. Update Inventory
**Endpoint**: `POST /api/warehouse/inventory`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "itemId": "item_id",
  "quantity": 145,
  "adjustmentType": "usage",
  "notes": "Used 5 boxes for package packing"
}
```

---

## Analytics API

### Get Warehouse Analytics
**Endpoint**: `GET /api/warehouse/analytics`

**Authentication**: Warehouse session required

**Response**:
```json
{
  "statusCounts": {
    "At Warehouse": 125,
    "In Transit": 45,
    "At Local Port": 23,
    "Delivered": 567
  },
  "today": {
    "packages": 15,
    "weight": 28.5
  },
  "weeklyTrend": [
    {
      "_id": "2024-12-15",
      "count": 12
    }
  ],
  "monthly": {
    "total": 760,
    "delivered": 567,
    "inTransit": 45
  },
  "topCustomers": [
    {
      "_id": "CUST001",
      "packageCount": 25,
      "totalWeight": 45.6
    }
  ],
  "totalCustomers": 145,
  "readyToShip": 23,
  "avgProcessingTime": 2.4
}
```

---

## Unknown Packages API

### Get Unknown Packages Count
**Endpoint**: `GET /api/warehouse/packages/unknown/count`

**Authentication**: Warehouse session required

**Response**:
```json
{
  "count": 3
}
```

### Get Unknown Packages
**Endpoint**: `GET /api/warehouse/packages/unknown`

**Authentication**: Warehouse session required

**Response**:
```json
{
  "packages": [
    {
      "_id": "package_id",
      "trackingNumber": "241221-999999",
      "status": "unknown",
      "recipient": {
        "name": "Unknown Recipient",
        "shippingId": null
      },
      "receivedAt": "2024-12-21T11:30:00.000Z"
    }
  ]
}
```

---

## Rate Calculator API

### Calculate Shipping Rates
**Endpoint**: `POST /api/warehouse/rate-calculator`

**Authentication**: Warehouse session required

**Request Body**:
```json
{
  "weight": 2.5,
  "dimensions": {
    "length": 10,
    "width": 8,
    "height": 5
  },
  "destination": "Kingston",
  "serviceType": "express",
  "customerCode": "CUST001"
}
```

**Response**:
```json
{
  "baseRate": 15.00,
  "weightCharge": 5.00,
  "dimensionCharge": 2.00,
  "serviceCharge": 3.00,
  "totalRate": 25.00,
  "currency": "JMD",
  "estimatedDelivery": "2024-12-23"
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

---

## Testing Examples

### Using curl for API Testing

```bash
# Test customer data pull
curl "http://localhost:3000/api/warehouse/pullcustomer/subdir?id=wh_test_1234567890"

# Create a new package
curl -X POST "http://localhost:3000/api/warehouse/packages" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "trackingNumber": "241221-123456",
    "weight": 2.5,
    "recipient": {"shippingId": "CUST001"},
    "sender": {"name": "Test Sender"}
  }'

# Update package status
curl -X PUT "http://localhost:3000/api/warehouse/packages/PACKAGE_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"status": "In Transit"}'
```

---

## Integration Notes

1. **Session Management**: Web portal APIs require active NextAuth session
2. **API Keys**: External systems must use API key authentication
3. **Rate Limiting**: Customer pull API limited to 200 requests/minute
4. **Data Validation**: All endpoints validate input data
5. **Error Handling**: Consistent error response format across all endpoints

---

## Support

For API integration issues:
1. Check authentication credentials
2. Verify request format and required fields
3. Monitor rate limiting headers
4. Review error responses for specific issues
5. Contact development team with endpoint details and error messages
