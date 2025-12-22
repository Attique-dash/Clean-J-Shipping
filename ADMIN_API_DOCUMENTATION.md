# Admin API Documentation

This document provides detailed API endpoint documentation for the Clean J Shipping admin portal, specifically for admin testing and integration.

## Base URL
```
http://localhost:3000/api/admin
```

## Authentication

### Admin Authentication
- Uses NextAuth.js session-based authentication
- Admins must login through `/auth/signin`
- Session token required for all API calls
- Role-based access control (admin, warehouse_staff, customer_support roles)

### Session Headers
```
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
Authorization: Bearer JWT_TOKEN (alternative)
```

### Required Roles
- `admin`: Full system access
- `warehouse_staff`: Package and warehouse operations
- `customer_support`: Customer management and support

---

## Dashboard APIs

### 1. Get Dashboard Statistics
**Endpoint**: `GET /api/admin/dashboard/stats`

**Authentication**: Admin session required (admin, warehouse_staff, customer_support)

**Response**:
```json
{
  "overview": {
    "totalRevenue": 150000.00,
    "revenueGrowth": 12.5,
    "totalPackages": 1250,
    "packagesGrowth": 8.3,
    "totalCustomers": 850,
    "customersGrowth": 15.2,
    "averageValue": 120.00,
    "valueGrowth": 5.1
  },
  "packagesByStatus": [
    {
      "status": "delivered",
      "count": 850,
      "percentage": "68.0%"
    },
    {
      "status": "in_transit",
      "count": 200,
      "percentage": "16.0%"
    },
    {
      "status": "pending",
      "count": 150,
      "percentage": "12.0%"
    },
    {
      "status": "ready_for_pickup",
      "count": 50,
      "percentage": "4.0%"
    }
  ],
  "revenueByMonth": [
    {
      "month": "2024-12",
      "revenue": 25000.00,
      "packages": 180
    },
    {
      "month": "2024-11",
      "revenue": 22000.00,
      "packages": 165
    }
  ],
  "topCustomers": [
    {
      "id": "customer_id",
      "name": "John Doe",
      "packages": 25,
      "revenue": 3000.00
    },
    {
      "id": "customer_id2",
      "name": "Jane Smith",
      "packages": 20,
      "revenue": 2500.00
    }
  ],
  "packagesByBranch": [
    {
      "branch": "Kingston",
      "count": 750
    },
    {
      "branch": "Montego Bay",
      "count": 500
    }
  ],
  "recentActivity": [
    {
      "title": "New Package",
      "description": "Package #241221-123456 created for John Doe",
      "timestamp": "2024-12-21T10:30:00.000Z",
      "icon": "Package"
    },
    {
      "title": "Payment Received",
      "description": "$150.00 from Jane Smith",
      "timestamp": "2024-12-21T09:15:00.000Z",
      "icon": "CreditCard"
    }
  ]
}
```

---

## Package Management APIs

### 1. Get Packages
**Endpoint**: `GET /api/admin/packages`

**Authentication**: Admin session required

**Query Parameters**:
- `q` (optional): Search term (tracking number, reference number)
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "packages": [
    {
      "id": "package_id",
      "tracking_number": "241221-123456",
      "customer_name": "John Doe",
      "customer_id": "customer_id",
      "status": "in_transit",
      "current_location": "Kingston Hub",
      "branch": "Kingston",
      "weight": 2.5,
      "dimensions": "30×20×10 cm",
      "description": "Electronics package",
      "received_date": "2024-12-21T10:30:00.000Z",
      "created_at": "2024-12-21T10:30:00.000Z",
      "updated_at": "2024-12-21T10:30:00.000Z"
    }
  ],
  "total_count": 1250,
  "status_counts": {
    "delivered": 850,
    "in_transit": 200,
    "pending": 150,
    "ready_for_pickup": 50
  },
  "page": 1,
  "per_page": 20
}
```

### 2. Create Package
**Endpoint**: `POST /api/admin/packages`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "tracking_number": "241221-123456",
  "user_code": "CUST001",
  "weight": 2.5,
  "description": "Electronics package",
  "branch": "Kingston"
}
```

**Response**:
```json
{
  "ok": true,
  "id": "new_package_id",
  "tracking_number": "241221-123456"
}
```

