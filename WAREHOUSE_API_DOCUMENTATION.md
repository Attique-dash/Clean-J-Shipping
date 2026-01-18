# Warehouse API Integration Documentation

## Client Request Summary

**What the client wants:**
- Information to share with warehouse for system integration
- API endpoints to test customer information retrieval
- Clarification on whether to add warehouse members or use API links

**Current Status:**
- Project is deployed and ready for testing
- Warehouse portal is functional at `/warehouse/packages` and `/warehouse/customers`
- API endpoints are available for external system integration

---

## What You Can Do

### Option 1: Web Portal Access
- Add warehouse members through Admin portal
- They can log in and use the warehouse portal directly
- Access to: Packages, Customers, Inventory, Analytics

### Option 2: API Integration
- Share API endpoints for system-to-system integration
- Warehouse can pull customer and package data into their own software
- Requires API key authentication

### Option 3: Both
- Use web portal for daily operations
- Use APIs for automated integration with their existing systems

---

## API Endpoints for Warehouse Integration

### Base URL
```
https://your-domain.vercel.app/api/warehouse
```

### Authentication Methods
1. **Header-based (Recommended):**
   - Header: `x-warehouse-key` or `x-api-key`
   - Value: Your API key from `WAREHOUSE_API_KEYS` environment variable

2. **Body-based (Legacy):**
   - Include `APIToken` field in request body

---

## 1. Pull Customers (GET)

**Endpoint:** `/api/warehouse/pullcustomer/subdir`

**Method:** `GET`

**Authentication:** API Token in query parameter

**URL Example:**
```
GET /api/warehouse/pullcustomer/subdir?id=wh_live_YOUR_API_TOKEN
```

**Postman Setup:**
- Method: `GET`
- URL: `{{baseUrl}}/api/warehouse/pullcustomer/subdir?id=wh_live_YOUR_API_TOKEN`
- Headers: None required (token in URL)

**Response:**
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

**Rate Limit:** 200 requests/minute

---

## 2. Add Package (POST)

**Endpoint:** `/api/warehouse/addpackage/subdir`

**Method:** `POST`

**Authentication:** Header `x-warehouse-key` or `x-api-key`

**Postman Setup:**
- Method: `POST`
- URL: `{{baseUrl}}/api/warehouse/addpackage/subdir`
- Headers:
  ```
  x-warehouse-key: YOUR_API_KEY
  Content-Type: application/json
  ```
- Body (raw JSON):
```json
[
  {
    "TrackingNumber": "TRACK123456",
    "UserCode": "CUST001",
    "Weight": 2.5,
    "Shipper": "Amazon",
    "Description": "Electronics",
    "ServiceTypeID": "standard",
    "EntryDateTime": "2024-01-15T10:00:00Z",
    "ControlNumber": "CN123",
    "Branch": "Kingston",
    "FirstName": "John",
    "LastName": "Doe",
    "Cubes": 0.5,
    "Length": 10,
    "Width": 8,
    "Height": 6,
    "Pieces": 1
  }
]
```

**Response:**
```json
{
  "ok": true,
  "processed": 1,
  "results": [
    {
      "trackingNumber": "TRACK123456",
      "ok": true
    }
  ]
}
```

**Rate Limit:** 100 requests/minute

---

## 3. Edit Package (POST)

**Endpoint:** `/api/warehouse/editpackage/subdir`

**Method:** `POST`

**Authentication:** Header `x-warehouse-key` or `x-api-key` (or `APIToken` in body)

**Postman Setup:**
- Method: `POST`
- URL: `{{baseUrl}}/api/warehouse/editpackage/subdir`
- Headers:
  ```
  x-warehouse-key: YOUR_API_KEY
  Content-Type: application/json
  ```
- Body (raw JSON):
```json
[
  {
    "TrackingNumber": "TRACK123456",
    "UserCode": "CUST001",
    "Weight": 3.0,
    "Shipper": "Amazon",
    "Description": "Updated description",
    "PackageStatus": "In Processing",
    "ManifestID": "MAN001",
    "EntryDateTime": "2024-01-15T10:00:00Z",
    "Branch": "Kingston",
    "HSCode": "8517.12.00"
  }
]
```

**Response:**
```json
{
  "ok": true,
  "processed": 1,
  "results": [
    {
      "trackingNumber": "TRACK123456",
      "ok": true
    }
  ]
}
```

---

## 4. Delete Package (POST)

**Endpoint:** `/api/warehouse/deletepackage/subdir`

**Method:** `POST`

**Authentication:** Header `x-warehouse-key` or `x-api-key` (or `APIToken` in body)

**Postman Setup:**
- Method: `POST`
- URL: `{{baseUrl}}/api/warehouse/deletepackage/subdir`
- Headers:
  ```
  x-warehouse-key: YOUR_API_KEY
  Content-Type: application/json
  ```
- Body (raw JSON) - Single object:
```json
{
  "TrackingNumber": "TRACK123456"
}
```

- Or array of objects:
```json
[
  {
    "TrackingNumber": "TRACK123456"
  },
  {
    "TrackingNumber": "TRACK789012"
  }
]
```

