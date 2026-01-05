# 📋 Complete Invoice System Testing Guide

## 🎯 **System Overview**
The invoice system has been cleaned up and streamlined. Here's what's working:

### **✅ Active Components**
- **Customer Invoice Upload** (`/customer/invoice-upload`) - Enhanced with customs fields
- **Admin Invoice Management** (`/admin/invoices`) - Professional invoice generator
- **Bills System** (`/admin/bills` & `/customer/bills`) - Unified billing
- **Warehouse Receiving** (`/admin/warehouse`) - Package receiving with email alerts
- **Package Management** (`/admin/packages` & `/customer/packages`) - Real-time updates

### **❌ Removed Components**
- `test-invoice/page.js` - Outdated test page
- `utils/invoiceGenerator.ts` - Basic utility (replaced by proper system)
- `models/GeneratedInvoice.ts` - Duplicate invoice model

---

## 🧪 **Testing Instructions**

### **1. Warehouse Receiving Test**
```bash
# Navigate to warehouse receiving
http://localhost:3000/admin/warehouse

# Test Steps:
1. Enter tracking number: TEST123456
2. Enter customer code: CUST001
3. Enter weight: 2.5
4. Select shipper: FedEx
5. Add description: Test package
6. Click "Receive Package"

# Expected Results:
✅ Package saved to database
✅ Email sent to customer
✅ Package appears in customer portal
```

### **2. Customer Invoice Upload Test**
```bash
# Navigate to invoice upload
http://localhost:3000/customer/invoice-upload

# Test Steps:
1. Select received package from dropdown
2. Enter price paid: 100.00
3. Fill in customs details:
   - Item Description: Electronics
   - Category: Electronics
   - Quantity: 1
   - Declared Value: 100.00
   - Supplier: Amazon
4. Upload invoice PDF
5. Click "Add to Upload List"
6. Click "Upload All"

# Expected Results:
✅ Invoice saved with all customs fields
✅ Package status updated
✅ File uploaded successfully
```

### **3. Admin Invoice Management Test**
```bash
# Navigate to admin invoices
http://localhost:3000/admin/invoices

# Test Steps:
1. Click "Generate Invoice"
2. Fill customer details
3. Add line items
4. Set amounts and taxes
5. Save invoice

# Expected Results:
✅ Invoice created with proper numbering
✅ PDF generation works
✅ Email sent to customer
```

### **4. Bills/Payments Test**
```bash
# Test customer bills
http://localhost:3000/customer/bills

# Test admin bills
http://localhost:3000/admin/bills

# Expected Results:
✅ All invoices appear as bills
✅ Payment status correct
✅ Currency conversion works
```

---

## 🔧 **API Endpoints to Test**

### **Customer Endpoints**
```bash
# Get customer packages
GET /api/customer/packages

# Upload invoice
POST /api/customer/invoice-upload
{
  "tracking_number": "TEST123456",
  "price_paid": 100.00,
  "currency": "USD",
  "item_description": "Test item",
  "declared_value": 100.00,
  "supplier_name": "Test Supplier"
}

# Get customer bills
GET /api/customer/bills
```

### **Admin Endpoints**
```bash
# Get all packages
GET /api/admin/packages

# Receive package
POST /api/admin/receivals
{
  "trackingNumber": "TEST123456",
  "userCode": "CUST001",
  "weight": 2.5,
  "shipper": "FedEx",
  "receivedBy": "Admin User",
  "warehouse": "Main Warehouse"
}

# Get invoices
GET /api/admin/invoices

# Create invoice
POST /api/admin/invoices
{
  "customer": {
    "id": "customer_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "items": [{
    "description": "Test item",
    "quantity": 1,
    "unitPrice": 100.00,
    "taxRate": 15
  }]
}

# Get bills
GET /api/admin/bills
```

---

## 📊 **Database Schema**

### **Invoice Model Fields**
```typescript
interface IInvoice {
  invoiceNumber: string;
  customer: CustomerInfo;
  items: InvoiceItem[];
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  
  // Customer upload fields
  tracking_number?: string;
  item_description?: string;
  item_category?: string;
  item_quantity?: number;
  hs_code?: string;
  declared_value?: number;
  supplier_name?: string;
  supplier_address?: string;
  purchase_date?: string;
  files?: InvoiceFile[];
  upload_date?: Date;
}
```

### **Package Model Fields**
```typescript
interface IPackage {
  trackingNumber: string;
  status: string;
  weight: number;
  dimensions: Dimensions;
  
  // Warehouse receiving fields
  warehouseLocation?: string;
  dateReceived?: Date;
  receivedBy?: string;
  shipper?: string;
  entryStaff?: string;
  branch?: string;
}
```

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Invoice Upload Fails**
```bash
# Check: Email configuration
echo $EMAIL_USER
echo $EMAIL_PASS

# Check: File permissions
ls -la public/uploads/invoices/

# Fix: Create directory
mkdir -p public/uploads/invoices
chmod 755 public/uploads/invoices
```

#### **2. Email Not Sending**
```bash
# Check Gmail settings
# Enable 2FA on Gmail account
# Generate App Password
# Update .env file:
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### **3. Database Connection Issues**
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/clean-j-shipping"

# Check environment
echo $MONGODB_URI
```

#### **4. PDF Generation Issues**
```bash
# Install dependencies
npm install puppeteer
npm install @types/puppeteer

# Check PDF directory
ls -la public/invoices/
```

---

## ✅ **Success Criteria**

### **Warehouse Receiving**
- [ ] Package received successfully
- [ ] Customer email sent
- [ ] Package appears in customer portal
- [ ] Warehouse data saved correctly

### **Invoice Upload**
- [ ] Invoice uploaded with all fields
- [ ] File saved to filesystem
- [ ] Package status updated
- [ ] Customs information stored

### **Admin Management**
- [ ] Invoice created with proper numbering
- [ ] PDF generated successfully
- [ ] Payment tracking works
- [ ] Currency conversion accurate

### **Customer Experience**
- [ ] Bills display correctly
- [ ] Payment processing works
- [ ] Real-time updates functional
- [ ] Mobile responsive design

---

## 🎉 **Final Testing Checklist**

Before going to production, verify:

```bash
□ Test complete warehouse receiving workflow
□ Test customer invoice upload with all fields
□ Test admin invoice generation and PDF export
□ Test payment processing and status updates
□ Test email notifications for all events
□ Test currency conversion and display
□ Test mobile responsiveness
□ Test error handling and validation
□ Test file upload limits and security
□ Test database consistency across all models
□ Test real-time updates and notifications
```
