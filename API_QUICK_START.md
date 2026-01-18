# Warehouse API - Quick Start Guide

## 📋 What the Client Wants

Based on your chat:
- **Warehouse needs API information** for integration
- **They want to test** if they can get customer information
- **Question:** Add warehouse members OR just share API links?

---

## ✅ What You Can Do

### Option 1: Web Portal (Easiest)
- Add warehouse members through Admin portal
- They log in at `/warehouse/packages` and `/warehouse/customers`
- No API integration needed

### Option 2: API Integration (For Automation)
- Share API endpoints with warehouse
- They connect their system to pull/push data
- Requires API key

### Option 3: Both
- Portal for daily operations
- APIs for automated system sync

---

## 🚀 Quick API Endpoints

### 1. Get Customers
```
GET /api/warehouse/pullcustomer/subdir?id=YOUR_API_TOKEN
```

### 2. Add Package
```
POST /api/warehouse/addpackage/subdir
Header: x-warehouse-key: YOUR_KEY
Body: [ { "TrackingNumber": "...", "UserCode": "...", ... } ]
```

### 3. Edit Package
```
POST /api/warehouse/editpackage/subdir
Header: x-warehouse-key: YOUR_KEY
Body: [ { "TrackingNumber": "...", ... } ]
```

### 4. Delete Package
```
POST /api/warehouse/deletepackage/subdir
Header: x-warehouse-key: YOUR_KEY
Body: { "TrackingNumber": "..." }
```

### 5. Update Manifest
```
POST /api/warehouse/updatemanifest/subdir
Header: x-warehouse-key: YOUR_KEY
Body: { "Manifest": {...}, "PackageAWBs": [...] }
```

---

## 📦 Files Created

1. **WAREHOUSE_API_DOCUMENTATION.md** - Full API documentation
2. **Warehouse_API.postman_collection.json** - Postman collection for testing
3. **CLIENT_REPLY_GUIDE.md** - Sample client replies
4. **API_QUICK_START.md** - This file

---

## 🧪 Testing in Postman

1. Import `Warehouse_API.postman_collection.json`
2. Set environment variables:
   - `baseUrl`: Your domain (e.g., `https://your-app.vercel.app`)
   - `apiKey`: Your warehouse API key (format: `wh_live_...`)
3. Run requests to test

---

## 💬 Sample Reply to Client

```
Hi,

For warehouse integration, you have 2 options:

**Option 1: Web Portal**
- Add warehouse members via Admin portal
- They log in and use the interface

**Option 2: API Integration**
- Share API endpoints (see attached docs)
- They connect their system
- Requires API key

I've attached:
- API documentation
- Postman collection for testing
- Quick reference guide

Which option does the warehouse prefer?
```

---

## 🔑 API Key Setup

1. Generate API key (format: `wh_live_...`)
2. Add to environment variable: `WAREHOUSE_API_KEYS=key1,key2,key3`
3. Share key securely with warehouse
4. They use it in `x-warehouse-key` header

---

## 📝 Next Steps

1. Review the documentation files
2. Generate API key if needed
3. Test endpoints in Postman
4. Share appropriate option with client
5. Provide API key securely when ready

---

## ⚠️ Important Notes

- **Pull Customers** endpoint uses query parameter `id` (not header)
- **All other endpoints** use `x-warehouse-key` header
- Rate limits apply (200/min for customers, 100/min for add package)
- All endpoints are live and ready for testing
