# Customer API Documentation

This document provides detailed API endpoint documentation for the Clean J Shipping customer portal, specifically for customer testing and integration.

## Base URL
```
http://localhost:3000/api/customer
```

## Authentication

### Customer Authentication
- Uses NextAuth.js session-based authentication
- Customers must login through `/auth/signin`
- Session token required for all API calls
- Role-based access control (customer role required)

### Session Headers
```
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

---

## Package Management APIs

### 1. Get Customer Packages
**Endpoint**: `GET /api/customer/packages`

**Authentication**: Customer session required

**Response**:
```json
{
  "packages": [
    {
      "id": "package_id",
      "tracking_number": "241221-123456",
      "trackingNumber": "241221-123456",
      "status": "in_transit",
      "description": "Electronics package",
      "weight_kg": 2.5,
      "weight": "2.5 kg",
      "userCode": "CUST001",
      "shipper": "Amazon",
      "current_location": "Kingston Hub",
      "updated_at": "2024-12-21T10:30:00.000Z",
      "createdAt": "2024-12-21T10:30:00.000Z",
      "estimated_delivery": "2024-12-23T00:00:00.000Z",
      "invoice_status": "uploaded"
    }
  ],
  "total_packages": 1
}
```

### 2. Upload Package Invoice
**Endpoint**: `POST /api/customer/packages/[id]/invoice`

**Authentication**: Customer session required

**Request**: Multipart form data
- `files`: Invoice files (PDF, JPEG, PNG, WebP)

**Response**:
```json
{
  "success": true,
  "message": "Invoice uploaded successfully",
  "uploaded_files": ["invoice1.pdf", "invoice2.jpg"]
}
```

---

## Bills & Payments APIs

### 1. Get Customer Bills
**Endpoint**: `GET /api/customer/bills`

**Authentication**: Customer session required

**Response**:
```json
{
  "bills": [
    {
      "tracking_number": "241221-123456",
      "description": "Electronics package",
      "invoice_number": "INV-2024-001",
      "invoice_date": "2024-12-21T00:00:00.000Z",
      "currency": "JMD",
      "amount_due": 1500.00,
      "payment_status": "submitted",
      "document_url": "https://example.com/invoice.pdf",
      "last_updated": "2024-12-21T10:30:00.000Z"
    }
  ]
}
```

### 2. Create PayPal Order
**Endpoint**: `POST /api/customer/payments/create-paypal-order`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "amount": 1500.00,
  "currency": "JMD",
  "description": "Payment for invoice INV-2024-001",
  "trackingNumber": "241221-123456"
}
```

**Response**:
```json
{
  "orderId": "PAYPAL_ORDER_ID",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_ID"
}
```

### 3. Capture PayPal Payment
**Endpoint**: `POST /api/customer/payments/capture-paypal`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

**Response**:
```json
{
  "captureId": "CAPTURE_ID",
  "status": "COMPLETED",
  "amount": {
    "value": "1500.00",
    "currency": "JMD"
  }
}
```

