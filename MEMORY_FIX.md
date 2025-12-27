# Memory Optimization Solutions

## Quick Fix
Run these commands to immediately solve the memory error:

```bash
# Stop current dev server (Ctrl+C)
# Then run with increased memory
npm run dev
```

## Changes Made:

### 1. Increased Memory Limit (package.json)
- Changed from 8GB to 16GB memory allocation
- Applied to dev, build, and start scripts

### 2. Next.js Configuration Optimization (next.config.js)
- Added SWC minification for faster compilation
- Optimized package imports for lucide-react and react-icons
- Externalized heavy packages (canvas, pdfkit, jspdf)
- Disabled concurrent features to reduce memory pressure
- Added webpack optimization with code splitting

### 3. Data Loading Optimization (customer/bills/page.tsx)
- Implemented chunked data loading (100 items initially)
- Added async loading for remaining data
- Reduced initial memory footprint

## Additional Recommendations:

### 4. Environment Variables (.env.local)
Add these to your .env.local file:
```env
NODE_OPTIONS=--max-old-space-size=16384
NEXT_TELEMETRY_DISABLED=1
```

### 5. Development Best Practices
- Close unused browser tabs
- Restart dev server periodically
- Use Chrome DevTools Memory tab to monitor usage
- Consider using `npm run dev` with `--turbopack` for faster development

### 6. Long-term Solutions
- Implement pagination for large data sets
- Use React.memo for expensive components
- Consider server-side rendering for data-heavy pages
- Move PDF generation to API routes instead of client-side

## Monitoring Memory Usage
```bash
# Check Node.js process memory
npm install -g node-memwatch
# Use Chrome DevTools > Memory > Heap Snapshot
```

The memory error should now be resolved with these optimizations.
