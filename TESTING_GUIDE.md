# Clean J Shipping - Complete Testing Guide

## Table of Contents
1. [Public Pages](#public-pages)
2. [Admin Workflow](#admin-workflow)
3. [Customer Workflow](#customer-workflow)
4. [Warehouse Staff Workflow](#warehouse-staff-workflow)
5. [API Endpoints Testing](#api-endpoints-testing)

---

## Public Pages

### 1. Homepage (`/`)
- **URL**: `http://localhost:3000/` or your domain
- **Description**: Landing page with hero section, services overview
- **Test Steps**:
  1. Visit homepage
  2. Check hero slider displays
  3. Verify service cards (Air Freight, Ocean Freight, Local Delivery)
  4. Test navigation links
  5. Check contact form functionality

### 2. Services Page (`/services`)
- **URL**: `/services`
- **Description**: Detailed service information
- **Test Steps**:
  1. Navigate to services page
  2. Verify all service types are displayed
  3. Check pricing information
  4. Test service comparison

### 3. Rates Page (`/rates`)
- **URL**: `/rates`
- **Description**: Shipping rates calculator
- **Test Steps**:
  1. Visit rates page
  2. Enter package details (weight, dimensions, destination)
  3. Calculate shipping cost
  4. Verify rate calculation is accurate

### 4. About Us Page (`/about-us`)
- **URL**: `/about-us`
- **Description**: Company information
- **Test Steps**:
  1. Navigate to about page
  2. Verify company information displays
  3. Check team section

### 5. Contact Page (`/contact`)
- **URL**: `/contact`
- **Description**: Contact form and information
- **Test Steps**:
  1. Visit contact page
  2. Fill out contact form
  3. Submit and verify submission

### 6. Customs Policy Page (`/customs-policy`)
- **URL**: `/customs-policy`
- **Description**: Customs and shipping policies
- **Test Steps**:
  1. Navigate to customs policy
  2. Verify policy information displays correctly

### 7. Track Package (`/track` or `/tracking`)
- **URL**: `/track` or `/tracking`
- **Description**: Public package tracking
- **Test Steps**:
  1. Enter tracking number
  2. View package status
  3. Verify tracking history displays

### 8. Search Page (`/search`)
- **URL**: `/search`
- **Description**: Search functionality
- **Test Steps**:
  1. Enter search query
  2. Verify results display

---

## Admin Workflow

### Prerequisites
- Admin account credentials
- Access to admin panel

### 1. Admin Login (`/login`)
- **URL**: `/login`
- **Test Steps**:
  1. Navigate to `/login`
  2. Enter admin email and password
  3. Click "Login"
  4. Verify redirect to `/admin` dashboard
  5. Check session is maintained

### 2. Admin Dashboard (`/admin`)
- **URL**: `/admin`
- **Description**: Main admin dashboard with statistics
- **Test Steps**:
  1. Verify dashboard loads
  2. Check statistics cards display:
     - Total Packages
     - Total Customers
     - Total Revenue
     - Pending Bills
  3. Verify quick action cards work
  4. Check recent activity section
  5. Test navigation to other admin pages

### 3. Admin Packages Management (`/admin/packages`)
- **URL**: `/admin/packages`
- **Test Steps**:
  1. View all packages list
  2. Test search functionality
  3. Test filter by status
  4. Click "View" on a package - verify modal opens
  5. Verify package details display correctly:
     - Sender country (not defaulting to Jamaica)
     - Recipient country
     - All package information
  6. Test "Edit" package
  7. Test "Delete" package (with confirmation)
  8. Verify package export functionality

### 4. Add Package (`/admin/add-package`)
- **URL**: `/admin/add-package`
- **Test Steps**:
  1. Navigate to add package page
  2. Fill in package details:
     - Tracking number
     - Customer (select from dropdown)
     - Weight, dimensions
     - Sender information (with country)
     - Recipient information (with country)
     - Item value
  3. Submit package
  4. **Verify**:
     - Package is created
     - Invoice is auto-generated
     - Email is sent to customer (with invoice PDF attachment)
     - Inventory is deducted
  5. Check customer receives email with invoice PDF

### 5. Admin Customers (`/admin/customers`)
- **URL**: `/admin/customers`
- **Test Steps**:
  1. View customers list
  2. Test search by name/email/userCode
  3. Click "Add Customer" button
  4. Fill customer form:
     - First Name, Last Name
     - Email
     - Password
     - Phone
     - Address (with country)
  5. Submit
  6. **Verify**:
     - Customer is created
     - Welcome email is sent to customer
     - Customer code is generated
  7. Test edit customer
  8. Test delete customer

### 6. Admin Staff Management (`/admin/staff`)
- **URL**: `/admin/staff`
- **Test Steps**:
  1. View staff list
  2. Click "Add Staff" button
  3. Fill staff form:
     - First Name, Last Name
     - Email
     - Password
     - Branch/Warehouse
     - Phone
  4. Submit
  5. **Verify**:
     - Staff is created
     - Welcome email is sent with credentials
     - Staff can login with provided credentials

### 7. Admin Invoices (`/admin/invoices`)
- **URL**: `/admin/invoices`
- **Test Steps**:
  1. View invoices list
  2. Verify invoice format matches customer bills page
  3. Test filter by status/type
  4. Test search invoices
  5. Click on invoice to view details
  6. Verify invoice ID format (e.g., `INV-2024-0001`)
  7. Test invoice generation
  8. Test invoice download/export

### 8. Admin Bills (`/admin/bills`)
- **URL**: `/admin/bills`
- **Test Steps**:
  1. View bills list
  2. Test create new bill
  3. Test pay bill (with test card)
  4. Verify payment processing
  5. Check bill status updates

### 9. Admin Transactions (`/admin/transactions`)
- **URL**: `/admin/transactions`
- **Test Steps**:
  1. View transactions list
  2. **Verify**: All customer payments appear here
  3. Test filter by type (payment/POS)
  4. Test filter by status
  5. Test search transactions
  6. Verify transaction details display correctly
  7. Check transaction reconciliation

### 10. Admin Shipments (`/admin/shipments`)
- **URL**: `/admin/shipments`
- **Test Steps**:
  1. View manifests list
  2. Click "Create Manifest" button
  3. **Verify**: Manifest form opens as **popup modal** (not inline)
  4. Fill manifest form:
     - Manifest ID (auto-generated)
     - Title
     - Transport Mode (Air/Sea/Land)
     - Batch Date
     - Add shipment rows (tracking numbers)
  5. Submit manifest
  6. **Verify**: 
     - Manifest is created
     - Modal closes after submission
     - Manifest appears in list
  7. Test edit manifest
  8. Test delete manifest
  9. Test search/filter manifests

### 11. Admin Pre-Alerts (`/admin/pre-alerts`)
- **URL**: `/admin/pre-alerts`
- **Test Steps**:
  1. View pre-alerts list
  2. Test approve/reject pre-alerts
  3. Test create pre-alert manually

### 12. Admin Broadcasts (`/admin/broadcasts`)
- **URL**: `/admin/broadcasts`
- **Test Steps**:
  1. View broadcasts list
  2. Click "Create Broadcast"
  3. Fill broadcast form:
     - Subject
     - Message body
     - Select recipients (all customers or specific)
  4. Submit
  5. **Verify**: 
     - Broadcast is sent
     - Customers receive broadcast in messages
     - Customers can view but not reply to broadcasts

### 13. Admin Reporting (`/admin/reporting`)
- **URL**: `/admin/reporting`
- **Test Steps**:
  1. View reports dashboard
  2. Test date range filters
  3. Test export reports
  4. Verify charts and statistics

### 14. Admin Rate Calculator (`/admin/rate-calculator`)
- **URL**: `/admin/rate-calculator`
- **Test Steps**:
  1. Enter package details
  2. Calculate shipping cost
  3. Verify calculation accuracy

### 15. Admin Settings (`/admin/settings`)
- **URL**: `/admin/settings`
- **Test Steps**:
  1. View system settings
  2. Test update settings
  3. Verify changes are saved

### 16. Admin Profile (`/admin/profile`)
- **URL**: `/admin/profile`
- **Test Steps**:
  1. View profile information
  2. Test update profile
  3. Test change password

---

## Customer Workflow

### Prerequisites
- Customer account (create via admin or register)

### 1. Customer Registration (`/register`)
- **URL**: `/register`
- **Test Steps**:
  1. Navigate to register page
  2. Fill registration form:
     - First Name, Last Name
     - Email
     - Password
     - Phone
     - Address
  3. Submit
  4. Verify email verification (if enabled)
  5. Complete registration steps

### 2. Customer Login (`/login`)
- **URL**: `/login`
- **Test Steps**:
  1. Enter customer email and password
  2. Click "Login"
  3. Verify redirect to `/customer/dashboard`

### 3. Customer Dashboard (`/customer/dashboard`)
- **URL**: `/customer/dashboard`
- **Test Steps**:
  1. Verify dashboard loads
  2. Check statistics:
     - Total Packages
     - Active Shipments
     - Pending Bills
     - Unread Messages
  3. Test package tracking widget
  4. View recent packages
  5. View pending payments

### 4. Customer Packages (`/customer/packages`)
- **URL**: `/customer/packages`
- **Test Steps**:
  1. View packages list
  2. Test search packages
  3. Test filter by status
  4. Click "View" on a package
  5. **Verify**:
     - Sender country displays correctly (not Jamaica by default)
     - Recipient country displays correctly
     - All package details are accurate
  6. Test track package
  7. Test download invoice (if available)

### 5. Customer Invoice Upload (`/customer/invoice-upload`)
- **URL**: `/customer/invoice-upload`
- **Test Steps**:
  1. View packages requiring invoice upload
  2. Select a package
  3. Upload invoice file (PDF, JPG, PNG)
  4. Fill invoice details:
     - Price paid
     - Currency
     - Description
     - Item details
  5. Submit
  6. **Verify**:
     - No 400 error occurs
     - Invoice uploads successfully
     - File is saved correctly
     - Package status updates

### 6. Customer Bills & Payments (`/customer/bills`)
- **URL**: `/customer/bills`
- **Test Steps**:
  1. View bills list
  2. **Verify**: Invoice ID format matches admin invoices (not `AUTO-INV-CJS-...`)
  3. Test search bills
  4. Test filter by status
  5. Click "Pay Now" on a bill
  6. **Test Payment Methods**:
   
   **A. Test Card Payment:**
   - Select "Card" payment
   - Enter test card: `4242 4242 4242 4242`
   - Enter expiry: `12/25`
   - Enter CVV: `123`
   - Enter cardholder name
   - Click "Pay"
   - **Verify**: 
     - Payment processes successfully (no 404 error)
     - Payment appears in admin transactions
     - Bill status updates to "paid"
     - Receipt email is sent
   
   **B. PayPal Payment:**
   - Select "PayPal" payment
   - Complete PayPal flow
   - **Verify**: Payment processes correctly
   
7. View payment history
8. Test export bills history

### 7. Customer Messages (`/customer/messages`)
- **URL**: `/customer/messages`
- **Test Steps**:
  1. View messages page
  2. **Test Broadcast Messages**:
     - View broadcast messages from admin
     - Verify can read but not reply
     - Test dismiss broadcast
   
  3. **Test Team Conversation**:
     - Click "New Message" or select "Support Team"
     - Type message to warehouse staff
     - Send message
     - **Verify**: 
       - Message is sent
       - Warehouse staff can see message in `/warehouse/messages`
       - Can receive replies from warehouse staff
   
  4. Test search conversations
  5. Verify real-time updates (auto-refresh)

### 8. Customer FAQ (`/customer/faq`)
- **URL**: `/customer/faq`
- **Test Steps**:
  1. View FAQ page
  2. **Verify**: FAQ data is displayed (after seeding)
  3. Test search FAQs
  4. Test filter by category:
     - Shipping & Delivery
     - Rates & Pricing
     - Policies & Terms
     - Account Management
     - General Questions
  5. Expand/collapse FAQ items
  6. Test helpful/not helpful buttons

### 9. Customer Support (`/customer/support`)
- **URL**: `/customer/support`
- **Test Steps**:
  1. View support tickets
  2. Create new support ticket
  3. View ticket status
  4. Test ticket updates

### 10. Customer Pre-Alerts (`/customer/pre-alerts`)
- **URL**: `/customer/pre-alerts`
- **Test Steps**:
  1. View pre-alerts list
  2. Create new pre-alert
  3. Fill pre-alert form:
     - Tracking number
     - Carrier
     - Origin
     - Expected date
  4. Submit
  5. Verify pre-alert is created
  6. Test edit/delete pre-alert

### 11. Customer Addresses (`/customer/addresses`)
- **URL**: `/customer/addresses`
- **Test Steps**:
  1. View shipping addresses
  2. Add new address
  3. Edit address
  4. Delete address
  5. Set default address

### 12. Customer Profile (`/customer/profile`)
- **URL**: `/customer/profile`
- **Test Steps**:
  1. View profile information
  2. Update personal information
  3. Change password
  4. Update preferences

### 13. Customer Archives (`/customer/archives`)
- **URL**: `/customer/archives`
- **Test Steps**:
  1. View archived packages
  2. View archived messages
  3. Test restore from archive

### 14. Customer Checkout (`/customer/checkout`)
- **URL**: `/customer/checkout`
- **Test Steps**:
  1. Add packages to cart from bills page
  2. Navigate to checkout
  3. Review cart items
  4. Process payment
  5. Verify payment success

---

## Warehouse Staff Workflow

### Prerequisites
- Warehouse staff account (created by admin)

### 1. Warehouse Login (`/login`)
- **URL**: `/login`
- **Test Steps**:
  1. Enter warehouse staff email and password
  2. Click "Login"
  3. Verify redirect to `/warehouse` dashboard

### 2. Warehouse Dashboard (`/warehouse`)
- **URL**: `/warehouse`
- **Test Steps**:
  1. Verify dashboard loads
  2. Check warehouse statistics
  3. View recent packages
  4. Test quick actions

### 3. Warehouse Packages (`/warehouse/packages`)
- **URL**: `/warehouse/packages`
- **Test Steps**:
  1. View packages list
  2. Test search packages
  3. Test filter by status
  4. Click "View" on a package
  5. **Verify**:
     - Sender country displays correctly
     - Recipient country displays correctly
     - All package information is accurate
  6. Test update package status
  7. Test edit package

### 4. Add Package (`/warehouse/add-package`)
- **URL**: `/warehouse/add-package`
- **Test Steps**:
  1. Navigate to add package page
  2. Fill package details:
     - User Code (customer code)
     - Tracking number
     - Weight, dimensions
     - Sender information (with country)
     - Recipient information (with country)
     - Item value
  3. Submit package
  4. **Verify**:
     - Package is created
     - **Invoice is auto-generated** (same as admin)
     - Email is sent to customer (with invoice PDF attachment)
     - Inventory is deducted
  5. Check customer receives email with invoice

### 5. Warehouse Bulk Upload (`/warehouse/bulk-upload`)
- **URL**: `/warehouse/bulk-upload`
- **Test Steps**:
  1. Upload CSV file with packages
  2. Verify packages are imported
  3. Check for errors

### 6. Warehouse Manifests (`/warehouse/manifests`)
- **URL**: `/warehouse/manifests`
- **Test Steps**:
  1. View manifests list
  2. Test view manifest details
  3. Test add packages to manifest

### 7. Warehouse Inventory (`/warehouse/inventory`)
- **URL**: `/warehouse/inventory`
- **Test Steps**:
  1. View inventory items
  2. Check stock levels
  3. Test add inventory
  4. Test update inventory
  5. View inventory transactions

### 8. Warehouse Customers (`/warehouse/customers`)
- **URL**: `/warehouse/customers`
- **Test Steps**:
  1. View customers list
  2. Test search customers
  3. View customer details
  4. View customer packages

### 9. Warehouse Messages (`/warehouse/messages`) ⭐ NEW
- **URL**: `/warehouse/messages`
- **Description**: Receive and reply to customer messages
- **Test Steps**:
  1. Navigate to messages page
  2. **Verify**: Customer messages appear in conversations list
  3. Select a customer conversation
  4. View message thread
  5. Type reply message
  6. Send reply
  7. **Verify**:
     - Message is sent to customer
     - Customer receives reply in their messages
     - Conversation updates in real-time
  8. Test mark messages as read
  9. Test search conversations

### 10. Warehouse Reports (`/warehouse/reports`)
- **URL**: `/warehouse/reports`
- **Test Steps**:
  1. View warehouse reports
  2. Test date filters
  3. Test export reports

### 11. Warehouse Settings (`/warehouse/settings`)
- **URL**: `/warehouse/settings`
- **Test Steps**:
  1. View warehouse settings
  2. Test update settings

### 12. Warehouse Account (`/warehouse/account`)
- **URL**: `/warehouse/account`
- **Test Steps**:
  1. View account information
  2. Test update profile
  3. Test change password

---

## API Endpoints Testing

### Admin API Endpoints

#### 1. Admin Packages API
- **GET** `/api/admin/packages`
  - Test: Fetch all packages
  - Verify: Returns packages list with pagination
  
- **POST** `/api/admin/packages`
  - Test: Create new package
  - Verify: Package created, invoice auto-generated, email sent with PDF

- **PUT** `/api/admin/packages`
  - Test: Update package
  - Verify: Package updated, status change emails sent

#### 2. Admin Customers API
- **GET** `/api/admin/customers`
  - Test: Fetch all customers
  - Verify: Returns customers list

- **POST** `/api/admin/customers`
  - Test: Create customer
  - Verify: Customer created, welcome email sent

- **PUT** `/api/admin/customers`
  - Test: Update customer
  - Verify: Customer updated

- **DELETE** `/api/admin/customers`
  - Test: Delete customer
  - Verify: Customer deleted

#### 3. Admin Staff API
- **GET** `/api/admin/staff`
  - Test: Fetch all staff
  - Verify: Returns staff list

- **POST** `/api/admin/staff`
  - Test: Create staff
  - Verify: Staff created, welcome email sent with credentials

#### 4. Admin Invoices API
- **GET** `/api/admin/invoices`
  - Test: Fetch all invoices
  - Verify: Returns invoices with proper format

- **POST** `/api/admin/invoices`
  - Test: Create invoice
  - Verify: Invoice created

#### 5. Admin Transactions API
- **GET** `/api/admin/transactions`
  - Test: Fetch all transactions
  - Verify: Returns Payment and POS transactions
  - **Verify**: Customer payments appear here

#### 6. Admin Shipments API
- **POST** `/api/admin/shipments/manifests/update`
  - Test: Create/update manifest
  - Verify: Manifest saved successfully

#### 7. Admin Broadcasts API
- **POST** `/api/admin/broadcast-messages`
  - Test: Send broadcast
  - Verify: Broadcast sent to all customers

### Customer API Endpoints

#### 1. Customer Packages API
- **GET** `/api/customer/packages`
  - Test: Fetch customer packages
  - Verify: Returns only customer's packages

#### 2. Customer Bills API
- **GET** `/api/customer/bills`
  - Test: Fetch customer bills
  - Verify: Invoice ID format matches admin format

#### 3. Customer Invoice Upload API
- **POST** `/api/customer/invoice-upload`
  - Test: Upload invoice file
  - **Verify**: No 400 error
  - Verify: File uploaded successfully
  - Verify: Invoice record created

#### 4. Customer Payments API
- **GET** `/api/customer/payments`
  - Test: Fetch payment history
  - Verify: Returns customer payments

- **POST** `/api/customer/payments`
  - Test: Process payment
  - **Test Card Payment**:
    - Send: `{ trackingNumber, amount, currency, paymentMethod: "card", cardDetails }`
    - Use test card: `4242 4242 4242 4242`
    - **Verify**: 
      - No 404 error
      - Payment processes successfully
      - Transaction appears in admin/transactions
      - Payment receipt email sent
  
  - **PayPal Payment**:
    - Send: `{ trackingNumber, amount, currency, paymentMethod: "paypal", paypalOrderId }`
    - Verify: Payment processes correctly

#### 5. Customer Messages API
- **GET** `/api/customer/messages`
  - Test: Fetch messages
  - Verify: Returns broadcasts and team conversations

- **POST** `/api/customer/messages`
  - Test: Send message to warehouse staff
  - Verify: Message created, warehouse staff can see it

#### 6. Customer FAQ API
- **GET** `/api/customer/faq`
  - Test: Fetch FAQs
  - Verify: Returns FAQs grouped by category (after seeding)

### Warehouse API Endpoints

#### 1. Warehouse Packages API
- **GET** `/api/warehouse/packages`
  - Test: Fetch warehouse packages
  - Verify: Returns packages for warehouse

- **POST** `/api/warehouse/packages/add`
  - Test: Add package
  - **Verify**: 
    - Package created
    - Invoice auto-generated
    - Email sent with PDF attachment
    - Inventory deducted

#### 2. Warehouse Messages API ⭐ NEW
- **GET** `/api/warehouse/messages`
  - Test: Fetch customer conversations
  - Verify: Returns conversations grouped by customer

- **POST** `/api/warehouse/messages`
  - Test: Reply to customer
  - Verify: Message sent, customer receives reply

- **PUT** `/api/warehouse/messages`
  - Test: Mark message as read
  - Verify: Message status updated

---

## Complete Workflow Testing

### Workflow 1: Admin Creates Customer → Customer Receives Email
1. Admin logs in → `/admin`
2. Navigate to Customers → `/admin/customers`
3. Click "Add Customer"
4. Fill form and submit
5. **Verify**: Customer receives welcome email

### Workflow 2: Admin Creates Staff → Staff Receives Email
1. Admin logs in → `/admin`
2. Navigate to Staff → `/admin/staff`
3. Click "Add Staff"
4. Fill form and submit
5. **Verify**: Staff receives welcome email with credentials

### Workflow 3: Admin Adds Package → Invoice Auto-Created → Email with PDF
1. Admin logs in → `/admin`
2. Navigate to Add Package → `/admin/add-package`
3. Fill package form (with correct countries)
4. Submit
5. **Verify**:
   - Package created
   - Invoice auto-generated
   - Customer receives email with invoice PDF attachment
   - Invoice ID format is correct

### Workflow 4: Warehouse Staff Adds Package → Invoice Auto-Created → Email with PDF
1. Warehouse staff logs in → `/warehouse`
2. Navigate to Add Package → `/warehouse/add-package`
3. Fill package form
4. Submit
5. **Verify**:
   - Package created
   - Invoice auto-generated (same as admin)
   - Customer receives email with invoice PDF attachment

### Workflow 5: Customer Views Package → Correct Country Display
1. Customer logs in → `/customer`
2. Navigate to Packages → `/customer/packages`
3. Click "View" on a package
4. **Verify**:
   - Sender country displays correctly (not Jamaica default)
   - Recipient country displays correctly
   - All information is accurate

### Workflow 6: Customer Uploads Invoice → No 400 Error
1. Customer logs in → `/customer`
2. Navigate to Invoice Upload → `/customer/invoice-upload`
3. Select package
4. Upload invoice file (PDF/JPG/PNG)
5. Fill invoice details
6. Submit
7. **Verify**: No 400 error, upload successful

### Workflow 7: Customer Pays Bill → Test Card → Transaction Appears
1. Customer logs in → `/customer`
2. Navigate to Bills → `/customer/bills`
3. Click "Pay Now" on a bill
4. Select "Card" payment
5. Enter test card: `4242 4242 4242 4242`
6. Enter card details
7. Submit payment
8. **Verify**:
   - No 404 error
   - Payment successful
   - Transaction appears in `/admin/transactions`
   - Bill status updates to "paid"
   - Receipt email sent

### Workflow 8: Customer Sends Message → Warehouse Receives → Warehouse Replies
1. Customer logs in → `/customer`
2. Navigate to Messages → `/customer/messages`
3. Select "Support Team" conversation
4. Type message
5. Send
6. **Verify**: Message sent
7. Warehouse staff logs in → `/warehouse`
8. Navigate to Messages → `/warehouse/messages`
9. **Verify**: Customer message appears
10. Select conversation
11. Type reply
12. Send
13. **Verify**: Customer receives reply

### Workflow 9: Admin Creates Broadcast → Customer Receives
1. Admin logs in → `/admin`
2. Navigate to Broadcasts → `/admin/broadcasts`
3. Create broadcast message
4. Send to all customers
5. Customer logs in → `/customer`
6. Navigate to Messages → `/customer/messages`
7. **Verify**: Broadcast appears (can read, cannot reply)

### Workflow 10: Admin Creates Manifest → Popup Modal
1. Admin logs in → `/admin`
2. Navigate to Shipments → `/admin/shipments`
3. Click "Create Manifest"
4. **Verify**: Form opens as **popup modal** (not inline)
5. Fill manifest form
6. Submit
7. **Verify**: Modal closes, manifest created

### Workflow 11: FAQ Data Display
1. Run FAQ seed script: `node scripts/seed-faqs.js`
2. Customer logs in → `/customer`
3. Navigate to FAQ → `/customer/faq`
4. **Verify**: FAQs are displayed by category
5. Test search
6. Test category filter

---

## Testing Checklist

### Email Functionality
- [ ] Customer welcome email sent when admin creates customer
- [ ] Staff welcome email sent when admin creates staff
- [ ] Package notification email sent when package is added
- [ ] Invoice PDF attached to package notification email
- [ ] Payment receipt email sent after payment

### Package View Country Display
- [ ] Admin package view shows correct sender country
- [ ] Admin package view shows correct recipient country
- [ ] Customer package view shows correct sender country
- [ ] Customer package view shows correct recipient country
- [ ] Warehouse package view shows correct sender country
- [ ] Warehouse package view shows correct recipient country

### Invoice Functionality
- [ ] Invoice auto-created when admin adds package
- [ ] Invoice auto-created when warehouse adds package
- [ ] Invoice ID format matches in customer bills and admin invoices
- [ ] Invoice PDF generated correctly
- [ ] Invoice PDF attached to email

### Payment Functionality
- [ ] Test card payment works (no 404 error)
- [ ] Payment appears in admin transactions
- [ ] PayPal payment works correctly
- [ ] Payment receipt email sent

### Message Functionality
- [ ] Customer can send message to warehouse
- [ ] Warehouse staff can see customer messages
- [ ] Warehouse staff can reply to customer
- [ ] Customer receives warehouse reply
- [ ] Broadcast messages work (admin sends, customer receives, cannot reply)

### Manifest Functionality
- [ ] Manifest creation opens as popup modal
- [ ] Manifest can be created successfully
- [ ] Manifest form resets after submission

### FAQ Functionality
- [ ] FAQ data is seeded
- [ ] FAQs display correctly
- [ ] Search works
- [ ] Category filter works

---

## Environment Setup for Testing

### Required Environment Variables
```env
# Database
MONGODB_URI=your_mongodb_connection_string
DATABASE_URL=your_mongodb_connection_string

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_FROM=Clean J Shipping <noreply@cleanjshipping.com>

# PayPal (for testing)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id

# App Configuration
NEXT_PUBLIC_APP_NAME=Clean J Shipping
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running FAQ Seed Script
```bash
node scripts/seed-faqs.js
```

### Test Accounts
- **Admin**: Use admin credentials created via `/api/create-admin` or admin panel
- **Customer**: Create via admin panel or registration
- **Warehouse Staff**: Create via admin panel

---

## Common Issues and Solutions

### Issue: Email not sending
**Solution**: 
- Check EMAIL_USER and EMAIL_PASSWORD are set
- Verify Gmail app password is used (not regular password)
- Check email service logs

### Issue: Country shows "Jamaica" by default
**Solution**: 
- Verify package has senderCountry/receiverCountry fields populated
- Check package creation includes country information
- Verify package view checks both direct fields and nested objects

### Issue: Invoice not auto-created for warehouse packages
**Solution**: 
- Verify `createBillingInvoice` function is called
- Check invoice creation doesn't fail silently
- Verify invoice is linked to package

### Issue: Payment 404 error
**Solution**: 
- Verify `/api/customer/payments` endpoint exists
- Check payment method handling (card vs paypal)
- Verify test card validation

### Issue: Transactions not showing
**Solution**: 
- Verify Payment records are created with correct status
- Check transaction API fetches both Payment and POS transactions
- Verify user ID is set correctly in Payment records

---

## Notes

- All endpoints should be tested with proper authentication
- Use test card numbers for payment testing (4242 4242 4242 4242)
- Verify email delivery in email inbox (check spam folder)
- Check browser console for any JavaScript errors
- Verify database records are created correctly
- Test on different browsers (Chrome, Firefox, Safari)
- Test responsive design on mobile devices

---

**Last Updated**: After completing all fixes
**Version**: 1.0