### 3. Update Package
**Endpoint**: `PUT /api/admin/packages`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "id": "package_id",
  "status": "delivered",
  "weight": 2.8,
  "description": "Updated description",
  "branch": "Montego Bay",
  "length": 30,
  "width": 20,
  "height": 10
}
```

**Response**:
```json
{
  "ok": true,
  "id": "package_id",
  "tracking_number": "241221-123456"
}
```

### 4. Delete Package
**Endpoint**: `DELETE /api/admin/packages?id=package_id`

**Authentication**: Admin session required

**Response**:
```json
{
  "ok": true,
  "id": "package_id",
  "message": "Package deleted successfully"
}
```

---

## Customer Management APIs

### 1. Get Customers
**Endpoint**: `GET /api/admin/customers`

**Authentication**: Admin session required

**Query Parameters**:
- `q` (optional): Search term (name, email, user code)
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20)

**Response**:
```json
{
  "customers": [
    {
      "id": "customer_id",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "userCode": "CUST001",
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "Kingston",
        "state": "St. Andrew",
        "zipCode": "JM12345"
      },
      "branch": "Kingston",
      "active_packages": 5,
      "total_revenue": 600.00,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total_count": 850,
  "page": 1,
  "per_page": 20
}
```

### 2. Create Customer
**Endpoint**: `POST /api/admin/customers`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Kingston",
    "state": "St. Andrew",
    "zipCode": "JM12345"
  },
  "branch": "Kingston"
}
```

**Response**:
```json
{
  "success": true,
  "customer_id": "new_customer_id",
  "userCode": "CUST002"
}
```

### 3. Update Customer
**Endpoint**: `PUT /api/admin/customers`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "id": "customer_id",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "address": {
    "street": "456 New St",
    "city": "Montego Bay",
    "state": "St. James",
    "zipCode": "JM23456"
  }
}
```

**Response**:
```json
{
  "success": true,
  "customer_id": "customer_id"
}
```

### 4. Delete Customer
**Endpoint**: `DELETE /api/admin/customers?id=customer_id`

**Authentication**: Admin session required

**Response**:
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

---

## Invoice Management APIs

### 1. Get Invoices
**Endpoint**: `GET /api/admin/invoices`

**Authentication**: Admin session required

**Query Parameters**:
- `q` (optional): Search term (invoice number)
- `status` (optional): Filter by status (draft, sent, paid, overdue)
- `page` (optional): Page number
- `per_page` (optional): Items per page

**Response**:
```json
{
  "invoices": [
    {
      "id": "invoice_id",
      "invoice_number": "INV-2024-001",
      "customer_id": "customer_id",
      "customer_name": "John Doe",
      "amount": 150.00,
      "status": "sent",
      "due_date": "2024-12-31T00:00:00.000Z",
      "created_at": "2024-12-21T10:30:00.000Z",
      "line_items": [
        {
          "description": "Package handling fee",
          "quantity": 1,
          "unit_price": 150.00,
          "total": 150.00
        }
      ]
    }
  ],
  "total_count": 45,
  "page": 1,
  "per_page": 20
}
```

### 2. Generate Invoice
**Endpoint**: `POST /api/admin/invoices`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "customer_id": "customer_id",
  "line_items": [
    {
      "description": "Package handling fee",
      "quantity": 1,
      "unit_price": 150.00
    }
  ],
  "due_date": "2024-12-31",
  "notes": "Payment due within 30 days"
}
```

**Response**:
```json
{
  "success": true,
  "invoice_id": "new_invoice_id",
  "invoice_number": "INV-2024-046"
}
```

### 3. Send Invoice
**Endpoint**: `POST /api/admin/invoices/send`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "invoice_id": "invoice_id",
  "recipient_email": "customer@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Invoice sent successfully"
}
```

---

## Bills Management APIs

### 1. Get Bills
**Endpoint**: `GET /api/admin/bills`

**Authentication**: Admin session required

**Response**:
```json
{
  "bills": [
    {
      "id": "bill_id",
      "tracking_number": "241221-123456",
      "customer_id": "customer_id",
      "customer_name": "John Doe",
      "amount": 150.00,
      "currency": "JMD",
      "status": "pending",
      "due_date": "2024-12-31T00:00:00.000Z",
      "created_at": "2024-12-21T10:30:00.000Z"
    }
  ],
  "total_count": 120,
  "total_amount": 18000.00
}
```

### 2. Create Bill
**Endpoint**: `POST /api/admin/bills`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "tracking_number": "241221-123456",
  "amount": 150.00,
  "currency": "JMD",
  "due_date": "2024-12-31",
  "description": "Package handling charges"
}
```

**Response**:
```json
{
  "success": true,
  "bill_id": "new_bill_id"
}
```

