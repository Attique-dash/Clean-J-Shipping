# Deploy Warehouse Backend

## Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and login
2. Click "Add New Project"
3. Import from GitHub or select your local project
4. For **Root Directory**, enter: `warehouse-backend`
5. For **Build Command**, enter: `npm run build`
6. For **Output Directory**, enter: `dist`
7. Add Environment Variables:
   - `KCD_API_KEY` = `XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq`
   - `MONGODB_URI` = (your MongoDB connection string)
8. Click Deploy

## Option 2: Deploy via CLI

```bash
cd warehouse-backend
npx vercel login
npx vercel --prod
```

## After Deploy - Test the Endpoints

Once deployed, test with:

```bash
node test-kcd-all-methods.js
```

## Important Environment Variables

Make sure these are set in Vercel:

| Variable | Value | Required |
|----------|-------|----------|
| `KCD_API_KEY` | `XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq` | ✅ Yes |
| `MONGODB_URI` | Your MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Your JWT secret | ✅ Yes |

## Troubleshooting

If tests still fail after deploy:
1. Check Vercel logs for the error message
2. Verify `KCD_API_KEY` is set correctly
3. Redeploy after any code changes
