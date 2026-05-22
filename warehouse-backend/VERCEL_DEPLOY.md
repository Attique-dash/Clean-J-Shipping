# Deploy warehouse-backend on Vercel

## 1. Project settings (monorepo)

If the Git repo root is `Clean-J-Shipping` (not only `warehouse-backend`):

1. Vercel → **warehouse-backend** project → **Settings** → **General**
2. Set **Root Directory** to `warehouse-backend`
3. Save, then redeploy

## 2. Required environment variables

Add these in **Settings → Environment Variables**. Enable **Production**, **Preview**, and **Development** for each.

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | Yes | Long random secret for auth tokens |
| `NODE_ENV` | Recommended | `production` |
| `CORS_ORIGIN` | Recommended | Your frontend URL(s), comma-separated |

Optional: see `vercel-env.example` for SMTP, rate limits, etc.

**Important:** After adding or changing variables, you must **Redeploy**. Existing deployments do not pick up new env vars.

## 3. Redeploy

1. **Deployments** tab → latest deployment → **⋯** → **Redeploy**
2. Or push a new commit to trigger a build

## 4. Verify

- Open `https://<your-deployment>.vercel.app/health` — should return JSON with `"status":"OK"`
- If you still see `MONGODB_URI is required`:
  - Confirm the variable name is exactly `MONGODB_URI` (not `MONGO_URI` or `DATABASE_URL`)
  - Confirm the value is not empty (re-enter the Atlas URI when using Sensitive)
  - Confirm **JWT_SECRET** is also set
  - Redeploy again

## 5. MongoDB Atlas

Allow Vercel serverless IPs: Atlas → **Network Access** → add `0.0.0.0/0` (or Vercel's IP ranges if you restrict access).
