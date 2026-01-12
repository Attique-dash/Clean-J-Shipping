# Invoice Upload Page - How It Works

## Overview
The Invoice Upload page (`/customer/invoice-upload`) allows customers to upload commercial invoices and enter price information for their packages. This is used for customs clearance and billing purposes.

## How It Works

### 1. **Package Selection**
- Only packages with status "received", "in_processing", "pending", "processing", "in_transit", or "shipped" are shown
- Packages that already have invoices uploaded are marked with a green "Invoice Uploaded" badge

### 2. **Required Information**
When uploading an invoice, customers must provide:
- **Price Paid**: The amount paid for the items in the package (required, must be > 0)
- **Currency**: The currency in which the price was paid (defaults to USD)
- **Invoice Files**: At least one file (PDF, JPG, PNG, DOC, DOCX) up to 10MB each

### 3. **Optional Information**
Customers can also provide:
- Item description
- Item category
- Item quantity
- HS Code (Harmonized System code for customs)
- Declared value
- Supplier name and address
- Purchase date

### 4. **What Happens After Upload**

#### When Files and Price Are Submitted:
1. **File Validation**: Files are validated for type and size on both client and server
2. **File Storage**: Valid files are saved to `/public/uploads/invoices/` with unique filenames
3. **Invoice Record Creation**: 
   - A new Invoice record is created (or existing one is updated) with:
     - Invoice type: "commercial" (for customs purposes)
     - Status: "submitted"
     - All provided metadata
     - Links to uploaded files
4. **Package Update**: The package's `invoice_status` is set to "uploaded" and `invoice_uploaded_date` is recorded
5. **Success Notification**: Customer receives a success message and the page refreshes to show updated status

### 5. **Invoice Processing Flow**
- **Submitted**: Invoice is uploaded and awaiting admin review
- **Reviewed**: Admin has reviewed the invoice
- **Approved/Rejected**: Admin makes a decision on the invoice
- **Used for Customs**: Approved invoices are used for customs clearance
- **Billing**: Invoice information may be used to generate billing invoices

### 6. **File Management**
- Files are stored permanently in the uploads directory
- Each file is renamed with format: `{trackingNumber}_{timestamp}_{originalName}`
- Files are linked to the invoice record for easy retrieval

### 7. **Currency Handling**
- All amounts are stored in the currency specified by the customer
- The system defaults to USD if no currency is specified
- Currency conversion is handled by the CurrencyContext when displaying amounts

## Technical Details

### API Endpoint
- **POST** `/api/customer/invoice-upload`
- Accepts FormData with:
  - `upload_0`: JSON string containing invoice metadata
  - `files_0`, `files_1`, etc.: File objects

### Database Updates
- Creates/updates Invoice document in MongoDB
- Updates Package document with invoice status
- Stores file metadata in Invoice.files array

### Error Handling
- Invalid file types are rejected
- Files exceeding 10MB are rejected
- Missing required fields (price_paid, currency) are rejected
- Package ownership is verified before allowing upload

## User Experience
1. Customer sees list of packages requiring invoice upload
2. For each package, customer enters price paid and selects currency
3. Customer drags & drops or clicks to upload invoice files
4. Customer clicks "Upload Invoice" button
5. System validates and processes the upload
6. Success message is shown and package status updates
7. Package now shows "Invoice Uploaded" badge
