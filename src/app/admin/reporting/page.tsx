import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export default async function ReportingPage() {
  await dbConnect();

  // Date ranges
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Top KPIs
  const [totalPackages, totalCustomers, inTransit, revenueThisWeek] = await Promise.all([
    Package.countDocuments({ status: { $ne: "Deleted" } }),
    User.countDocuments({ role: "customer" }),
    Package.countDocuments({ status: "In Transit" }),
    Payment.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, status: { $ne: "failed" } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).then((r) => (r[0]?.sum as number) || 0),
  ]);

  // Weekly stats
  const [packagesThisWeek, newCustomersThisWeek] = await Promise.all([
    Package.countDocuments({ createdAt: { $gte: weekAgo }, status: { $ne: "Deleted" } }),
    User.countDocuments({ role: "customer", createdAt: { $gte: weekAgo } }),
  ]);

  // Alerts
  const [awaitingInvoice, readyForPickup, largePayments] = await Promise.all([
    // Heuristic: packages missing invoiceRecords
    Package.countDocuments({ status: { $ne: "Deleted" }, $or: [{ invoiceRecords: { $exists: false } }, { invoiceRecords: { $size: 0 } }] }),
    Package.countDocuments({ status: "At Warehouse" }),
    Payment.countDocuments({ amount: { $gt: 1000 }, createdAt: { $gte: weekAgo } }),
  ]);

  function formatCurrency(v: number) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reporting & Analytics</h1>
        <div className="text-sm text-gray-500">Admin Dashboard</div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Packages" value={String(totalPackages)} />
        <KpiCard label="Customers" value={String(totalCustomers)} />
        <KpiCard label="In-Transit" value={String(inTransit)} />
        <KpiCard label="Revenue" value={formatCurrency(revenueThisWeek)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Weekly Statistics */}
        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 font-medium">Weekly Statistics</div>
          <div className="p-4 space-y-4 text-sm">
            <StatRow name="Packages" value={`${packagesThisWeek} this week`} level={packagesThisWeek} color="bg-gray-800" />
            <StatRow name="Revenue" value={`${formatCurrency(revenueThisWeek)} this week`} level={Math.min(10, Math.ceil(revenueThisWeek / 500))} color="bg-emerald-600" />
            <StatRow name="Customers" value={`${newCustomersThisWeek} new this week`} level={newCustomersThisWeek} color="bg-orange-500" />
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 font-medium">Alerts & Notifications</div>
          <div className="p-4 space-y-3 text-sm text-gray-700">
            <AlertRow icon="⚠️" text={`${awaitingInvoice} packages awaiting invoice`} />
            <AlertRow icon="✅" text={`${readyForPickup} packages ready for pickup`} />
            <AlertRow icon="📢" text={`${largePayments} oversize payments`} />

            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link href="/admin/receivals" className="rounded-md border px-3 py-2 text-center text-sm hover:bg-gray-50">Add Package</Link>
              <Link href="/admin/customers" className="rounded-md border px-3 py-2 text-center text-sm hover:bg-gray-50">Create User</Link>
              <Link href="/admin/customers" className="rounded-md border px-3 py-2 text-center text-sm hover:bg-gray-50">Create User</Link>
              <Link href="/admin/reporting?download=packages" className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm text-white hover:bg-blue-700">Generate Report</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatRow({ name, value, level, color }: { name: string; value: string; level: number; color: string }) {
  const bars = Math.max(1, Math.min(10, Math.floor(level)));
  return (
    <div className="grid items-center gap-3 sm:grid-cols-3">
      <div className="text-gray-600">{name}:</div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`h-2 w-6 rounded ${i < bars ? color : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="text-right text-gray-800">{value}</div>
    </div>
  );
}

function AlertRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
