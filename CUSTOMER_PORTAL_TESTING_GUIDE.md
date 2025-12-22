# Customer Portal Testing Guide

This guide provides comprehensive testing instructions for the Clean J Shipping customer portal, including all functionality and API endpoints for customer testing according to client requirements.

## Prerequisites

1. **Environment Setup**:
   - Ensure the development server is running: `npm run dev`
   - Database connections active (MongoDB + Prisma)
   - Valid customer user credentials

2. **Access URLs**:
   - Customer Portal: `http://localhost:3000/customer`
   - Customer Login: `http://localhost:3000/auth/signin`

## Customer Portal Features Testing

### 1. Customer Authentication

**Endpoint**: `/api/auth/signin` (NextAuth)

**How to Test**:
1. Navigate to `http://localhost:3000/auth/signin`
2. Enter customer credentials
3. Verify successful redirect to customer dashboard
4. Test logout functionality
5. Test session persistence

**Expected Result**: Authentication works and redirects to customer dashboard

---

### 2. Customer Dashboard (`/customer/dashboard`)

**Endpoint**: `GET /api/customer/packages` and `GET /api/customer/bills`

**How to Test**:
1. Login to customer portal
2. Navigate to dashboard
3. Verify dashboard elements:
   - Welcome message with customer name
   - Real-time package tracking section
   - Statistics cards (Total Packages, Active Shipments, Pending Bills, Messages)
   - Upcoming shipments list
   - Pending payments section
   - Recent activity section

4. **Test Real-Time Tracking**:
   - Enter tracking number in search box
   - Click "Track" button
   - Verify PackageTracker component displays
   - Test tracking with invalid numbers

**Expected Result**: Dashboard loads with real-time data and functional tracking

---

### 3. Package Management (`/customer/packages`)

**Endpoints**:
- `GET /api/customer/packages` - List customer packages
- `POST /api/customer/packages/[id]/invoice` - Upload invoice

**How to Test**:

1. **View Packages**:
   - Navigate to `/customer/packages`
   - Verify package list loads with tracking numbers, status, location
   - Check table headers and data display
   - Test pagination functionality

2. **Search and Filter**:
   - Test search by tracking number and description
   - Filter by location
   - Filter by status (Received, Processing, Shipped, Ready for Pickup, Delivered, Archived)
   - Test advanced filters:
     - Date range filtering
     - Weight range filtering
   - Test clear filters functionality

3. **Invoice Upload**:
   - Click "Invoice" button on any package
   - Select PDF/image files for upload
   - Verify upload progress indicator
   - Check that invoice status updates

4. **External Tracking**:
   - Click "Track" button on any package
   - Verify external tracking page opens in new tab
   - Test with different tracking numbers

**Expected Results**: Package listing works with all filters, invoice upload succeeds, external tracking functions

---

### 4. Bills & Payments (`/customer/bills`)

**Endpoints**:
- `GET /api/customer/bills` - List customer bills
- `POST /api/customer/payments/create-paypal-order` - Create PayPal order
- `POST /api/customer/payments/capture-paypal` - Capture PayPal payment
- `POST /api/customer/payments/process` - Process payment

**How to Test**:

1. **View Bills**:
   - Navigate to `/customer/bills`
   - Verify bills display with tracking numbers, amounts, status
   - Check statistics cards (Total Due, Pending Bills, Reviewed Bills, Rejected Bills)
   - Test bill status indicators

2. **Cart Functionality**:
   - Select bills using checkboxes
   - Verify cart count updates in sidebar
   - Test "Add All to Cart" button
   - Test "Clear Cart" functionality
   - Verify cart persistence across page refreshes

3. **PayPal Payment**:
   - Click "Pay Now" on any bill
   - Verify payment modal opens with correct details
   - Test PayPal button appearance and functionality
   - Complete PayPal payment in sandbox mode
   - Verify payment success message and bill status update

4. **Document Access**:
   - Click "View" button on bills with documents
   - Test document download functionality
   - Verify PDF opens correctly

**Expected Results**: Bills display correctly, cart functions work, PayPal payments process successfully

---

### 5. Checkout Cart (`/customer/checkout`)

**Endpoint**: Multiple customer payment endpoints

**How to Test**:
1. Navigate to `/customer/checkout` (only accessible with items in cart)
2. Verify cart displays selected bills
3. Test cart item removal
4. Verify total calculation
5. Test PayPal checkout process
6. Verify cart clears after successful payment

**Expected Result**: Cart checkout works with PayPal integration

---

