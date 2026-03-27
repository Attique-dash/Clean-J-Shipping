# Clean J Shipping - Testing Guide
## Warehouse Sync (KCD), Invoice Upload, and Payment Flow

This guide provides step-by-step instructions to test the three core integrations.

---

## 1. WAREHOUSE SYNC (KCD) TESTING

### Overview
The KCD Warehouse Sync allows external courier systems (KCD) to sync packages into Clean J Shipping.

**Key Files:**
- `warehouse-backend/src/routes/kcd.ts` - KCD API routes
- `warehouse-backend/src/middleware/kcdWebhookAuth.ts` - API key validation
- `src/app/api/kcd/packages/add/route.ts` - Package creation endpoint

### Prerequisites
1. KCD API Key configured in database (with `courierCode` and `isActive: true`)
2. Customer account exists with matching `userCode`
3. Warehouse backend server running

### Test Steps

#### Step 1.1: Get Customers (KCD → Clean J)
```bash
curl -X GET "http://localhost:3001/api/kcd/customers?limit=10" \
  -H "X-KCD-API-Key: your_kcd_api_key_here"
```

**Expected Response:**
```json
[
  {
    "UserCode": "CLEAN001",
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john@example.com",
    "Phone": "+1234567890",
    "Branch": "Down Town",
    "MailboxNumber": "BOX001"
  }
]
```

#### Step 1.2: Add Package (KCD → Clean J)
```bash
curl -X POST "http://localhost:3001/api/kcd/packages/add" \
  -H "Content-Type: application/json" \
  -H "X-KCD-API-Key: your_kcd_api_key_here" \
  -d '{
    "trackingNumber": "TEST123456",
    "userCode": "CLEAN001",
    "weight": 2.5,
    "shipper": "Amazon",
    "description": "Electronics",
    "status": "received"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Package added successfully",
  "data": [{
    "PackageID": "...",
    "TrackingNumber": "TEST123456",
    "UserCode": "CLEAN001",
    "Weight": 2.5,
    "Shipper": "Amazon"
  }]
}
```

#### Step 1.3: Verify Package in Database
```bash
# Check MongoDB directly
db.packages.findOne({ trackingNumber: "TEST123456" })
```

**Expected:** Package document exists with:
- `source: "kcd-packing-system"`
- `courierCode` set to your KCD courier code
- `trackingHistory` array with initial entry

#### Step 1.4: Test Error Cases
```bash
# Invalid API key - Should return 401
curl -X GET "http://localhost:3001/api/kcd/customers" \
  -H "X-KCD-API-Key: invalid_key"

# Missing customer - Should return 404
curl -X POST "http://localhost:3001/api/kcd/packages/add" \
  -H "Content-Type: application/json" \
  -H "X-KCD-API-Key: your_key" \
  -d '{"trackingNumber":"T1","userCode":"NONEXISTENT","weight":1}'

# Duplicate tracking - Should return 409
curl -X POST "http://localhost:3001/api/kcd/packages/add" \
  -H "Content-Type: application/json" \
  -H "X-KCD-API-Key: your_key" \
  -d '{"trackingNumber":"TEST123456","userCode":"CLEAN001","weight":1}'
```

---

## 2. INVOICE UPLOAD TESTING

### Overview
Customers can upload invoice files (PDF/images) for their packages using Cloudinary for storage.

**Key Files:**
- `src/app/api/customer/invoice-upload/route.ts` - Upload endpoint
- `src/lib/cloudinary.ts` - Cloudinary configuration
- `src/app/customer/invoice-upload/page.tsx` - Upload UI