**Response:**
```json
{
  "ok": true,
  "processed": 2,
  "results": [
    {
      "trackingNumber": "TRACK123456",
      "ok": true
    },
    {
      "trackingNumber": "TRACK789012",
      "ok": true
    }
  ]
}
```

**Note:** This performs a soft delete (status → "Deleted")

---

## 5. Update Manifest (POST)

**Endpoint:** `/api/warehouse/updatemanifest/subdir`

**Method:** `POST`

**Authentication:** Header `x-warehouse-key` or `x-api-key` (or `APIToken` in body)

**Postman Setup:**
- Method: `POST`
- URL: `{{baseUrl}}/api/warehouse/updatemanifest/subdir`
- Headers:
  ```
  x-warehouse-key: YOUR_API_KEY
  Content-Type: application/json
  ```
- Body (raw JSON):
```json
{
  "Manifest": {
    "ManifestID": "MAN001",
    "CourierID": "COURIER01",
    "ServiceTypeID": "standard",
    "ManifestStatus": "Active",
    "ManifestCode": "MC001",
    "FlightDate": "2024-01-20T10:00:00Z",
    "Weight": 150.5,
    "ItemCount": 25,
    "ManifestNumber": 1,
    "StaffName": "John Smith",
    "EntryDate": "2024-01-15T10:00:00Z",
    "AWBNumber": "AWB123456"
  },
  "CollectionCodes": ["CN123", "CN456"],
  "PackageAWBs": ["TRACK123456", "TRACK789012"]
}
```

**Response:**
```json
{
  "ok": true,
  "manifestId": "MAN001",
  "linkedByTracking": 2,
  "linkedByControl": 2
}
```

---

## Postman Collection Setup

### Environment Variables
Create a Postman environment with:
- `baseUrl`: `https://your-domain.vercel.app`
- `apiKey`: Your warehouse API key

### Test Scripts

**For Pull Customers:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});

pm.test("Customer has UserCode", function () {
    var jsonData = pm.response.json();
    if (jsonData.length > 0) {
        pm.expect(jsonData[0]).to.have.property('UserCode');
    }
});
```

**For Add Package:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Package added successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.ok).to.be.true;
    pm.expect(jsonData.results[0].ok).to.be.true;
});
```

---

## Sample Client Replies

### Reply 1: Initial API Information
```
Hi,

Here are the API endpoints for warehouse integration:

**For Customer Information:**
- Endpoint: GET /api/warehouse/pullcustomer/subdir?id=YOUR_API_TOKEN
- Returns: List of all customers with UserCode, names, and branch info

**For Package Management:**
- Add Package: POST /api/warehouse/addpackage/subdir
- Edit Package: POST /api/warehouse/editpackage/subdir
- Delete Package: POST /api/warehouse/deletepackage/subdir
- Update Manifest: POST /api/warehouse/updatemanifest/subdir

All endpoints require authentication via:
- Header: x-warehouse-key (recommended)
- Or: APIToken in request body

I've attached a Postman collection file with all endpoints configured for testing.

Let me know if you need the API key or have questions about integration.
```

### Reply 2: Testing Instructions
```
Hi,

To test the API endpoints:

1. **Get API Key:**
   - I'll provide the API key separately (for security)
   - Or you can use the warehouse portal login credentials

2. **Test Customer Pull:**
   - Use Postman: GET request to /api/warehouse/pullcustomer/subdir?id=YOUR_API_TOKEN
   - Should return array of customer objects

3. **Test Package Operations:**
   - Use the Postman collection I shared
   - Set the x-warehouse-key header with your API key
   - Try adding a test package first

All endpoints are live and ready for testing. Let me know the results.
```

### Reply 3: Integration Options
```
Hi,

You have two options for warehouse integration:

**Option 1: Web Portal (Easier)**
- Add warehouse members through Admin portal
- They log in and use the interface directly
- No API integration needed

**Option 2: API Integration (For Automation)**
- Share API endpoints with warehouse
- They connect their system to pull/push data
- Requires API key setup

**Option 3: Both**
- Use portal for daily operations
- Use APIs for automated sync with their system

Which approach works better for your warehouse? I can set up either option.
```

---

## Environment Setup

### Required Environment Variable
```bash
WAREHOUSE_API_KEYS=your_key_1,your_key_2,your_key_3
```

### API Key Format
- Format: `wh_live_` followed by base64url encoded random bytes
- Example: `wh_live_AbCdEf123456...`
- Can be generated through Admin portal or manually

---

## Rate Limits

- **Pull Customers:** 200 requests/minute
- **Add Package:** 100 requests/minute
- **Edit Package:** No specific limit (uses general rate limiting)
- **Delete Package:** No specific limit
- **Update Manifest:** No specific limit

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
**Solution:** Check API key in header or body

### 400 Bad Request
```json
{
  "error": "Invalid JSON"
}
```
**Solution:** Check request body format

### 429 Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "resetAt": "2024-01-15T10:01:00Z"
}
```
**Solution:** Wait before retrying

---

## Support

For API issues or questions:
- Check the warehouse integrations page: `/warehouse/integrations`
- Review API documentation in the codebase
- Contact system administrator for API key generation