### 6. Profile Management (`/customer/profile`)

**Endpoints**:
- `GET /api/customer/profile` - Get profile
- `PUT /api/customer/profile` - Update profile

**How to Test**:
1. Navigate to `/customer/profile`
2. Verify profile information displays
3. Test profile updates (name, email, phone, address)
4. Test password change functionality
5. Verify profile picture upload

**Expected Result**: Profile loads and updates successfully

---

### 7. Messages (`/customer/messages`)

**Endpoints**:
- `GET /api/customer/messages` - List messages
- `POST /api/customer/messages` - Send message

**How to Test**:
1. Navigate to `/customer/messages`
2. Verify message list displays
3. Test composing new messages
4. Test message attachments
5. Verify message sending and receiving

**Expected Result**: Messages load and send correctly

---

### 8. Pre-Alerts (`/customer/pre-alerts`)

**Endpoints**:
- `GET /api/customer/pre-alerts` - List pre-alerts
- `POST /api/customer/pre-alerts` - Create pre-alert

**How to Test**:
1. Navigate to `/customer/pre-alerts`
2. Test creating new pre-alerts
3. Verify pre-alert list displays
4. Test pre-alert status updates

**Expected Result**: Pre-alerts can be created and managed

---

### 9. Support (`/customer/support`)

**Endpoints**:
- `GET /api/customer/support` - List support tickets
- `POST /api/customer/support` - Create support ticket

**How to Test**:
1. Navigate to `/customer/support`
2. Test creating support tickets
3. Verify ticket list displays
4. Test ticket status tracking

**Expected Result**: Support tickets can be created and tracked

---

### 10. FAQ (`/customer/faq`)

**Endpoint**: `GET /api/customer/faq`

**How to Test**:
1. Navigate to `/customer/faq`
2. Verify FAQ categories display
3. Test FAQ search functionality
4. Test FAQ expand/collapse functionality

**Expected Result**: FAQ loads and functions correctly

---

### 11. Archives (`/customer/archives`)

**Endpoints**:
- `GET /api/customer/archives/packages` - Archived packages
- `GET /api/customer/archives/messages` - Archived messages

**How to Test**:
1. Navigate to `/customer/archives`
2. Verify archived packages display
3. Verify archived messages display
4. Test archive search functionality

**Expected Result**: Archives display and search correctly

---

### 12. Referral (`/customer/referral`)

**Endpoints**:
- `GET /api/customer/referral` - Get referral info
- `POST /api/customer/referral` - Send referral

**How to Test**:
1. Navigate to `/customer/referral`
2. Verify referral code displays
3. Test sending referrals
4. Verify referral tracking

**Expected Result**: Referral system works correctly

---

## API Testing for Customer Portal

### Customer Authentication

**Endpoint**: Session-based authentication through NextAuth

**How to Test**:
```bash
# Test protected endpoint without authentication
curl -X GET "http://localhost:3000/api/customer/packages"
# Expected: 401 Unauthorized

# Test with authentication cookie/session
curl -X GET "http://localhost:3000/api/customer/packages" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
# Expected: 200 OK with package data
```

### Package API

**Endpoint**: `GET /api/customer/packages`

**Response Format**:
```json
{
  "packages": [
    {
      "id": "package_id",
      "tracking_number": "241221-123456",
      "status": "in_transit",
      "description": "Electronics package",
      "weight": "2.5 kg",
      "current_location": "Kingston Hub",
      "created_at": "2024-12-21T10:30:00.000Z",
      "invoice_status": "uploaded"
    }
  ],
  "total_packages": 1
}
```

### Bills API

**Endpoint**: `GET /api/customer/bills`

**Response Format**:
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
      "last_updated": "2024-12-21T10:30:00.000Z"
    }
  ]
}
```

### Payment APIs

**Create PayPal Order**:
```bash
curl -X POST "http://localhost:3000/api/customer/payments/create-paypal-order" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "amount": 1500.00,
    "currency": "JMD",
    "description": "Payment for invoice INV-2024-001",
    "trackingNumber": "241221-123456"
  }'
```

**Process Payment**:
```bash
curl -X POST "http://localhost:3000/api/customer/payments/process" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "trackingNumber": "241221-123456",
    "amount": 1500.00,
    "currency": "JMD",
    "paymentMethod": "paypal",
    "paypalOrderId": "PAYPAL_ORDER_ID"
  }'
