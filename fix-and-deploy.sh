#!/bin/bash
# Fix and Deploy Script for KCD API

echo "======================================"
echo "KCD API Fix and Deploy Script"
echo "======================================"

# Step 1: Verify KCD_API_KEY is set
echo ""
echo "Step 1: Checking environment variables..."
echo "KCD_API_KEY should be: XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq"

# Step 2: Add API key to database as backup
echo ""
echo "Step 2: Creating script to add API key to database..."
cat > add-api-key.js << 'EOF'
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';
const API_KEY = 'XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq';

async function addApiKey() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const ApiKeySchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      name: { type: String, default: 'KCD API Key' },
      courierCode: { type: String, default: 'CLEANJ' },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
    });
    
    const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);
    
    // Check if key already exists
    const existing = await ApiKey.findOne({ key: API_KEY });
    if (existing) {
      console.log('✓ API key already exists in database');
      process.exit(0);
    }
    
    // Add the key
    await ApiKey.create({
      key: API_KEY,
      name: 'KCD Askenish Key',
      courierCode: 'CLEANJ',
      isActive: true
    });
    
    console.log('✓ API key added to database successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addApiKey();
EOF

echo "To add API key to database, run: node add-api-key.js"

# Step 3: Deploy instructions
echo ""
echo "Step 3: Deployment Instructions"
echo "======================================"
echo ""
echo "Option A: Deploy via Vercel Dashboard (Recommended)"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Find your cleanjshipping project"
echo "3. Go to Settings → Environment Variables"
echo "4. Add: KCD_API_KEY = XoZedbLJE0neONu5EVN3CE2xGkOw9ggwCSysjrGpjF2S2Kq"
echo "5. Click 'Redeploy' on the latest deployment"
echo ""
echo "Option B: Deploy warehouse-backend separately"
echo "1. cd warehouse-backend"
echo "2. npm run build"
echo "3. npx vercel --prod"
echo ""
echo "======================================"
echo "After deployment, test with:"
echo "  node test-kcd-all-methods.js"
echo "======================================"
