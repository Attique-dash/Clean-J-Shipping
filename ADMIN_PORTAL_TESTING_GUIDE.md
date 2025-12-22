# Admin Portal Testing Guide

This guide provides comprehensive testing instructions for the Clean J Shipping admin portal, including all functionality and API endpoints for admin testing according to client requirements.

## Prerequisites

1. **Environment Setup**:
   - Ensure the development server is running: `npm run dev`
   - Database connections active (MongoDB + Prisma)
   - Valid admin user credentials

2. **Access URLs**:
   - Admin Portal: `http://localhost:3000/admin`
   - Admin Login: `http://localhost:3000/auth/signin`

## Admin Portal Features Testing

### 1. Admin Authentication

**Endpoint**: `/api/auth/signin` (NextAuth)

**How to Test**:
1. Navigate to `http://localhost:3000/auth/signin`
2. Enter admin credentials
3. Verify successful redirect to admin dashboard
4. Test logout functionality
5. Test session persistence

**Expected Result**: Authentication works and redirects to admin dashboard

---

### 2. Admin Dashboard (`/admin`)

**Endpoint**: `GET /api/admin/dashboard/stats`

**How to Test**:
1. Login to admin portal
2. Navigate to dashboard
3. Verify dashboard elements:
   - Welcome message and real-time data
   - Statistics cards (Total Revenue, Total Packages, Total Customers, Avg. Order Value)
   - Revenue overview chart area
   - Package status distribution
   - Recent activity feed
   - Quick action buttons

4. **Test Dashboard Tabs**:
   - Click "Overview" tab
   - Click "Revenue" tab
   - Click "Customers" tab
   - Verify data changes appropriately

5. **Test Quick Actions**:
   - Click "New Package" - should navigate to `/admin/packages`
   - Click "Generate Invoice" - should navigate to `/admin/invoices`
   - Click "Send Broadcast" - should navigate to `/admin/broadcasts`

6. **Test Export Functionality**:
   - Click "Export" button
   - Verify CSV download starts
   - Check file contains dashboard data

**Expected Result**: Dashboard loads with real-time statistics and all navigation works

---

### 3. Package Management (`/admin/packages`)

**Endpoints**:
- `GET /api/admin/packages` - List packages
- `POST /api/admin/packages` - Create package
- `PUT /api/admin/packages` - Update package
- `DELETE /api/admin/packages` - Delete package

**How to Test**:

1. **View Packages List**:
   - Navigate to `/admin/packages`
   - Verify package list loads with tracking numbers, customers, status
   - Check pagination controls
   - Test search functionality
   - Test status filtering

2. **Create New Package**:
   - Click "Add Package" button
   - Fill required fields:
     - Tracking number
     - Customer (search by ID or user code)
     - Weight
     - Description
     - Branch/location
   - Submit form
   - Verify package appears in list

3. **Update Package**:
   - Click edit button on any package
   - Modify fields (status, weight, description, location)
   - Save changes
   - Verify updates reflect in list

4. **Delete Package**:
   - Click delete button on any package
   - Confirm deletion
   - Verify package is marked as deleted (status: returned)

5. **Search and Filter**:
   - Test search by tracking number
   - Filter by status (pending, in_transit, delivered, etc.)
   - Test pagination with large datasets

**Expected Results**: Package CRUD operations work correctly, search/filter functions properly

---

### 4. Customer Management (`/admin/customers`)

**Endpoints**:
- `GET /api/admin/customers` - List customers
- `POST /api/admin/customers` - Create customer
- `PUT /api/admin/customers` - Update customer
- `DELETE /api/admin/customers` - Delete customer

**How to Test**:

1. **View Customers List**:
   - Navigate to `/admin/customers`
   - Verify customer list displays with names, emails, user codes
   - Test search by name, email, user code
   - Check pagination

2. **Create New Customer**:
   - Click "Add Customer" button
   - Fill customer information:
     - Name, email, phone
     - Address details
     - User code (auto-generated)
     - Branch assignment
   - Submit form
   - Verify customer appears in list

3. **Update Customer**:
   - Click edit button on any customer
   - Modify customer details
   - Save changes
   - Verify updates reflect

4. **Delete Customer**:
   - Click delete button on any customer
   - Confirm deletion
   - Verify customer is removed

5. **Customer Analytics**:
   - View customer statistics
   - Check active package counts
   - Test customer search filters

**Expected Results**: Customer management works with proper validation and data integrity