---

## Transaction APIs

### 1. Get Transactions
**Endpoint**: `GET /api/admin/transactions`

**Authentication**: Admin session required

**Query Parameters**:
- `q` (optional): Search term
- `status` (optional): Filter by status
- `payment_method` (optional): Filter by payment method
- `date_from` (optional): Start date
- `date_to` (optional): End date
- `page` (optional): Page number
- `per_page` (optional): Items per page

**Response**:
```json
{
  "transactions": [
    {
      "id": "transaction_id",
      "customer_id": "customer_id",
      "customer_name": "John Doe",
      "package_id": "package_id",
      "tracking_number": "241221-123456",
      "amount": 150.00,
      "currency": "JMD",
      "payment_method": "paypal",
      "status": "completed",
      "transaction_date": "2024-12-21T10:30:00.000Z",
      "paypal_order_id": "PAYPAL_ORDER_ID"
    }
  ],
  "total_count": 850,
  "total_amount": 127500.00,
  "page": 1,
  "per_page": 20
}
```

### 2. Record Transaction
**Endpoint**: `POST /api/admin/transactions`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "customer_id": "customer_id",
  "package_id": "package_id",
  "amount": 150.00,
  "currency": "JMD",
  "payment_method": "cash",
  "notes": "Cash payment received"
}
```

**Response**:
```json
{
  "success": true,
  "transaction_id": "new_transaction_id"
}
```

---

## Shipment & Manifest APIs

### 1. Get Shipments
**Endpoint**: `GET /api/admin/shipments`

**Authentication**: Admin session required

**Response**:
```json
{
  "shipments": [
    {
      "id": "shipment_id",
      "manifest_number": "MAN-2024-001",
      "status": "in_transit",
      "origin": "Kingston",
      "destination": "Montego Bay",
      "package_count": 25,
      "total_weight": 75.5,
      "created_at": "2024-12-21T10:30:00.000Z",
      "estimated_arrival": "2024-12-23T00:00:00.000Z"
    }
  ],
  "total_count": 45
}
```

### 2. Create Shipment/Manifest
**Endpoint**: `POST /api/admin/shipments`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "manifest_number": "MAN-2024-002",
  "origin": "Kingston",
  "destination": "Montego Bay",
  "package_ids": ["package_id1", "package_id2", "package_id3"],
  "estimated_arrival": "2024-12-23"
}
```

**Response**:
```json
{
  "success": true,
  "shipment_id": "new_shipment_id",
  "manifest_number": "MAN-2024-002"
}
```

---

## Broadcast APIs

### 1. Get Broadcasts
**Endpoint**: `GET /api/admin/broadcasts`

**Authentication**: Admin session required

**Response**:
```json
{
  "broadcasts": [
    {
      "id": "broadcast_id",
      "title": "Holiday Schedule Update",
      "message": "Please note our updated holiday schedule...",
      "recipient_count": 850,
      "sent_count": 825,
      "delivered_count": 800,
      "status": "sent",
      "scheduled_at": "2024-12-21T10:30:00.000Z",
      "sent_at": "2024-12-21T10:35:00.000Z"
    }
  ],
  "total_count": 25
}
```

### 2. Send Broadcast
**Endpoint**: `POST /api/admin/broadcasts`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "title": "System Maintenance Notice",
  "message": "The system will be under maintenance...",
  "recipient_type": "all",
  "scheduled_at": "2024-12-22T09:00:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "broadcast_id": "new_broadcast_id"
}
```

---

## Pre-Alerts APIs

### 1. Get Pre-Alerts
**Endpoint**: `GET /api/admin/pre-alerts`

**Authentication**: Admin session required

**Response**:
```json
{
  "prealerts": [
    {
      "id": "prealert_id",
      "tracking_number": "241221-123456",
      "customer_id": "customer_id",
      "customer_name": "John Doe",
      "description": "Expected package from Amazon",
      "expected_date": "2024-12-23T00:00:00.000Z",
      "status": "pending",
      "created_at": "2024-12-21T10:30:00.000Z"
    }
  ],
  "total_count": 150
}
```

### 2. Create Pre-Alert
**Endpoint**: `POST /api/admin/pre-alerts`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "tracking_number": "241221-123456",
  "customer_id": "customer_id",
  "description": "Expected package from Amazon",
  "expected_date": "2024-12-23"
}
```

**Response**:
```json
{
  "success": true,
  "prealert_id": "new_prealert_id"
}
```

---

## Staff Management APIs

