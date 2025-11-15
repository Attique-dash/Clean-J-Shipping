"use client";

import Link from "next/link";

export default function WarehouseIntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="text-sm text-neutral-600">External Warehouse API endpoints available for system integration.</p>

      <Section
        title="Add Package"
        method="POST"
        path="/api/warehouse/addpackage/subdir"
        notes="Accepts array of package objects. Auth via x-warehouse-key header or APIToken in body."
      />
      <Section
        title="Edit Package"
        method="POST"
        path="/api/warehouse/editpackage/subdir"
        notes="Updates existing packages; adds history entry if status changed."
      />
      <Section
        title="Delete Package"
        method="POST"
        path="/api/warehouse/deletepackage/subdir"
        notes="Soft deletes (status → 'Deleted'). Accepts array or single object."
      />
      <Section
        title="Update Manifest"
        method="POST"
        path="/api/warehouse/updatemanifest/subdir"
        notes="Links packages to manifestId using tracking/control numbers. Flexible manifest payload."
      />
      <Section
        title="Pull Customers"
        method="GET"
        path="/api/warehouse/pullcustomer/subdir?id=APITOKEN"
        notes="Returns array of customers with user codes and service types."
      />
    </div>
  );
}

function Section({ title, method, path, notes }: { title: string; method: string; path: string; notes?: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-medium">{title}</div>
          <div className="text-xs text-neutral-600 mt-1">{method} {path}</div>
        </div>
        <Link href={path} className="rounded border px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50">Open</Link>
      </div>
      {notes && <div className="text-sm text-neutral-600 mt-2">{notes}</div>}
    </div>
  );
}
