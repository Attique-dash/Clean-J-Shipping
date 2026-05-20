/**
 * Manual KCD endpoint test: Add → Update → Manifest → Delete
 *
 * Usage:
 *   node scripts/test-kcd-update-delete-manifest.mjs
 *
 * Env: MONGODB_URI, KCD_API_KEY (or from .env)
 * Base: KCD_API_BASE (default https://cleanjshipping.vercel.app)
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.KCD_API_KEY?.trim();
const BASE = (process.env.KCD_API_BASE || 'https://cleanjshipping.vercel.app').replace(
  /\/$/,
  ''
);
const USER_CODE = process.env.KCD_TEST_USER_CODE || 'EPXUUYE';
const SUFFIX = Date.now().toString().slice(-6);

const PACKAGES = {
  update: `KCD-UPDATE-${SUFFIX}`,
  manifest: `KCD-MANIFEST-${SUFFIX}`,
  delete: `KCD-DELETE-${SUFFIX}`,
};

if (!API_KEY) {
  console.error('Missing KCD_API_KEY in .env');
  process.exit(1);
}

async function request(label, method, urlPath, body) {
  const url = `${BASE}${urlPath}${urlPath.includes('?') ? '&' : '?'}id=${encodeURIComponent(API_KEY)}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  let json;
  try {
    json = await res.json();
  } catch {
    json = { raw: await res.text() };
  }
  const ok = res.ok && json.success !== false;
  console.log(`\n--- ${label} ---`);
  console.log(`${method} ${urlPath}`);
  console.log(`HTTP ${res.status} ${ok ? '✓' : '✗'}`);
  console.log(JSON.stringify(json, null, 2).slice(0, 1200));
  return { ok, status: res.status, json };
}

async function addPackage(trackingNumber, note) {
  return request('ADD PACKAGE', 'POST', '/api/kcd/packages/add', [
    {
      TrackingNumber: trackingNumber,
      UserCode: USER_CODE,
      Weight: 1,
      Shipper: 'Amazon',
      FirstName: 'Courtney',
      LastName: 'Patterson',
      Description: note,
      Pieces: 1,
    },
  ]);
}

async function main() {
  console.log('KCD API manual test');
  console.log('Base:', BASE);
  console.log('UserCode:', USER_CODE);
  console.log('Tracking numbers:', PACKAGES);

  const results = [];

  for (const [key, tn] of Object.entries(PACKAGES)) {
    const r = await addPackage(tn, `Test package for ${key}`);
    results.push({ step: `add-${key}`, ...r });
    if (!r.ok) {
      console.error(`\nStopped: could not create ${key} package`);
      process.exit(1);
    }
  }

  const updateTn = PACKAGES.update;
  results.push({
    step: 'update',
    ...(await request(
      'UPDATE PACKAGE',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(updateTn)}`,
      {
        TrackingNumber: updateTn,
        UserCode: USER_CODE,
        Weight: 2.5,
        Shipper: 'FedEx',
        Description: 'Updated by manual test script',
        PackageStatus: 1,
      }
    )),
  });

  const manifestTn = PACKAGES.manifest;
  results.push({
    step: 'manifest',
    ...(await request(
      'UPDATE MANIFEST',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(manifestTn)}/manifest`,
      {
        ManifestID: `MANIFEST-${SUFFIX}`,
        items: [{ description: 'Electronics', quantity: 1 }],
        totalValue: 99.5,
        currency: 'USD',
        weight: 2,
      }
    )),
  });

  const deleteTn = PACKAGES.delete;
  results.push({
    step: 'delete',
    ...(await request(
      'DELETE PACKAGE',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(deleteTn)}/delete`,
      {}
    )),
  });

  results.push({
    step: 'delete-verify',
    ...(await request(
      'GET AFTER DELETE (expect 404)',
      'GET',
      `/api/kcd/packages/${encodeURIComponent(deleteTn)}`,
      undefined
    )),
  });

  console.log('\n========== SUMMARY ==========');
  for (const r of results) {
    const icon = r.ok ? '✓' : r.status === 404 && r.step === 'delete-verify' ? '✓' : '✗';
    console.log(`${icon} ${r.step} → HTTP ${r.status}`);
  }

  const failed = results.filter(
    (r) => !r.ok && !(r.step === 'delete-verify' && r.status === 404)
  );
  if (failed.length) {
    console.log('\nSome steps failed. Deploy latest warehouse-backend to', BASE);
    process.exit(1);
  }
  console.log('\nAll steps passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