### 1. Get Staff Members
**Endpoint**: `GET /api/admin/staff`

**Authentication**: Admin session required (admin role only)

**Response**:
```json
{
  "staff": [
    {
      "id": "staff_id",
      "name": "Jane Admin",
      "email": "jane@cleanjshipping.com",
      "role": "admin",
      "status": "active",
      "last_login": "2024-12-21T09:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total_count": 8
}
```

### 2. Create Staff Account
**Endpoint**: `POST /api/admin/staff`

**Authentication**: Admin session required (admin role only)

**Request Body**:
```json
{
  "name": "New Staff Member",
  "email": "staff@cleanjshipping.com",
  "role": "warehouse_staff",
  "permissions": ["packages:read", "packages:write"]
}
```

**Response**:
```json
{
  "success": true,
  "staff_id": "new_staff_id",
  "temporary_password": "temp123456"
}
```

---

## Reporting APIs

### 1. Package Reports
**Endpoint**: `GET /api/admin/reports/packages`

**Authentication**: Admin session required

**Query Parameters**:
- `date_from` (optional): Start date
- `date_to` (optional): End date
- `status` (optional): Filter by status
- `branch` (optional): Filter by branch
- `format` (optional): Output format (json, csv, pdf)

**Response**:
```json
{
  "report_data": [
    {
      "tracking_number": "241221-123456",
      "customer_name": "John Doe",
      "status": "delivered",
      "created_at": "2024-12-21T10:30:00.000Z",
      "delivered_at": "2024-12-23T14:20:00.000Z",
      "branch": "Kingston"
    }
  ],
  "summary": {
    "total_packages": 1250,
    "delivered": 850,
    "in_transit": 200,
    "pending": 150,
    "ready_for_pickup": 50
  }
}
```

### 2. Revenue Reports
**Endpoint**: `GET /api/admin/reports/revenue`

**Authentication**: Admin session required

**Response**:
```json
{
  "revenue_data": [
    {
      "date": "2024-12-21",
      "revenue": 2500.00,
      "transactions": 18,
      "average_transaction": 138.89
    }
  ],
  "summary": {
    "total_revenue": 150000.00,
    "total_transactions": 1085,
    "average_transaction": 138.25,
    "growth_rate": 12.5
  }
}
```

---

## Settings APIs

### 1. Get System Settings
**Endpoint**: `GET /api/admin/settings`

**Authentication**: Admin session required (admin role only)

**Response**:
```json
{
  "company": {
    "name": "Clean J Shipping",
    "email": "info@cleanjshipping.com",
    "phone": "+1876543210",
    "address": "123 Main St, Kingston, Jamaica"
  },
  "paypal": {
    "client_id": "PAYPAL_CLIENT_ID",
    "environment": "sandbox",
    "currency": "JMD"
  },
  "email": {
    "provider": "smtp",
    "host": "smtp.gmail.com",
    "port": 587,
    "from_email": "noreply@cleanjshipping.com"
  },
  "system": {
    "timezone": "America/Jamaica",
    "date_format": "YYYY-MM-DD",
    "currency": "JMD"
  }
}
```

### 2. Update Settings
**Endpoint**: `PUT /api/admin/settings`

**Authentication**: Admin session required (admin role only)