### 4. Process Payment
**Endpoint**: `POST /api/customer/payments/process`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "trackingNumber": "241221-123456",
  "amount": 1500.00,
  "currency": "JMD",
  "paymentMethod": "paypal",
  "paypalOrderId": "PAYPAL_ORDER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": "TRANSACTION_ID",
  "message": "Payment processed successfully"
}
```

---

## Profile Management APIs

### 1. Get Customer Profile
**Endpoint**: `GET /api/customer/profile`

**Authentication**: Customer session required

**Response**:
```json
{
  "userCode": "CUST001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Kingston",
    "state": "St. Andrew",
    "zipCode": "JM12345",
    "country": "Jamaica"
  },
  "branch": "Kingston",
  "serviceTypeIDs": ["standard", "express"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Update Customer Profile
**Endpoint**: `PUT /api/customer/profile`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Kingston",
    "state": "St. Andrew",
    "zipCode": "JM12345",
    "country": "Jamaica"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "Kingston",
      "state": "St. Andrew",
      "zipCode": "JM12345",
      "country": "Jamaica"
    }
  }
}
```

---

## Messages APIs

### 1. Get Customer Messages
**Endpoint**: `GET /api/customer/messages`

**Authentication**: Customer session required

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 20)
- `status` (optional): Filter by status (read/unread)

**Response**:
```json
{
  "messages": [
    {
      "id": "message_id",
      "subject": "Package Update",
      "content": "Your package has been shipped",
      "sender": "Clean J Shipping",
      "status": "unread",
      "createdAt": "2024-12-21T10:30:00.000Z",
      "attachments": []
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 2. Send Message
**Endpoint**: `POST /api/customer/messages`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "subject": "Package Inquiry",
  "content": "I have a question about my package",
  "recipient": "support@cleanjshipping.com"
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "new_message_id",
  "message": "Message sent successfully"
}
```

---

## Support APIs

### 1. Get Support Tickets
**Endpoint**: `GET /api/customer/support`

**Authentication**: Customer session required

**Response**:
```json
{
  "tickets": [
    {
      "id": "ticket_id",
      "subject": "Package Delivery Issue",
      "description": "My package hasn't arrived",
      "status": "open",
      "priority": "medium",
      "createdAt": "2024-12-21T10:30:00.000Z",
      "updatedAt": "2024-12-21T10:30:00.000Z",
      "responses": []
    }
  ]
}
```

### 2. Create Support Ticket
**Endpoint**: `POST /api/customer/support`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "subject": "Package Delivery Issue",
  "description": "My package hasn't arrived",
  "priority": "medium",
  "category": "delivery"
}
```

**Response**:
```json
{
  "success": true,
  "ticketId": "new_ticket_id",
  "message": "Support ticket created successfully"
}
```

---

## Pre-Alerts APIs

### 1. Get Pre-Alerts
**Endpoint**: `GET /api/customer/pre-alerts`

**Authentication**: Customer session required

**Response**:
```json
{
  "prealerts": [
    {
      "id": "prealert_id",
      "trackingNumber": "241221-123456",
      "description": "Expected package from Amazon",
      "status": "pending",
      "expectedDate": "2024-12-23T00:00:00.000Z",
      "createdAt": "2024-12-21T10:30:00.000Z"
    }
  ]
}
```

### 2. Create Pre-Alert
**Endpoint**: `POST /api/customer/pre-alerts`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "trackingNumber": "241221-123456",
  "description": "Expected package from Amazon",
  "expectedDate": "2024-12-23T00:00:00.000Z",
  "shipper": "Amazon"
}
```

**Response**:
```json
{
  "success": true,
  "prealertId": "new_prealert_id",
  "message": "Pre-alert created successfully"
}
```

---

## Archives APIs

### 1. Get Archived Packages
**Endpoint**: `GET /api/customer/archives/packages`

**Authentication**: Customer session required

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `year` (optional): Filter by year

**Response**:
```json
{
  "packages": [
    {
      "id": "archived_package_id",
      "trackingNumber": "231221-123456",
      "description": "Archived package",
      "status": "delivered",
      "archivedAt": "2024-12-21T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1
}
```

### 2. Get Archived Messages
**Endpoint**: `GET /api/customer/archives/messages`

**Authentication**: Customer session required

**Response**:
```json
{
  "messages": [
    {
      "id": "archived_message_id",
      "subject": "Old Notification",
      "content": "Message content",
      "archivedAt": "2024-12-21T10:30:00.000Z"
    }
  ]
}
```

---

## Referral APIs

### 1. Get Referral Information
**Endpoint**: `GET /api/customer/referral`

**Authentication**: Customer session required

**Response**:
```json
{
  "referralCode": "CUST001-REF",
  "referralLink": "https://cleanjshipping.com/signup?ref=CUST001-REF",
  "referralsCount": 5,
  "rewardsEarned": 25.00,
  "rewardsCurrency": "JMD"
}
```

### 2. Send Referral
**Endpoint**: `POST /api/customer/referral`

**Authentication**: Customer session required

**Request Body**:
```json
{
  "recipientEmail": "friend@example.com",
  "recipientName": "Jane Smith",
  "message": "Check out Clean J Shipping!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Referral sent successfully",
  "referralId": "new_referral_id"
}
```

---

## FAQ APIs

### 1. Get FAQ Categories
**Endpoint**: `GET /api/customer/faq`

**Authentication**: Customer session required

**Query Parameters**:
- `category` (optional): Filter by category
- `search` (optional): Search term

**Response**:
```json
{
  "categories": [
    {
      "id": "shipping",
      "name": "Shipping",
      "questions": [
        {
          "id": "q1",
          "question": "How long does shipping take?",
          "answer": "Shipping typically takes 3-5 business days...",
          "helpful": 15
        }
      ]
    }
  ]
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
# Get customer packages
curl -X GET "http://localhost:3000/api/customer/packages" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Get customer bills
curl -X GET "http://localhost:3000/api/customer/bills" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Create PayPal order
curl -X POST "http://localhost:3000/api/customer/payments/create-paypal-order" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "amount": 1500.00,
    "currency": "JMD",
    "description": "Payment for invoice",
    "trackingNumber": "241221-123456"
  }'

# Update customer profile
curl -X PUT "http://localhost:3000/api/customer/profile" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

---

## Rate Limiting

### Customer API Limits
- Package API: 100 requests per minute
- Bills API: 50 requests per minute
- Payment APIs: 10 requests per minute
- Profile API: 20 requests per minute
- Messages API: 30 requests per minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Data Validation

### Package Tracking Numbers
- Format: YYMMDD-XXXXXX (6 digits)
- Example: 241221-123456

### Payment Amounts
- Minimum: 1.00
- Maximum: 100000.00
- Decimals: 2

### Phone Numbers
- Format: + Country Code + Number
- Example: +1234567890

---

## Integration Notes

1. **Session Management**: All APIs require active NextAuth session
2. **Customer Data Access**: Customers can only access their own data
3. **Payment Processing**: PayPal integration uses sandbox mode for testing
4. **File Uploads**: Invoice uploads support PDF, JPEG, PNG, WebP formats
5. **Real-time Updates**: Package status updates reflect immediately
6. **Cart Persistence**: Shopping cart data stored in localStorage

---

## Security Considerations

1. **Authentication**: All endpoints protected by session authentication
2. **Authorization**: Role-based access control enforced
3. **Data Validation**: Input validation on all endpoints
4. **Rate Limiting**: Request rate limits prevent abuse
5. **HTTPS**: Production requires SSL/TLS encryption

---

## Support

For customer API integration issues:
1. Check authentication credentials
2. Verify session validity
3. Review request format and required fields
4. Monitor rate limiting headers
5. Check error responses for specific issues
6. Contact development team with endpoint details and error messages

---

**Note**: This API documentation covers all customer portal endpoints. Ensure proper authentication and data validation when integrating with these APIs.
