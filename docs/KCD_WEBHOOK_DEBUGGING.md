# KCD Logistics Webhook Integration - Debugging Guide

## Quick Summary

**Endpoint:** `POST https://cleanjshipping.vercel.app/api/kcd/packages/add`
**Auth Header:** `X-API-Key: XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY`

---

## 1. How to Log Incoming Requests

### A. View Logs on Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project `cleanjshipping`
3. Click on "Logs" tab
4. Filter by:
   - Function: `api/kcd/packages/add`
   - Time range: Last hour/day
   - Status: All (to see both successes and failures)

### B. Real-time Log Streaming (CLI)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Stream logs in real-time
vercel logs cleanjshipping.vercel.app --json

# Filter for KCD webhook logs only
vercel logs cleanjshipping.vercel.app --json | grep "KCD Webhook"
```

### C. View Request Logs via API
Send a GET request to the same endpoint to view recent request logs:
```bash
curl -X GET \
  https://cleanjshipping.vercel.app/api/kcd/packages/add \
  -H "X-API-Key: XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY"
```

### D. Console Logging in Code
The webhook already includes extensive logging. Look for these patterns in Vercel logs:
```
[KCD Webhook <request-id>] Received request at <timestamp>
[KCD Webhook <request-id>] Headers: {...}
[KCD Webhook <request-id>] API key validated
[KCD Webhook <request-id>] Body: {...}
[KCD Webhook <request-id>] User found: <user-id>
[KCD Webhook <request-id>] Package created: <package-id>
[KCD Webhook <request-id>] Success - Package created
```

---

## 2. Common Webhook Failure Causes (Silent Failures)

### Authentication Issues
| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing API Key | 401 Unauthorized | Ensure `X-API-Key` header is present |
| Wrong API Key | 401 Unauthorized | Verify key matches: `XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY` |
| Key not configured | 401 Unauthorized | Set `KCD_API_KEY` in Vercel environment variables |

### Askenish / Tasoko proxy (browser “Play” vs Postman)

- The portal calls **`POST …/api/Courier/TestCourierProvider`** on the **Tasoko Azure API** first. That service forwards to your `cleanjshipping.vercel.app` URL. A **500** in DevTools is often thrown by **Azure** when the forward fails or throws, not by Vercel. Open the failing request → **Response** tab to see the JSON body from Azure or from your API.
- Auth is resolved in this order: **`x-api-key` / `Authorization` headers**, then **`?id=` / `?apiToken=` / `?token=`** query params, then **`?content={"apiToken":"…"}`**, then **JSON body** (`token`, `APIToken`, `apiToken`), then optional **`KCD_API_KEY`** env fallback for customers and package webhooks when no token is present.
- **Get customers** supports **`POST /api/kcd/customers`** with the same auth rules as GET (Tasoko proxies often use POST for every outbound call).

### CORS Issues (for browser-based requests)
- **Symptom:** Browser console shows CORS errors
- **Note:** CORS only affects browser requests, not server-to-server webhooks
- **Fix:** KCD should send webhook from server-side, not browser

### Payload Format Issues
| Issue | Symptom | Fix |
|-------|---------|-----|
| Invalid JSON | 400 Bad Request | Ensure valid JSON syntax |
| Missing trackingNumber | 400 Bad Request | Required field |
| Missing customerMailbox | 400 Bad Request | Required field (maps to userCode) |
| Wrong content-type | 400 or silent fail | Use `Content-Type: application/json` |

### SSL/TLS Issues
| Issue | Symptom | Fix |
|-------|---------|-----|
| SSL certificate error | Connection refused | Ensure KCD calls HTTPS, not HTTP |
| Outdated TLS | Connection fails | Vercel requires TLS 1.2+ |

### Network/Firewall Issues
| Issue | Symptom | Fix |
|-------|---------|-----|
| DNS resolution failure | Host not found | Check domain: `cleanjshipping.vercel.app` |
| Firewall blocking | Timeout | Whitelist Vercel IPs if needed |
| Request timeout | 504 Gateway Timeout | Response must complete within 60s |

### Silent Failures on KCD Side
| Issue | Symptom | Fix |
|-------|---------|-----|
| Webhook not triggered | No logs on Vercel | Check KCD's webhook configuration |
| Wrong endpoint URL | 404 Not Found | Verify URL: `/api/kcd/packages/add` |
| HTTP instead of HTTPS | Various errors | Must use HTTPS |
| Retry logic not working | Intermittent failures | Implement exponential backoff |

---

## 3. Testing with Postman

### Import the Collection
1. Open Postman
2. Click "Import" → "Upload Files"
3. Select `docs/kcd-webhook-postman-collection.json`

### Test Sequence
1. **Test 1 - Valid Payload**: Should return `201 Created`
2. **Test 2 - Missing API Key**: Should return `401 Unauthorized`
3. **Test 3 - Invalid API Key**: Should return `401 Unauthorized`
4. **Test 4 - Missing Fields**: Should return `400 Bad Request`
5. **Test 5 - Invalid JSON**: Should return `400 Bad Request`
6. **Test 6 - Duplicate**: Should return `409 Conflict`
7. **Test 7 - View Logs**: Should show recent request history

### Manual cURL Test
```bash
# Success case
curl -X POST \
  https://cleanjshipping.vercel.app/api/kcd/packages/add \
  -H "Content-Type: application/json" \
  -H "X-API-Key: XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY" \
  -d '{
    "trackingNumber": "TBA3295097",
    "houseNumber": "CLEAN0000001",
    "customerMailbox": "CLEAN-0007",
    "weight": "2.5",
    "shipper": "Amazon",
    "receivedAt": "2026-03-23T10:12:00Z"
  }'

