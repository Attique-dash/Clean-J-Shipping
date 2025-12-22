# Warehouse Portal Testing Guide

This guide provides comprehensive testing instructions for the Clean J Shipping warehouse portal, including all functionality and API endpoints for warehouse team testing.

## Prerequisites

1. **Environment Setup**:
   - Ensure the development server is running: `npm run dev`
   - Database connections active (MongoDB + Prisma)
   - Valid warehouse user credentials

2. **Access URLs**:
   - Warehouse Portal: `http://localhost:3000/warehouse`
   - Warehouse Login: `http://localhost:3000/warehouse/login`

## Warehouse Portal Features Testing

### 1. Warehouse Authentication

**Endpoint**: `/api/auth/signin` (NextAuth)

**How to Test**:
1. Navigate to `http://localhost:3000/warehouse/login`
2. Enter warehouse credentials
3. Verify successful redirect to warehouse dashboard
4. Test logout functionality

**Expected Result**: Authentication works and redirects to dashboard

---

### 2. Warehouse Dashboard (`/warehouse`)

**Endpoint**: `GET /api/warehouse/analytics`

**How to Test**:
1. Login to warehouse portal
2. Navigate to dashboard
3. Verify all statistics display:
   - Today's activity (packages received, ready to ship, processing time, weight)
   - Package status overview with pie chart
   - Monthly statistics
   - Top customers list
4. Check that all quick action cards work

**Expected Result**: Dashboard loads with real-time data and functional navigation

---

### 3. Package Management (`/warehouse/packages`)

**Endpoints**:
- `GET /api/warehouse/packages` - List packages
- `POST /api/warehouse/packages` - Create package
- `PUT /api/warehouse/packages/[id]` - Update package
- `DELETE /api/warehouse/packages/[id]` - Delete package

**How to Test**:

1. **View Packages**:
   - Navigate to `/warehouse/packages`
   - Verify package list loads with tracking numbers, status, recipient info
   - Test search functionality by tracking number, recipient name
   - Test status filtering

2. **Add New Package**:
   - Click "Add Package" button
   - Fill in package details:
     - Weight, dimensions
     - Recipient information (shipping ID required)
     - Sender information
     - Package contents
   - Submit and verify package appears in list

3. **Update Package Status**:
   - Click on any package
   - Update status (At Warehouse → In Transit → At Local Port → Delivered)
   - Verify status change reflects immediately

4. **Delete Package**:
   - Select a package and click delete
   - Confirm deletion and verify removal from list

**Expected Results**: All CRUD operations work correctly with proper validation

---

### 4. Customer Information Retrieval

**Endpoints**:
- `GET /api/warehouse/customers` - Search customers
- `GET /api/warehouse/pullcustomer/subdir` - API for external systems

**How to Test**:

1. **Customer Search**:
   - Navigate to `/warehouse/customers`
   - Search by customer code, name, email, phone
   - Verify search results show active packages count
   - Test customer deletion functionality

2. **API Access for Warehouse Systems**:
   ```bash
   # Test customer data pull API (requires API key)
   curl "http://localhost:3000/api/warehouse/pullcustomer/subdir?id=wh_live_YOUR_API_KEY"
   ```

**Expected Results**: Customer data accessible with proper permissions and rate limiting

---

### 5. Package Scanning (`/warehouse/scan`)

**Endpoint**: `POST /api/warehouse/scan`

**How to Test**:
1. Navigate to `/warehouse/scan`
2. Use camera or manual input for tracking numbers
3. Scan multiple packages
4. Verify batch status updates work
5. Test unknown package handling

**Expected Results**: Scanning updates package statuses efficiently

---

### 6. Advanced Search (`/warehouse/search`)

**Endpoint**: `GET /api/warehouse/search`

**How to Test**:
1. Navigate to `/warehouse/search`
2. Test advanced filters:
   - Date range
   - Status combinations
   - Weight ranges
   - Customer codes
3. Verify search accuracy and performance

**Expected Results**: Complex searches return accurate results quickly

---

### 7. Bulk Package Upload (`/warehouse/bulk-upload`)

**Endpoint**: `POST /api/warehouse/bulk-upload`

**How to Test**:
1. Navigate to `/warehouse/bulk-upload`
2. Prepare CSV file with package data
3. Upload file and verify validation
4. Check that all valid packages are created
5. Verify error handling for invalid data

**Expected Results**: Bulk upload processes packages efficiently with proper error reporting

---

### 8. Manifest Management (`/warehouse/manifests`)

