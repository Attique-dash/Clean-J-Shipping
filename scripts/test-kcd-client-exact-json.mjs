/**
 * Test Update / Delete / Manifest with exact Askenish client JSON payloads.
 *
 * Usage:
 *   KCD_API_KEY=... node scripts/test-kcd-client-exact-json.mjs
 *
 * Optional: KCD_API_BASE, KCD_SKIP_DELETE=1, KCD_RESTORE_AFTER=1
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY =
  process.env.KCD_API_KEY?.trim() ||
  'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';
const BASE = (process.env.KCD_API_BASE || 'https://cleanjshipping.vercel.app').replace(
  /\/$/,
  ''
);
const TRACKING = 'DROPOFF-20240902-225642-547';
const SKIP_DELETE = process.env.KCD_SKIP_DELETE === '1';
const RESTORE_AFTER = process.env.KCD_RESTORE_AFTER !== '0';

const CLIENT_PACKAGE = [
  {
    PackageID: '83383d43-a368-4fc1-a216-9e54e8ae7227',
    CourierID: '15fff123-f237-4571-b92a-ae69427d7a56',
    ManifestID: '',
    CollectionID: '',
    TrackingNumber: TRACKING,
    ControlNumber: 'EP0096513',
    FirstName: 'Courtney',
    LastName: 'Patterson',
    UserCode: 'EPXUUYE',
    Weight: 1,
    Shipper: 'Amazon',
    EntryStaff: '',
    EntryDate: '2024-09-02T00:00:00-05:00',
    EntryDateTime: '2024-09-02T21:55:51.1806146-05:00',
    Branch: 'Down Town',
    Claimed: false,
    APIToken: API_KEY,
    ShowControls: false,
    ManifestCode: '',
    CollectionCode: '',
    Description: 'Merchandise from Amazon',
    HSCode: '',
    Unknown: false,
    AIProcessed: false,
    OriginalHouseNumber: '',
    Cubes: 0,
    Length: 0,
    Width: 0,
    Height: 0,
    Pieces: 1,
    Discrepancy: false,
    DiscrepancyDescription: '',
    ServiceTypeID: '',
    HazmatCodeID: '',
    Coloaded: false,
    ColoadIndicator: '',
  },
];

const CLIENT_MANIFEST = {
  APIToken: API_KEY,
  CollectionCodes: ['EP0004960LB', 'EP0004997PA'],
  PackageAWBs: ['EP123456', 'DC123456', TRACKING],
  Manifest: {
    ManifestID: '012e9e3c-7c45-4a87-94e8-b6c277589863',
    CourierID: '3b2a5937-3299-497e-83cd-8c4cdd004aab',
    ServiceTypeID: '59cadcd4-7508-450b-85aa-9ec908d168fe',
    ManifestStatus: '0',
    ManifestCode: 'DC-2024-08-19-1012',
    FlightDate: '2024-10-25T00:00:00',
    Weight: 256,
    ItemCount: 1,
    ManifestNumber: 1012,
    StaffName: 'Entry Staff Name',
    EntryDate: '2024-10-23T08:00:00',
    EntryDateTime: '2024-10-23T12:30:00',
    AWBNumber: '810-1234567',
  },
};

async function request(label, method, urlPath, body) {
  const sep = urlPath.includes('?') ? '&' : '?';
  const url = `${BASE}${urlPath}${sep}id=${encodeURIComponent(API_KEY)}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  let json;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  const ok = res.ok && json.success !== false;
  console.log(`\n--- ${label} ---`);
  console.log(`${method} ${urlPath}`);
  console.log(`HTTP ${res.status} ${ok ? 'OK' : 'FAIL'}`);
  console.log(JSON.stringify(json, null, 2).slice(0, 2000));
  return { ok, status: res.status, json };
}

async function main() {
  console.log('KCD client JSON test');
  console.log('Base:', BASE);
  console.log('Tracking:', TRACKING);

  const results = [];

  results.push({
    step: 'get-before',
    ...(await request('GET PACKAGE (before)', 'GET', `/api/kcd/packages/${encodeURIComponent(TRACKING)}`)),
  });

  const updatePayload = JSON.parse(JSON.stringify(CLIENT_PACKAGE));
  updatePayload[0].Weight = 1.5;
  updatePayload[0].Description = 'Merchandise from Amazon (updated test)';

  results.push({
    step: 'update',
    ...(await request(
      'UPDATE PACKAGE (client array JSON)',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(TRACKING)}`,
      updatePayload
    )),
  });

  results.push({
    step: 'manifest-add',
    ...(await request(
      'MANIFEST ADD (client object JSON)',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(TRACKING)}/manifest`,
      CLIENT_MANIFEST
    )),
  });

  results.push({
    step: 'manifest-remove',
    ...(await request(
      'MANIFEST REMOVE (RemoveFromManifest)',
      'POST',
      `/api/kcd/packages/${encodeURIComponent(TRACKING)}/manifest`,
      { APIToken: API_KEY, RemoveFromManifest: true }
    )),
  });

  if (!SKIP_DELETE) {
    results.push({
      step: 'delete',
      ...(await request(
        'DELETE PACKAGE (client array JSON)',
        'POST',
        `/api/kcd/packages/${encodeURIComponent(TRACKING)}/delete`,
        CLIENT_PACKAGE
      )),
    });

    results.push({
      step: 'get-after-delete',
      ...(await request(
        'GET AFTER DELETE (expect 404)',
        'GET',
        `/api/kcd/packages/${encodeURIComponent(TRACKING)}`
      )),
    });

    if (RESTORE_AFTER) {
      results.push({
        step: 'restore-add',
        ...(await request(
          'RESTORE — ADD PACKAGE',
          'POST',
          '/api/kcd/packages/add',
          CLIENT_PACKAGE
        )),
      });
    }
  }

  console.log('\n========== SUMMARY ==========');
  for (const r of results) {
    const expect404 = r.step === 'get-after-delete' && r.status === 404;
    const icon = r.ok || expect404 ? 'PASS' : 'FAIL';
    console.log(`${icon} ${r.step} → HTTP ${r.status}`);
  }

  const failed = results.filter(
    (r) => !r.ok && !(r.step === 'get-after-delete' && r.status === 404)
  );
  if (failed.length) {
    console.log('\nSome steps failed.');
    process.exit(1);
  }
  console.log('\nAll steps passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