# Check logs
curl -X GET \
  https://cleanjshipping.vercel.app/api/kcd/packages/add \
  -H "X-API-Key: XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY"
```

---

## 4. Checklist for KCD Support Team

### Configuration Verification
- [ ] Webhook URL is set to: `https://cleanjshipping.vercel.app/api/kcd/packages/add`
- [ ] HTTP method is set to: `POST`
- [ ] `X-API-Key` header is included with value: `XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY`
- [ ] `Content-Type` header is set to: `application/json`
- [ ] Request body is valid JSON (not form-encoded)

### Payload Format
```json
{
  "trackingNumber": "string (required)",
  "houseNumber": "string (optional)",
  "customerMailbox": "string (required - maps to userCode)",
  "weight": "number or string (optional)",
  "shipper": "string (optional)",
  "receivedAt": "ISO 8601 datetime (optional)"
}
```

### Required Fields
- `trackingNumber` - Package tracking number (must be unique)
- `customerMailbox` - Maps to CleanJ userCode (e.g., "CLEAN-0007")

### Testing Steps for KCD
1. [ ] Send a test webhook using the sample payload above
2. [ ] Verify response status is `201 Created`
3. [ ] Check response body contains `success: true` and `package.id`
4. [ ] If 404, verify the URL path is exactly `/api/kcd/packages/add`
5. [ ] If 401, verify the API key header and value
6. [ ] If 400, verify all required fields are present and valid JSON

### Troubleshooting Info to Request from KCD
1. **Webhook logs from KCD's system** - Show the HTTP request/response
2. **Error messages** - Any error details from their webhook sender
3. **Request timing** - When the webhook was triggered
4. **Payload example** - Actual JSON body they are sending
5. **Network diagnostics** - Can they ping/resolve `cleanjshipping.vercel.app`?

### Questions to Ask KCD
1. "What HTTP status code are you receiving from our endpoint?"
2. "What error message (if any) is displayed in your logs?"
3. "Can you share a sample of the exact JSON payload being sent?"
4. "Are you sending from a server or a browser?"
5. "Do you see any SSL/TLS errors?"
6. "Have you tested the endpoint with curl or Postman?"

---

## 5. Environment Variables Required

Add these to your Vercel project settings:

| Variable | Value | Required |
|----------|-------|----------|
| `KCD_API_KEY` | `XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY` | Yes |
| `MONGODB_URI` | Your MongoDB connection string | Yes |
| `ADMIN_API_KEY` | Same as KCD_API_KEY for log viewing | No |

---

## 6. Expected Response Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 201 | Package created successfully | ✅ Success |
| 400 | Invalid request (JSON or missing fields) | Fix payload |
| 401 | Authentication failed | Check API key |
| 404 | Endpoint not found | Check URL |
| 409 | Duplicate tracking number | Package already exists |
| 500 | Server error | Check Vercel logs |

---

## 7. Next Steps

1. **Verify environment variables are set** in Vercel
2. **Deploy the latest code** to production
3. **Run Postman tests** to confirm endpoint works
4. **Share checklist with KCD** support team
5. **Monitor Vercel logs** when KCD tests the connection
6. **Check database** for new package entries after successful tests