```

---

## Mobile Responsiveness Testing

### Mobile Devices
1. **Dashboard**:
   - Test navigation menu toggle
   - Verify card layouts adapt to small screens
   - Test touch interactions

2. **Package List**:
   - Test horizontal scrolling on table
   - Verify filter controls work on mobile
   - Test pagination on mobile

3. **Bills & Payments**:
   - Test bill card layout on mobile
   - Verify PayPal buttons work on mobile
   - Test cart functionality

### Tablets
1. Test landscape/portrait orientations
2. Verify sidebar behavior
3. Test form inputs and interactions

---

## Performance Testing

1. **Load Testing**:
   - Test dashboard with 100+ packages
   - Verify bills page loads quickly with many items
   - Test search response times

2. **Real-time Updates**:
   - Test package status updates reflect immediately
   - Verify cart updates across browser tabs
   - Test WebSocket connections

---

## Security Testing

### Authentication
1. Test unauthorized access to customer endpoints
2. Verify session management works correctly
3. Test session timeout functionality

### Data Protection
1. Verify customers can only access their own data
2. Test input validation on forms
3. Verify XSS protection

### Payment Security
1. Test PayPal integration security
2. Verify payment data encryption
3. Test payment fraud prevention

---

## Integration Testing

### PayPal Integration
1. Test PayPal sandbox environment
2. Verify payment flow end-to-end
3. Test payment failure scenarios
4. Verify payment confirmation emails

### Database Integration
1. Test MongoDB package data
2. Test Prisma customer data
3. Verify data consistency between databases

---

## Error Handling Testing

### Common Error Scenarios
1. Network connectivity issues
2. Invalid tracking numbers
3. Payment failures
4. File upload errors
5. Form validation errors

### Error Messages
1. Verify user-friendly error messages
2. Test error recovery options
3. Verify error logging works

---

## Accessibility Testing

### WCAG Compliance
1. Test keyboard navigation
2. Verify screen reader compatibility
3. Test color contrast ratios
4. Verify alt text on images

### Mobile Accessibility
1. Test touch targets meet size requirements
2. Verify voice-over compatibility
3. Test zoom functionality

---

## Browser Compatibility

### Supported Browsers
1. Chrome (latest version)
2. Firefox (latest version)
3. Safari (latest version)
4. Edge (latest version)

### Testing Checklist
- [ ] All features work in Chrome
- [ ] All features work in Firefox
- [ ] All features work in Safari
- [ ] All features work in Edge

---

## Testing Checklist

### Authentication & Navigation
- [ ] Customer login works correctly
- [ ] Dashboard loads with real-time data
- [ ] All navigation links work
- [ ] Mobile responsive navigation works
- [ ] Session persistence works

### Package Management
- [ ] Package listing displays correctly
- [ ] Search and filtering works
- [ ] Invoice upload works
- [ ] External tracking links work
- [ ] Pagination functions correctly

### Bills & Payments
- [ ] Bills display with correct amounts
- [ ] Cart functionality works
- [ ] PayPal integration works
- [ ] Payment processing works
- [ ] Payment confirmations work

### Additional Features
- [ ] Profile management works
- [ ] Messages system works
- [ ] Support tickets work
- [ ] FAQ system works
- [ ] Archives function correctly
- [ ] Referral system works

### API Integration
- [ ] All customer API endpoints work
- [ ] Authentication protects endpoints
- [ ] Error responses are proper
- [ ] Rate limiting works
- [ ] Data validation works

---

## Troubleshooting Common Issues

### Issue: Dashboard shows no data
**Solution**: 
- Check customer authentication
- Verify customer has packages/bills in database
- Check browser console for errors

### Issue: Package search returns no results
**Solution**:
- Verify search terms are correct
- Check package status filters
- Test with different search parameters

### Issue: PayPal payment fails
**Solution**:
- Verify PayPal sandbox configuration
- Check PayPal client ID and secret
- Test with different payment scenarios

### Issue: Cart doesn't persist
**Solution**:
- Check localStorage functionality
- Verify cart data format
- Test across different browsers

---

## Performance Metrics

### Target Performance
- Page load time: < 3 seconds
- API response time: < 1 second
- Search response time: < 500ms
- Payment processing: < 5 seconds

### Monitoring
- Track page load times
- Monitor API response times
- Watch error rates
- Monitor payment success rates

---

## Support Contact

For customer portal testing issues:
1. Check browser console for JavaScript errors
2. Verify server logs for API errors
3. Test authentication credentials
4. Check PayPal sandbox configuration
5. Contact development team with specific error details

---

**Note**: This testing guide covers all customer portal functionality required by the client. Ensure each feature is tested thoroughly before customer deployment.