---

### 5. Invoice Management (`/admin/invoices`)

**Endpoints**:
- `GET /api/admin/invoices` - List invoices
- `POST /api/admin/invoices` - Generate invoice
- `PUT /api/admin/invoices` - Update invoice
- `DELETE /api/admin/invoices` - Delete invoice

**How to Test**:

1. **View Invoices List**:
   - Navigate to `/admin/invoices`
   - Verify invoice list displays with numbers, amounts, status
   - Test search by invoice number
   - Filter by status (draft, sent, paid, overdue)

2. **Generate New Invoice**:
   - Click "Generate Invoice" button
   - Select customer
   - Add line items with descriptions and amounts
   - Set due date
   - Preview invoice
   - Generate and save
   - Verify invoice appears in list

3. **Update Invoice**:
   - Click edit button on any invoice
   - Modify line items or details
   - Save changes
   - Verify updates reflect

4. **Send Invoice**:
   - Click "Send" on draft invoice
   - Verify email is sent to customer
   - Check invoice status updates to "sent"

5. **Print/Export Invoice**:
   - Click print button
   - Verify PDF generates correctly
   - Test export functionality

**Expected Results**: Invoice generation and management works with proper calculations

---

### 6. Bills Management (`/admin/bills`)

**Endpoints**:
- `GET /api/admin/bills` - List bills
- `POST /api/admin/bills` - Create bill
- `PUT /api/admin/bills` - Update bill

**How to Test**:

1. **View Bills List**:
   - Navigate to `/admin/bills`
   - Verify bills display with tracking numbers, amounts, status
   - Test search by tracking number
   - Filter by payment status

2. **Create Bill**:
   - Click "Create Bill" button
   - Select package/customer
   - Enter bill amount and details
   - Set due date
   - Generate bill
   - Verify bill appears in list

3. **Update Bill Status**:
   - Mark bill as paid
   - Add payment details
   - Verify status updates

**Expected Results**: Bill management integrates with package system correctly

---

### 7. Transactions (`/admin/transactions`)

**Endpoints**:
- `GET /api/admin/transactions` - List transactions
- `POST /api/admin/transactions` - Record transaction
- `GET /api/admin/transactions/[id]` - Get transaction details

**How to Test**:

1. **View Transactions List**:
   - Navigate to `/admin/transactions`
   - Verify transactions display with dates, amounts, methods
   - Test date range filtering
   - Filter by payment method

2. **Record New Transaction**:
   - Click "Record Transaction"
   - Select customer/package
   - Enter payment details
   - Choose payment method
   - Save transaction
   - Verify appears in list

3. **Transaction Details**:
   - Click on any transaction
   - Verify full details display
   - Check related package/customer info

**Expected Results**: Transaction tracking works with proper financial records

---

### 8. Shipments & Manifests (`/admin/shipments`)

**Endpoints**:
- `GET /api/admin/shipments` - List shipments
- `POST /api/admin/shipments` - Create shipment/manifest
- `PUT /api/admin/shipments` - Update shipment

**How to Test**:

1. **View Shipments List**:
   - Navigate to `/admin/shipments`
   - Verify shipments display with manifest numbers, dates
   - Test search by manifest number
   - Filter by status

2. **Create New Manifest**:
   - Click "Create Manifest" button
   - Select multiple packages
   - Set shipment details
   - Generate manifest
   - Verify manifest appears

3. **Update Shipment Status**:
   - Update shipment location
ernel
   - Mark as delivered
   - Verify status changes

**Expected Results**: Manifest creation works with package grouping

---

### 9. Broadcast Messages (`/admin/broadcasts`)

**Endpoints**:
- `GET /api/admin/broadcasts` - List broadcasts
- `POST /api/admin/broadcasts` - Send broadcast
- `GET /api/admin/broadcasts/[id]/stats` - Get broadcast stats

**How to Test**:

1. **View Broadcasts List**:
   - Navigate to `/admin/broadcasts`
   - Verify broadcasts display with titles, dates, reach
   - Check delivery statistics

2. **Send New Broadcast**:
   - Click "Send Broadcast" button
   - Compose message
   - Select recipients (all customers or filtered)
   - Schedule or send immediately
   - Verify broadcast appears in list

3. **Broadcast Analytics**:
   - View delivery statistics
   - Check open rates
   - Verify recipient lists

**Expected Results**: Broadcast system works with proper message delivery

---