**Request Body**:
```json
{
  "company": {
    "name": "Clean J Shipping",
    "email": "updated@cleanjshipping.com",
    "phone": "+1876543210"
  },
  "paypal": {
    "client_id": "NEW_CLIENT_ID",
    "environment": "sandbox"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## Profile Management APIs

### 1. Get Admin Profile
**Endpoint**: `GET /api/admin/profile`

**Authentication**: Admin session required

**Response**:
```json
{
  "id": "admin_id",
  "name": "Jane Admin",
  "email": "jane@cleanjshipping.com",
  "role": "admin",
  "last_login": "2024-12-21T09:00:00.000Z",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 2. Update Profile
**Endpoint**: `PUT /api/admin/profile`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "name": "Jane Admin",
  "email": "jane@cleanjshipping.com",
  "phone": "+1876543210"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### 3. Change Password
**Endpoint**: `PUT /api/admin/profile/password`

**Authentication**: Admin session required

**Request Body**:
```json
{
  "current_password": "old_password",
  "new_password": "new_password",
  "confirm_password": "new_password"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Logs & Audit APIs

### 1. Get System Logs
**Endpoint**: `GET /api/admin/logs`

**Authentication**: Admin session required (admin role only)

**Query Parameters**:
- `level` (optional): Filter by log level (error, warn, info, debug)
- `date_from` (optional): Start date
- `date_to` (optional): End date
- `search` (optional): Search term
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "logs": [
    {
      "id": "log_id",
      "level": "info",
      "message": "Package created successfully",
      "timestamp": "2024-12-21T10:30:00.000Z",
      "user_id": "admin_id",
      "user_name": "Jane Admin",
      "ip_address": "192.168.1.100",
      "action": "package.create",
      "details": {
        "package_id": "package_id",
        "tracking_number": "241221-123456"
      }
    }
  ],
  "total_count": 15420,
  "page": 1,
  "limit": 50
}
```

### 2. Get Audit Trail
**Endpoint**: `GET /api/admin/logs/audit`

**Authentication**: Admin session required (admin role only)

**Response**:
```json
{
  "audit_trail": [
    {
      "id": "audit_id",
      "user_id": "admin_id",
      "user_name": "Jane Admin",
      "action": "package.status_update",
      "resource_type": "package",
      "resource_id": "package_id",
      "old_values": {
        "status": "in_transit"
      },
      "new_values": {
        "status": "delivered"
      },
      "timestamp": "2024-12-21T10:30:00.000Z",
      "ip_address": "192.168.1.100"
    }
  ],
  "total_count": 8540
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
- `409`: Conflict (duplicate resource)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

---

## Testing Examples

### Using curl for API Testing

```bash
# Get dashboard statistics
curl -X GET "http://localhost:3000/api/admin/dashboard/stats" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Get packages with filters
curl -X GET "http://localhost:3000/api/admin/packages?status=delivered&page=1&per_page=10" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Create new package
curl -X POST "http://localhost:3000/api/admin/packages" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tracking_number": "241221-123456",
    "user_code": "CUST001",
    "weight": 2.5,
    "description": "Electronics package",
    "branch": "Kingston"
  }'

# Update package status
curl -X PUT "http://localhost:3000/api/admin/packages" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "id": "package_id",
    "status": "delivered"
  }'

# Get customers
curl -X GET "http://localhost:3000/api/admin/customers?q=John&page=1" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Generate invoice
curl -X POST "http://localhost:3000/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "customer_id": "customer_id",
    "line_items": [
      {
        "description": "Package handling fee",
        "quantity": 1,
        "unit_price": 150.00
      }
    ],
    "due_date": "2024-12-31"
  }'
```

---

## Rate Limiting

### Admin API Limits
- Dashboard API: 60 requests per minute
- Package API: 100 requests per minute
- Customer API: 80 requests per minute
- Invoice API: 50 requests per minute
- Report API: 20 requests per minute
- Settings API: 30 requests per minute

### Rate Limit Headers
```http
X-RateLimit-Limit:fty: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Data Validation

### Package Tracking Numbers
- Format:来不及YYMMDD-XXXXXX (6 digits)
- Example: 241221-123456

### Customer User Codes
- Format: CUST followed by numbers
- Example: CUST001, CUST002

### Invoice Numbers
- Format: INV-YYYY-NNN
- Example: INV-2024-001

### Manifest Numbers
- Format: MAN-YYYY-NNN
- Example: MAN-2024-001

---

## Integration Notes

1. **Session Management**: All APIs require active NextAuth session
2. **Role-Based Access**: Different endpoints require different roles
3. **Audit Trail**: All admin actions are logged for compliance
4. **Data Validation**: Input validation enforced on all endpoints
5. **Error Handling**: Comprehensive error responses for debugging
6. **Pagination**: Large datasets support pagination for performance
7. **Search**: Most list endpoints support search functionality
8. **Filtering**: Advanced filtering options available on most endpoints

---

## Security Considerations

1. **Authentication**: All endpoints protected by session authentication
2. **Authorization**: Role-based access control enforced
3. **Audit Logging**: All admin actions logged for compliance
4. **Input Validation**: Comprehensive input validation on all endpoints
5. **Rate Limiting**: Request rate limits prevent abuse
6. **HTTPS**: Production requires SSL/TLS encryption
7. **Data Privacy**: Sensitive data properly protected

---

## Support

For admin API integration issues:
1. Check authentication credentials
2. Verify session validity
3. Review request format and required fields
4. Monitor rate limiting headers
5. Check error responses for specific issues
6. Review audit logs for debugging
7. Contact development team with endpoint details and error messages

---

**Note**: This API documentation covers all admin portal endpoints. Ensure proper authentication and role-based access when integrating with these APIs.
