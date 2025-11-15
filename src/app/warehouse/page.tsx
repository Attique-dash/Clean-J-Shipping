"use client";

import Link from "next/link";

export default function WarehouseDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Warehouse Dashboard</h1>
      <p className="text-sm text-neutral-600">Quick access to core actions.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Account" href="/warehouse/account" desc="View and edit your profile, branch, and password." />
        <Card title="Packages" href="/warehouse/packages" desc="Add, update, or delete packages." />
        <Card title="Manifests" href="/warehouse/manifests" desc="Create or update shipment manifests." />
        <Card title="Customers" href="/warehouse/customers" desc="Search customers and manage records." />
      </div>
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow md:p-6">
      <div className="text-base font-medium">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{desc}</div>
    </Link>
  );
}