### Prerequisites
1. Cloudinary credentials configured in `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
2. Customer authenticated with valid JWT
3. Package exists and belongs to customer

### Test Steps

#### Step 2.1: Prepare Test File
Create a test PDF or image file:
```bash
echo "Test invoice content" > test_invoice.txt
# Or use a real PDF/image file
```

#### Step 2.2: Upload Invoice (via API)
```bash
curl -X POST "http://localhost:3000/api/customer/invoice-upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_invoice.pdf" \
  -F "packageId=PACKAGE_OBJECT_ID" \
  -F "invoiceNumber=INV-001" \
  -F "pricePaid=150.00" \
  -F "pricePaidCurrency=USD"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Invoice uploaded successfully",
  "data": {
    "invoiceId": "...",
    "fileUrl": "https://res.cloudinary.com/.../invoice_123.pdf",
    "publicId": "invoices/invoice_123",
    "status": "pending"
  }
}
```

#### Step 2.3: Verify Upload
```bash
# Check package document
db.packages.findOne({ _id: ObjectId("PACKAGE_ID") })
```

**Expected Fields:**
- `invoiceUploaded: true`
- `invoiceFiles: [{ url, publicId, uploadedAt }]`
- `invoiceStatus: "pending"`
- `pricePaid: 150.00`
- `pricePaidCurrency: "USD"`

#### Step 2.4: Admin Review (Approve/Reject)
```bash
# Approve invoice
curl -X PATCH "http://localhost:3000/api/admin/invoices/INVOICE_ID" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "reviewNotes": "Invoice verified and approved"
  }'

# Reject invoice
curl -X PATCH "http://localhost:3000/api/admin/invoices/INVOICE_ID" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "reviewNotes": "Invoice unclear - please resubmit"
  }'
```

#### Step 2.5: Test File Validation
```bash
# File too large (if limit is 5MB)
curl -X POST "http://localhost:3000/api/customer/invoice-upload" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@huge_file.zip" \
  -F "packageId=PACKAGE_ID"
# Expected: 413 Payload Too Large

# Invalid file type
curl -X POST "http://localhost:3000/api/customer/invoice-upload" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@malware.exe" \
  -F "packageId=PACKAGE_ID"
# Expected: 400 Invalid file type
```

---

## 3. PAYMENT FLOW TESTING

### Overview
Complete PayPal payment integration with bill creation, cart management, and payment confirmation.

**Key Files:**
- `src/app/api/bills/create/route.ts` - Bill creation
- `src/app/api/bills/[id]/pay/route.ts` - PayPal order creation
- `src/app/api/bills/[id]/confirm/route.ts` - Payment capture
- `src/app/api/webhooks/paypal/route.ts` - Webhook handling
- `src/lib/paypal.ts` - PayPal SDK integration
- `src/lib/email.ts` - Payment emails

### Prerequisites
1. PayPal credentials in `.env`:
   ```
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_CLIENT_SECRET=your_client_secret
   PAYPAL_ENVIRONMENT=sandbox
   PAYPAL_WEBHOOK_ID=your_webhook_id
   ```
2. Customer with packages ready for billing
3. Valid customer authentication

### Test Steps

#### Step 3.1: Add Packages to Cart
```bash
# Add package 1 to cart
curl -X POST "http://localhost:3000/api/customer/cart/add" \
  -H "Authorization: Bearer CUSTOMER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"packageId": "PACKAGE_ID_1"}'

# Add package 2 to cart
curl -X POST "http://localhost:3000/api/customer/cart/add" \
  -H "Authorization: Bearer CUSTOMER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"packageId": "PACKAGE_ID_2"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Package added to cart",
  "cartItem": {
    "packageId": "...",
    "trackingNumber": "TRK123",
    "cartStatus": "in-cart"
  }
}
```

#### Step 3.2: View Cart
```bash
curl -X GET "http://localhost:3000/api/customer/cart" \
  -H "Authorization: Bearer CUSTOMER_JWT"
