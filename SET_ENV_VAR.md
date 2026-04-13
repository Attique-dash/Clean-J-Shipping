# Set KCD_API_KEY in Vercel

## Method 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Find your **warehouse-backend** project (not the main Clean-J-Shipping project)
3. Click on the project
4. Go to **Settings** tab
5. Click **Environment Variables** in the left menu
6. Add new variable:
   - **Name**: `KCD_API_KEY`
   - **Value**: `XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq`
   - **Environment**: Production (and Preview if needed)
7. Click **Save**
8. Go to **Deployments** tab
9. Find the latest deployment
10. Click the **...** menu → **Redeploy**

## Method 2: Vercel CLI

```bash
# Login to Vercel
npx vercel login

# Link to your warehouse-backend project
cd warehouse-backend
npx vercel link

# Add environment variable
npx vercel env add KCD_API_KEY production
# Enter value: XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq

# Deploy
npx vercel --prod
```

## Method 3: Add to Database as Fallback

If you can't set the env var immediately, add the key to the database:

```bash
# Run this after connecting to your MongoDB
node quick-add-key.mjs
```

## Verify It's Working

After setting the env var and redeploying:

```bash
node test-kcd-all-methods.js
```

You should see at least one test pass (preferably the `?id=TOKEN` or `APIToken in body` methods).