### 10. Pre-Alerts Management (`/admin/pre-alerts`)

**Endpoints**:
- `GET /api/admin/pre-alerts` - List pre-alerts
- `POST /api/admin/pre-alerts` - Create pre-alert
- `PUT /api/admin/pre-alerts` - Update pre-alert

**How to Test**:

1. **View Pre-Alerts List**:
   - Navigate to `/admin/pre-alerts`
   - Verify pre-alerts display with tracking numbers, dates
   - Test search functionality

2. **Create Pre-Alert**:
   - Click "Create Pre-Alert" button
   - Enter tracking number
   - Set expected delivery date
   - Add description
   - Save pre-alert
   - Verify appears in list

3. **Update Pre-Alert**:
   - Modify pre-alert details
   - Update status
   - Verify changes reflect

**Expected Results**: Pre-alert system works with package notifications

---

### 11. Staff Management (`/admin/staff`)

**Endpoints**:
- `GET /api/admin/staff` - List staff members
- `POST /api/admin/staff` - Create staff account
- `PUT /api/admin/staff` - Update staff
- `DELETE /api/admin/staff` - Delete staff

**How to Test**:

1. **View Staff List**:
   - Navigate to `/admin/staff`
   - Verify staff members display with roles, status
   - Test search by name/email

2. **Create Staff Account**:
   - Click "Add Staff" button
   - Enter staff details:
     - Name, email
     - Role (admin, warehouse_staff, customer_support)
     - Permissions
   - Set temporary password
   - Save account
   - Verify staff appears in list

3. **Update Staff**:
   - Modify staff details
   - Change role or permissions
   - Update status (active/inactive)
   - Verify changes reflect

4. **Delete Staff**:
   - Delete staff account
   - Verify removal from list

**Expected Results**: Staff management works with proper role-based access

---

### 12. Reporting (`/admin/reporting`)

**Endpoints**:
- `GET /api/admin/reports/packages` - Package reports
- `GET /api/admin/reports/revenue` - Revenue reports
- `GET /api/admin/reports/customers` - Customer reports
- `GET /api/admin/reports/export` - Export reports

**How to Test**:

1. **Package Reports**:
   - Navigate to `/admin/reporting`
   - Select "Package Reports"
   - Set date range
   - Filter by status/branch
   - Generate report
   - Verify data displays correctly

2. **Revenue Reports**:
   - Select "Revenue Reports"
   - Choose time period
   - Filter by payment method
   - Generate report
   - Check revenue calculations

3. **Customer Reports**:
   - Select "Customer Reports"
   - Filter by customer type/activity
   - Generate report
   - Verify customer analytics

4. **Export Reports**:
   - Click export button
   - Choose format (CSV, PDF)
   - Download file
   - Verify file contains correct data

**Expected Results**: Reporting system provides accurate analytics and export functionality

---

### 13. Rate Calculator (`/admin/rate-calculator`)

**Endpoints**:
- `POST /api/admin/rate-calculator/calculate` - Calculate shipping rate
- `GET /api/admin/rate-calculator/zones` - Get shipping zones

**How to Test**:

1. **Calculate Shipping Rate**:
   - Navigate to `/admin/rate-calculator`
   - Enter package details:
     - Weight, dimensions
     - Origin and destination
     - Service type
   - Click "Calculate Rate"
   - Verify rate calculation displays

2. **Test Different Scenarios**:
   - Various weight categories
   - Different destinations
   - Express vs standard shipping
   - International vs domestic

3. **Zone Management**:
   - View shipping zones
   - Test zone-based pricing
   - Verify zone calculations

**Expected Results**: Rate calculator provides accurate shipping costs

---

### 14. Settings (`/admin/settings`)

**Endpoints**:
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update settings

**How to Test**:

1. **View System Settings**:
   - Navigate to `/admin/settings`
   - Verify settings display:
     - Company information
     - PayPal configuration
     - Email settings
     - System preferences

2. **Update Settings**:
   - Modify company information
   - Update PayPal settings
   - Change email configuration
   - Save changes
   - Verify updates persist

3. **Test PayPal Integration**:
   - Update PayPal credentials
   - Test PayPal connection
   - Verify sandbox mode works

**Expected Results**: Settings management works with proper configuration

---

### 15. Logs & Audit Trail (`/admin/logs`)

**Endpoints**:
- `GET /api/admin/logs` - Get system logs
- `GET /api/admin/logs/audit` - Get audit trail

**How to Test**:

1. **View System Logs**:
   - Navigate to `/admin/logs`
   - Verify logs display with timestamps, levels
   - Test filtering by log level
   - Search by keyword

2. **Audit Trail**:
   - View audit trail section
   - Check user actions recorded
   - Verify timestamp accuracy
   - Test date range filtering

3. **Log Export**:
   - Export logs to file
   - Verify file format and content

**Expected Results**: Logging system captures all relevant system events

---

### 16. Integrations (`/admin/integrations`)

**Endpoints**:
- `GET /api/admin/integrations` - List integrations
- `POST /api/admin/integrations` - Configure integration
- `PUT /api/admin/integrations` - Update integration

**How to Test**:

1. **View Integrations**:
   - Navigate to `/admin/integrations`
   - Verify available integrations display
   - Check connection status

2. **Configure Integration**:
   - Select integration (e.g., PayPal, email service)
   - Enter configuration details
   - Test connection
   - Save configuration
   - Verify connection status updates

3. **Test Integration**:
   - Test PayPal payment flow
   - Send test email
   - Verify webhook endpoints

**Expected Results**: Integration management works with proper connection testing

---

### 17. Profile Management (`/admin/profile`)

**Endpoints**:
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update profile
- `PUT /api/admin/profile/password` - Change password

**How to Test**:

1. **View Profile**:
   - Navigate to `/admin/profile`
   - Verify profile information displays
   - Check account details

2. **Update Profile**:
   - Modify profile information
   - Update contact details
   - Save changes
   - Verify updates reflect

3. **Change Password**:
   - Click "Change Password"
   - Enter current password
   - Set new password
   - Confirm password
   - Submit change
   - Test login with new password

**Expected Results**: Profile management works with secure password changes

---

## API Testing for Admin Portal

### Authentication Testing

**Endpoint**: Session-based authentication through NextAuth

**How to Test**:
```bash
# Test protected endpoint without authentication
curl -X GET "http://localhost:3000/api/admin/dashboard/stats"
# Expected: 401 Unauthorized

# Test with authentication cookie/session
curl -X GET "http://localhost:3000/api/admin/dashboard/stats" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
# Expected: 200 OK with dashboard stats
```

### Dashboard API

**Endpoint**: `GET /api/admin/dashboard/stats`

