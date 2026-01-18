# Client Reply Guide - Warehouse API Integration

## Quick Summary

**Client Needs:**
- Information to share with warehouse for integration
- API endpoints to test customer information retrieval
- Clarification: Add warehouse members OR use API links?

**What You Can Provide:**
1. Web Portal Access (add warehouse members)
2. API Integration (share endpoints)
3. Both options

---

## Sample Client Replies

### Reply 1: Initial Response - API Information

```
Hi,

Here are the API endpoints for warehouse integration:

**Customer Information:**
GET /api/warehouse/pullcustomer/subdir?id=YOUR_API_TOKEN
- Returns list of all customers with UserCode, names, branch

**Package Management:**
POST /api/warehouse/addpackage/subdir - Add packages
POST /api/warehouse/editpackage/subdir - Update packages  
POST /api/warehouse/deletepackage/subdir - Delete packages
POST /api/warehouse/updatemanifest/subdir - Link packages to manifests

**Authentication:**
- Use header: x-warehouse-key (recommended)
- Or include APIToken in request body

I've attached a Postman collection file for easy testing. 
Let me know if you need the API key or have questions.
```

---

### Reply 2: Testing Instructions

```
Hi,

To test the API:

1. **Get API Key:**
   I'll provide it separately for security.

2. **Test Customer Pull:**
   - Postman: GET /api/warehouse/pullcustomer/subdir?id=YOUR_API_TOKEN
   - Should return customer array

3. **Test Package Operations:**
   - Import the Postman collection I shared
   - Set x-warehouse-key header with your API key
   - Try adding a test package

All endpoints are live. Share the results when ready.
```

---

### Reply 3: Integration Options Explained

```
Hi,

You have 3 options:

**Option 1: Web Portal**
- Add warehouse members via Admin portal
- They log in and use interface directly
- No API needed

**Option 2: API Integration**  
- Share API endpoints with warehouse
- They connect their system to pull/push data
- Requires API key

**Option 3: Both**
- Portal for daily operations
- APIs for automated sync

Which works better? I can set up either.
```

---

### Reply 4: What to Send Warehouse

```
Hi,

For warehouse integration, send them:

**Option A - Web Portal:**
- Add them as warehouse members in Admin portal
- They get login credentials
- Access: /warehouse/packages and /warehouse/customers

**Option B - API Integration:**
- API endpoints (see attached documentation)
- Postman collection for testing
- API key (I'll provide separately)

**Option C - Both:**
- Portal for manual operations
- APIs for system automation

Ask them which they prefer, then I'll set it up.
```

---

### Reply 5: API Key Setup

```
Hi,

For API integration, you'll need:

1. **API Key:**
   - Format: wh_live_...
   - I'll generate and share it securely
   - Add to WAREHOUSE_API_KEYS environment variable

2. **Endpoints:**
   - Base URL: https://your-domain.vercel.app
   - All endpoints documented in attached file

3. **Testing:**
   - Use Postman collection (attached)
   - Set baseUrl and apiKey variables
   - Test each endpoint

Let me know when you're ready for the API key.
```

---

### Reply 6: Quick Reference

```
Hi,

**Quick API Reference:**

1. **Pull Customers:**
   GET /api/warehouse/pullcustomer/subdir?id=API_TOKEN

2. **Add Package:**
   POST /api/warehouse/addpackage/subdir
   Header: x-warehouse-key: YOUR_KEY
   Body: Array of package objects

3. **Edit Package:**
   POST /api/warehouse/editpackage/subdir
   Header: x-warehouse-key: YOUR_KEY
   Body: Array of package objects

4. **Delete Package:**
   POST /api/warehouse/deletepackage/subdir
   Header: x-warehouse-key: YOUR_KEY
   Body: Object or array with TrackingNumber

5. **Update Manifest:**
   POST /api/warehouse/updatemanifest/subdir
   Header: x-warehouse-key: YOUR_KEY
   Body: Manifest object with PackageAWBs/CollectionCodes

Full documentation and Postman collection attached.
```

---

## Endpoint Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/warehouse/pullcustomer/subdir` | GET | Query param `id` | Get all customers |
| `/api/warehouse/addpackage/subdir` | POST | Header `x-warehouse-key` | Add packages |
| `/api/warehouse/editpackage/subdir` | POST | Header `x-warehouse-key` | Update packages |
| `/api/warehouse/deletepackage/subdir` | POST | Header `x-warehouse-key` | Delete packages |
| `/api/warehouse/updatemanifest/subdir` | POST | Header `x-warehouse-key` | Link packages to manifest |

---

## Postman Setup Steps

1. Import `Warehouse_API.postman_collection.json`
2. Create environment with:
   - `baseUrl`: Your domain URL
   - `apiKey`: Your warehouse API key
3. Select environment in Postman
4. Test each endpoint

---

## Common Questions & Answers

**Q: What should I send the warehouse?**
A: Either add them as members (portal access) OR share API endpoints + key (system integration)

**Q: Can they use both?**
A: Yes! Portal for daily work, APIs for automation

**Q: How do they test?**
A: Use the Postman collection I provided

**Q: What if API doesn't work?**
A: Check API key in header, verify endpoint URL, check request body format