```

**Expected Response:**
```json
{
  "success": true,
  "items": [
    {
      "packageId": "...",
      "trackingNumber": "TRK123",
      "shipper": "Amazon",
      "weight": 2.5,
      "estimatedTotal": 25.00
    }
  ],
  "summary": {
    "totalItems": 2,
    "estimatedSubtotal": 50.00,
    "estimatedTax": 7.50,
    "estimatedTotal": 57.50
  }
}
```

#### Step 3.3: Checkout (Create Bill)
```bash
curl -X POST "http://localhost:3000/api/customer/cart/checkout" \
  -H "Authorization: Bearer CUSTOMER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerNotes": "Please deliver after 5pm"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bill created successfully",
  "bill": {
    "billId": "...",
    "billNumber": "BILL-202601-0001",
    "totalAmount": 57.50,
    "currency": "USD",
    "status": "pending",
    "dueDate": "2026-02-15T00:00:00Z"
  }
}
```

**Verify:**
- Email sent to customer with bill details
- Package `cartStatus` changed from `in-cart` to `billed`
- Package `billId` set to new bill ID

#### Step 3.4: Initiate PayPal Payment
```bash
curl -X POST "http://localhost:3000/api/bills/BILL_ID/pay" \
  -H "Authorization: Bearer CUSTOMER_JWT"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "PayPal order created successfully",
  "paypalOrderId": "5O190127TN364715T",
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
  "amount": 57.50,
  "currency": "USD"
}
```

**Verify:**
- Bill status changed to `sent`
- `paypalOrderId` and `paymentGateway` fields populated

#### Step 3.5: Simulate PayPal Approval (Manual Testing)
For sandbox testing, use PayPal's test buyer account:
1. Open `approvalUrl` in browser
2. Log in with PayPal sandbox buyer credentials
3. Complete payment
4. PayPal redirects to: `/customer/bills?paypal=success`

#### Step 3.6: Confirm Payment (After PayPal Approval)
```bash
curl -X POST "http://localhost:3000/api/bills/BILL_ID/confirm" \
  -H "Authorization: Bearer CUSTOMER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "paypalOrderId": "5O190127TN364715T"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "bill": {
    "status": "paid",
    "paidAmount": 57.50,
    "paidAt": "2026-01-20T10:30:00Z",
    "paypalPaymentId": "PAYID-..."
  }
}
```

**Verify:**
- Bill status: `paid`
- Payment confirmation email sent to customer
- Admin notification email sent
- Package statuses updated to `paid`

#### Step 3.7: Test Webhook (Payment.Capture.Completed)
```bash
curl -X POST "http://localhost:3000/api/webhooks/paypal" \
  -H "Content-Type: application/json" \
  -H "PayPal-Transmission-Id: test-transmission-id" \
  -H "PayPal-Transmission-Time: 2026-01-20T10:30:00Z" \
  -H "PayPal-Transmission-Sig: test-signature" \
  -H "PayPal-Auth-Algo: SHA256withRSA" \
  -H "PayPal-Cert-Id: test-cert-id" \
  -d '{
    "id": "WH-2WR32451HC0235322-67976317FL4543714",
    "event_version": "1.0",
    "create_time": "2026-01-20T10:30:00Z",
    "resource_type": "capture",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "id": "CAPTURE_ID",
      "amount": {
        "currency_code": "USD",
        "value": "57.50"
      },
      "links": [{
        "href": "https://api.paypal.com/v2/payments/captures/CAPTURE_ID",
        "rel": "self"
      }]
    }
  }'
```

#### Step 3.8: Test Payment Failure Scenarios
```bash
# Test double payment prevention
curl -X POST "http://localhost:3000/api/bills/ALREADY_PAID_BILL_ID/pay" \
  -H "Authorization: Bearer CUSTOMER_JWT"
# Expected: 400 "Bill has already been paid"

# Test cancelled bill
curl -X POST "http://localhost:3000/api/bills/CANCELLED_BILL_ID/pay" \
  -H "Authorization: Bearer CUSTOMER_JWT"
# Expected: 400 "Bill has been cancelled"

# Test unauthorized access
curl -X POST "http://localhost:3000/api/bills/OTHER_CUSTOMER_BILL_ID/pay" \
  -H "Authorization: Bearer WRONG_CUSTOMER_JWT"
# Expected: 403 "You don't have permission to pay this bill"
```

---

## 4. END-TO-END INTEGRATION TEST

### Complete Workflow Test

1. **KCD Warehouse Sync:**
   - KCD system sends package to Clean J via API
   - Verify package appears in customer dashboard

2. **Invoice Upload:**
   - Customer uploads invoice for received package
   - Admin approves invoice
   - Package marked ready for billing

3. **Payment Flow:**
   - Customer adds packages to cart
   - Customer checks out (bill created)
   - Customer pays via PayPal
   - Payment confirmed, packages ready for pickup

### Test Script (Automated)
```bash
#!/bin/bash