**Response Format**:
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
    }
  ],
  "revenueByMonth": [
    {
      "month": "2024-12",
      "revenue": 25000.00,
      "packages": 180
    }
  ],
  "topCustomers": [
    {
      "name": "John Doe",
      "packages": 25,
      "revenue": 3000.00
    }
  ],
  "packagesByBranch": [
    {
      "branch": "Kingston",
      "count": 750
    }
  ],
  "recentActivity": [
    {
      "title": "New Package",
      "description": "Package #241221-123456 created for John Doe",
      "timestamp": "2024-12-21T10:30:00.000Z",
      "icon": "Package"
    }
  ]
}
```

### Package API

**Endpoint**: `GET /api/admin/packages`

**Query Parameters**:
- `q` (optional): Search term
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)

**Response Format**:
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

**Create Package**:
```bash
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
```

### Customer API

**Endpoint**: `GET /api/admin/customers`

**Response Format**:
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

---

## Mobile Responsiveness Testing

### Admin Portal Mobile Testing
1. **Dashboard**:
   - Test navigation menu toggle on mobile
   - Verify stats cards adapt to small screens
   - Test tab navigation on mobile

2. **Package Management**:
   - Test package list on mobile devices
   - Verify form inputs work on mobile
   - Test search and filter controls

3. **Invoice Generation**:
   - Test invoice creation on mobile
   - Verify PDF generation works
   - Test form validation

### Tablets
1. Test landscape/portrait orientations
2. Verify sidebar behavior
3. Test data tables on tablet screens

---

## Performance Testing

### Load Testing
1. Test dashboard with large datasets (1000+ packages)
2. Verify report generation with extensive date ranges
3. Test concurrent admin user sessions
4. Check API response times under load

### Database Performance
1. Test package search with large datasets
2. Verify customer list pagination
3. Test report generation performance
4. Check dashboard stats calculation time

---

## Security Testing

### Authentication & Authorization
1. Test unauthorized access to admin endpoints
2. Verify role-based access control
3. Test session timeout functionality
4. Check admin privilege escalation prevention

### Data Protection
1. Verify admin can only access authorized data
2. Test input validation on all forms
3. Check XSS protection in admin interface
4. Verify CSRF protection on sensitive operations

### Audit Trail
1. Verify all admin actions are logged
2. Test audit trail accuracy
3. Check log retention policies
4. Verify log access controls

---

## Integration Testing

### PayPal Integration
1. Test PayPal sandbox configuration
2. Verify payment processing end-to-end
3. Test payment failure scenarios
4. Check webhook handling

### Email Integration
1. Test email sending for invoices
2. Verify broadcast message delivery
3. Test notification emails
4. Check email template rendering

### Database Integration
1. Test MongoDB package data
2. Verify Prisma customer data
3. Check data consistency between databases
4. Test transaction rollback scenarios

---

## Error Handling Testing

### Common Error Scenarios
1. Network connectivity issues
2. Invalid tracking numbers
3. Duplicate package creation
4. Payment processing failures
5. Email sending failures
6. File upload errors

### Error Messages
1. Verify user-friendly error messages
2. Test error recovery options
3. Check error logging functionality
4. Verify error reporting to admins

---

## Accessibility Testing

### WCAG Compliance
1. Test keyboard navigation
2. Verify screen reader compatibility
3. Check color contrast ratios
4. Verify alt text on images
5. Test form accessibility

### Admin Interface Accessibility
1. Test data table accessibility
2. Verify modal accessibility
3. Check form validation accessibility
4. Test navigation accessibility

---

## Browser Compatibility

### Supported Browsers
1. Chrome (latest version)
2. Firefox (latest version)
3. Safari (latest version)
4. Edge (latest version)

### Testing Checklist
- [ ] All admin features work in Chrome
- [ ] All admin features work in Firefox
- [ ] All admin features work in Safari
- [ ] All admin features work in Edge

---

## Testing Checklist

### Authentication & Navigation
- [ ] Admin login works correctly
- [ ] Dashboard loads with real-time data
- [ ] All navigation links work
- [ ] Mobile responsive navigation works
- [ ] Session persistence works
- [ ] Role-based access control works

### Core Management Features
- [ ] Package CRUD operations work
- [ ] Customer management works
- [ ] Invoice generation works
- [ ] Bill management works
- [ ] Transaction tracking works
- [ ] Shipment/manifest creation works

### Communication Features
- [ ] Broadcast messaging works
- [ ] Pre-alert management works
- [ ] Email notifications work
- [ ] Message templates work

### Reporting & Analytics
- [ ] Dashboard statistics accurate
- [ ] Package reports generate correctly
- [ ] Revenue reports accurate
- [ ] Customer reports work
- [ ] Export functionality works

### System Administration
- [ ] Staff management works
- [ ] Settings configuration works
- [ ] Integration management works
- [ ] Profile management works
- [ ] Password changes work

### Security & Compliance
- [ ] Authentication protects all endpoints
- [ ] Authorization controls work
- [ ] Audit trail captures actions
- [ ] Error handling is proper
- [ ] Rate limiting works

---

## Troubleshooting Common Issues

### Issue: Dashboard shows no data
**Solution**: 
- Check admin authentication
- Verify database connections
- Check browser console for errors
- Verify API endpoint responses

### Issue: Package creation fails
**Solution**:
- Check tracking number format
- Verify customer exists
- Check required field validation
- Test with different data

### Issue: PayPal integration fails
**Solution**:
- Verify PayPal sandbox configuration
- Check API credentials
- Test webhook endpoints
- Verify currency settings

### Issue: Reports generate slowly
**Solution**:
- Check database indexes
- Verify query optimization
- Test with smaller date ranges
- Check server resources

### Issue: Email sending fails
**Solution**:
- Verify email service configuration
- Check SMTP settings
- Test email templates
- Verify recipient addresses

---

## Performance Metrics

### Target Performance
- Dashboard load time: < 3 seconds
- Package list load: < 2 seconds
- Invoice generation: < 5 seconds
- Report generation: < 10 seconds
- API response time: < 1 second

### Monitoring
- Track page load times
- Monitor API response times
- Watch error rates
- Monitor database performance
- Track user activity

---

## Support Contact

For admin portal testing issues:
1. Check browser console for JavaScript errors
2. Verify admin authentication credentials
3. Check server logs for API errors
4. Test database connectivity
5. Verify integration configurations
6. Contact development team with specific error details

---

**Note**: This testing guide covers all admin portal functionality required by the client. Ensure each feature is tested thoroughly before admin deployment.
