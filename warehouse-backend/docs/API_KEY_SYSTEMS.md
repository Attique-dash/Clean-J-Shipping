# API Key Systems Documentation

## Overview

This codebase uses **two separate API key systems** for different purposes. It is important to understand which system to use for which endpoints.

## System 1: KcdApiKey (KCD Integration)

**Purpose**: Used specifically for KCD Logistics integration endpoints (`/api/kcd/*`)

**Model**: `src/models/KcdApiKey.ts`
- Fields: `apiKey`, `courierCode`, `description`, `expiresAt`, `isActive`, `createdBy`, `lastUsed`, `usageCount`
- Key field: `apiKey` (string)

**Middleware**: `src/middleware/authKcd.ts` → `authKcdApiKey`
- Accepts: `Authorization: Bearer <key>` OR `X-API-Key: <key>`
- Validates against: `KcdApiKey` model
- Attaches: `req.kcdApiKey`, `req.courierCode`

**Routes Using This System**:
- `/api/kcd/customers` (GET)
- `/api/kcd/packages/add` (POST)
- `/api/kcd/packages/update` (PUT)
- `/api/kcd/packages/:trackingNumber` (GET, DELETE)
- `/api/kcd/packages/:trackingNumber/manifest` (PUT)

**Generation Endpoint**: `POST /api/admin/api-keys/kcd`
- Creates a `KcdApiKey` record
- Returns the API key (shown only once)

**Usage**: Keys generated here will **NOT** work on `/api/warehouse/*` endpoints.

---

## System 2: ApiKey (Warehouse API)

**Purpose**: Used for warehouse API endpoints (`/api/warehouse/*`) that need to support both JWT (staff) and API key (KCD) authentication

**Model**: `src/models/ApiKey.ts`
- Fields: `key`, `name`, `description`, `warehouseId`, `permissions`, `isActive`, `expiresAt`, `lastUsed`, `usageCount`, `rateLimit`
- Key field: `key` (string)
- Additional features: Rate limiting, permissions, warehouse association

**Middleware Options**:
1. `src/middleware/apiKeyAuth.ts` → `validateApiKey` (API key only)
2. `src/middleware/apiKeyAuth.ts` → `combinedAuth` (JWT OR API key)
3. `src/middleware/warehouseAuth.ts` → `authenticateWarehouse` (JWT OR API key)
- Accepts: `X-API-Key: <key>` header
- Validates against: `ApiKey` model
- Attaches: `req.apiKey`, `req.user` (pseudo-user for API keys)

**Routes Using This System**:
- `/api/warehouse/packages` (GET, POST, PUT, DELETE)
- `/api/warehouse/customers` (GET, DELETE)
- Other warehouse endpoints

**Generation Endpoint**: (Check admin routes - may be different from KcdApiKey)
- Creates an `ApiKey` record
- Can be associated with a warehouse

**Usage**: Keys generated here will **NOT** work on `/api/kcd/*` endpoints.

---

## Important Notes

### ⚠️ Key Incompatibility

**Keys from one system will NOT work on endpoints using the other system.**

- A key generated via `POST /api/admin/api-keys/kcd` (KcdApiKey) will **NOT** work on `/api/warehouse/packages`
- A key generated for warehouse API (ApiKey) will **NOT** work on `/api/kcd/packages/add`

### 🔄 Migration/Consolidation Consideration

If you need a single key to work across both systems, you would need to:
1. Create a unified authentication middleware that checks both models
2. Or migrate one system to use the other's model
3. Or create a mapping/bridge between the two systems

### 📝 Current Workaround

If KCD needs to call both `/api/kcd/*` and `/api/warehouse/*` endpoints:
- Generate **two separate keys** (one from each system)
- Use the appropriate key for each endpoint group

---

## Recommendations

1. **Document which endpoints use which system** in your API documentation
2. **Consider consolidating** the two systems in a future refactor
3. **Add clear error messages** when a key from the wrong system is used
4. **Update Swagger/OpenAPI docs** to clearly indicate which authentication system each endpoint uses

---

## Quick Reference

| Endpoint Group | Model | Middleware | Generation Endpoint |
|---------------|-------|------------|---------------------|
| `/api/kcd/*` | `KcdApiKey` | `authKcdApiKey` | `POST /api/admin/api-keys/kcd` |
| `/api/warehouse/*` | `ApiKey` | `validateApiKey` / `combinedAuth` / `authenticateWarehouse` | (Check admin routes) |