# Set variables
KCD_API_KEY="your_kcd_api_key"
CUSTOMER_JWT="your_customer_jwt"
ADMIN_JWT="your_admin_jwt"
BASE_URL="http://localhost:3000"
WAREHOUSE_URL="http://localhost:3001"

echo "=== TEST 1: KCD Package Sync ==="
PACKAGE_RESPONSE=$(curl -s -X POST "$WAREHOUSE_URL/api/kcd/packages/add" \
  -H "Content-Type: application/json" \
  -H "X-KCD-API-Key: $KCD_API_KEY" \
  -d '{"trackingNumber":"E2E-TEST-001","userCode":"CLEAN001","weight":1.5,"shipper":"Test"}')
echo "$PACKAGE_RESPONSE"

echo "=== TEST 2: Add to Cart ==="
curl -s -X POST "$BASE_URL/api/customer/cart/add" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PACKAGE_ID_FROM_STEP_1"}'

echo "=== TEST 3: Checkout ==="
BILL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/customer/cart/checkout" \
  -H "Authorization: Bearer $CUSTOMER_JWT")
echo "$BILL_RESPONSE"
BILL_ID=$(echo "$BILL_RESPONSE" | jq -r '.bill.billId')

echo "=== TEST 4: Pay with PayPal ==="
curl -s -X POST "$BASE_URL/api/bills/$BILL_ID/pay" \
  -H "Authorization: Bearer $CUSTOMER_JWT"

echo "=== All tests completed ==="
```

---

## 5. TROUBLESHOOTING

### Common Issues

| Issue | Solution |
|-------|----------|
| `401 Invalid API key` (KCD) | Verify API key in database has `isActive: true` and valid `courierCode` |
| `404 Customer not found` | Ensure customer `userCode` matches exactly (case-sensitive) |
| `409 Duplicate tracking` | Use unique tracking numbers or update existing package |
| `Cloudinary upload fails` | Check Cloudinary credentials and file size (< 10MB) |
| `PayPal order creation fails` | Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` |
| `Webhook verification fails` | Ensure `PAYPAL_WEBHOOK_ID` is set in environment |
| `Email not sending` | Check `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` configuration |

### Debug Commands
```bash
# Check KCD API key in database
db.apikeys.findOne({ key: "your_key" })

# Check bill status
db.bills.findOne({ billNumber: "BILL-202601-0001" })

# Check package cart status
db.packages.findOne({ trackingNumber: "TEST123" }, { cartStatus: 1, billId: 1 })

# View recent PayPal webhooks
db.paypalevents.find().sort({ createdAt: -1 }).limit(5)
```

---

## 6. ENVIRONMENT VARIABLES CHECKLIST

```bash
# KCD Warehouse Sync
KCD_API_KEYS=             # Comma-separated KCD API keys
WAREHOUSE_API_KEYS=       # Warehouse access keys

# Invoice Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=    # Your Cloudinary cloud name
CLOUDINARY_API_KEY=        # Cloudinary API key
CLOUDINARY_API_SECRET=     # Cloudinary API secret

# Payment Flow (PayPal)
PAYPAL_CLIENT_ID=          # PayPal client ID
PAYPAL_CLIENT_SECRET=      # PayPal client secret
PAYPAL_ENVIRONMENT=       # sandbox or production
PAYPAL_WEBHOOK_ID=         # PayPal webhook ID

# Email Notifications
SMTP_HOST=                 # smtp.gmail.com
SMTP_PORT=                 # 587
SMTP_USER=                 # noreply@cleanjshipping.com
SMTP_PASS=                 # App password
ADMIN_EMAIL=               # admin@cleanjshipping.com
```

---

## Summary

All three integrations are fully implemented:

1. **✅ Warehouse Sync (KCD)** - Complete API for package sync with validation
2. **✅ Invoice Upload** - Cloudinary-based file upload with admin approval
3. **✅ Payment Flow** - Full PayPal integration with cart, bills, and webhooks

Run the test commands above to verify each integration works correctly.
