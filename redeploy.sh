#!/bin/bash
set -e

echo "🚀 Redeploying warehouse-backend with KCD fixes..."
echo "================================================"

cd /Users/apple/Desktop/uiback/Clean-J-Shipping/warehouse-backend

echo ""
echo "Step 1: Building TypeScript..."
npm run build

echo ""
echo "Step 2: Checking dist/middleware/authKcd.js exists..."
if [ -f "dist/middleware/authKcd.js" ]; then
    echo "✅ Build successful - authKcd.js found"
    echo ""
    echo "Checking for KCD_API_KEY in compiled code..."
    if grep -q "KCD_API_KEY" dist/middleware/authKcd.js; then
        echo "✅ KCD_API_KEY check is present in compiled code"
    else
        echo "❌ KCD_API_KEY check NOT found in compiled code"
        echo "The source fixes may not be saved properly"
        exit 1
    fi
else
    echo "❌ Build failed - authKcd.js not found"
    exit 1
fi

echo ""
echo "Step 3: Deploying to Vercel..."
echo "Run: npx vercel --prod"
npx vercel --prod

echo ""
echo "================================================"
echo "✅ Deployment complete!"
echo "Run test: node test-kcd-all-methods.js"
echo "================================================"