**Endpoints**:
- `GET /api/warehouse/manifests` - List manifests
- `POST /api/warehouse/manifests` - Create manifest
- `PUT /api/warehouse/updatemanifest` - Update manifest

**How to Test**:
1. Navigate to `/warehouse/manifests`
2. Create new manifest with selected packages
3. Upload manifest file (CSV/Excel)
4. Update existing manifest status
5. Generate manifest reports

**Expected Results**: Manifest creation and tracking works correctly

---

### 9. Inventory Management (`/warehouse/inventory`)

**Endpoints**:
- `GET /api/warehouse/inventory` - List inventory
- `POST /api/warehouse/inventory` - Update inventory

**How to Test**:
1. Navigate to `/warehouse/inventory`
2. View packing materials and supplies
3. Update inventory quantities
4. Test low stock alerts

**Expected Results**: Inventory tracking maintains accurate stock levels

---

### 10. Unknown Packages (`/warehouse/unknown-packages`)

**Endpoint**: `GET /api/warehouse/packages/unknown/count`

**How to Test**:
1. Create packages without valid recipient shipping IDs
2. Navigate to `/warehouse/unknown-packages`
3. Verify unknown packages appear in list
4. Test recipient matching functionality
5. Update package information to resolve unknown status

**Expected Results**: Unknown packages are tracked and can be resolved

---

## API Testing for Warehouse Integration

### Customer Data Pull API

**Endpoint**: `GET /api/warehouse/pullcustomer/subdir?id=API_KEY`

**Required Headers**:
- API Key in query parameter (starts with `wh_live_` or `wh_test_`)

**Response Format**:
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

**Rate Limiting**: 200 requests per minute per API key

### Package Status Updates

**Endpoint**: `PUT /api/warehouse/packages/[id]`

**Request Body**:
```json
{
  "status": "In Transit",
  "location": "Jamaica Post Office",
  "notes": "Package forwarded to local port"
}
```

### Package Creation API

**Endpoint**: `POST /api/warehouse/packages`

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
    "address": "123 Commerce St"
  }
}
```

---

## Testing Checklist

### Authentication & Navigation
- [ ] Warehouse login works correctly
- [ ] Dashboard loads with real-time data
- [ ] All navigation links function
- [ ] Mobile responsive design works

### Package Operations
- [ ] Package creation with validation
- [ ] Package status updates work
- [ ] Package search and filtering
- [ ] Package deletion with confirmation

### Customer Management
- [ ] Customer search returns accurate results
- [ ] Customer data pull API works with API keys
- [ ] Rate limiting enforced on API endpoints

### Advanced Features
- [ ] Package scanning functionality
- [ ] Bulk upload processes CSV files
- [ ] Manifest creation and tracking
- [ ] Inventory management updates
- [ ] Unknown package handling

### API Integration
- [ ] All endpoints return proper HTTP status codes
- [ ] Error handling provides useful messages
- [ ] Rate limiting prevents abuse
- [ ] API authentication works correctly

---

## Performance Testing

1. **Load Testing**:
   - Test with 1000+ packages in database
   - Verify search response times < 2 seconds
   - Check dashboard loading with large datasets

2. **Concurrent Users**:
   - Test multiple warehouse staff logged in simultaneously
   - Verify no data conflicts between users

3. **API Performance**:
   - Test customer pull API with rate limiting
   - Verify bulk upload handles large files efficiently

---

## Security Testing

1. **Authentication**:
   - Test unauthorized access to warehouse endpoints
   - Verify session management works correctly

2. **API Security**:
   - Test API key validation
   - Verify rate limiting prevents abuse
   - Test input sanitization prevents injection

3. **Data Protection**:
   - Verify customer data is properly secured
   - Test audit trail for package operations

---

## Troubleshooting Common Issues

### Issue: Dashboard shows no data
**Solution**: 
- Check database connections
- Verify packages exist in system
- Check browser console for errors

### Issue: Package creation fails
**Solution**:
- Verify required fields are filled
- Check recipient shipping ID exists
- Validate weight and dimensions format

### Issue: API returns 401 Unauthorized
**Solution**:
- Verify API key is valid and active
- Check API key has required permissions
- Ensure API key hasn't expired

### Issue: Search returns no results
**Solution**:
- Verify search parameters are correct
- Check data exists in database
- Test with different search terms

---

## Support Contact

For technical issues during testing:
1. Check browser console for JavaScript errors
2. Verify server logs for API errors
3. Test database connections
4. Contact development team with specific error details

---

**Note**: This testing guide covers all warehouse portal functionality. Ensure each feature is tested thoroughly before production deployment.
