import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { PreAlert } from "@/models/PreAlert";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import Link from "next/link";

export default async function AdminDashboard() {
  await dbConnect();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    totalPackages,
    newToday,
    pendingAlerts,
    revenueAgg,
    recentPackages,
    recentPayments,
    recentCustomers,
    preAlertsList,
  ] = await Promise.all([
    Package.countDocuments({}),
    Package.countDocuments({ createdAt: { $gte: startOfToday, $lt: endOfToday } }),
    PreAlert.countDocuments({ status: "submitted" }),
    Payment.aggregate([
      { $match: { status: "captured", createdAt: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Package.find({}, { trackingNumber: 1, status: 1, updatedAt: 1, userCode: 1 }).sort({ updatedAt: -1 }).limit(5).lean<{
      trackingNumber: string;
      status: string;
      updatedAt: Date;
      userCode?: string;
      _id: unknown;
    }>(),
    Payment.find({ status: "captured" }, { amount: 1, userCode: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).lean<{
      amount: number;
      userCode: string;
      createdAt: Date;
      _id: unknown;
    }>(),
    User.find({ role: "customer" }, { email: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).lean<{
      email: string;
      createdAt: Date;
      _id: unknown;
    }>(),
    PreAlert.find({}, { trackingNumber: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(6).lean<{
      trackingNumber: string;
      status: string;
      createdAt: Date;
      _id: unknown;
    }>(),
  ]);

  const revenueToday = Number(revenueAgg?.[0]?.total || 0);

  type Activity = { time: Date; text: string; right?: string };
  const activities: Activity[] = [];
  recentPackages.forEach((p) => {
    activities.push({ time: new Date(p.updatedAt), text: `Package ${p.trackingNumber} ${p.status}` });
  });
  recentPayments.forEach((pay) => {
    activities.push({ time: new Date(pay.createdAt), text: `Payment captured $${pay.amount.toFixed(2)}`, right: pay.userCode });
  });
  recentCustomers.forEach((u) => {
    activities.push({ time: new Date(u.createdAt), text: `New customer registered`, right: u.email });
  });
  activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  const recent = activities.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page header */}
      <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Welcome back, Admin! ✌️</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Link href="/admin/packages" className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add Package</Link>
            <Link href="/admin/reports" className="inline-flex items-center rounded-md bg-[#0f4d8a] px-3 py-2 text-sm font-medium text-white hover:bg-[#0e447d]">View Reports</Link>
          </div>
        </div>
      </section>

      {/* Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <span>🔗</span>
              <span>Today’s Overview</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi title="Total Pkgs" value={totalPackages} />
              <Kpi title="New Today" value={newToday} />
              <Kpi title="Pending Alerts" value={pendingAlerts} />
              <Kpi title="Revenue Today" value={`$${revenueToday.toFixed(2)}`} />
              {/* Extra KPI card with manage action to mirror the visual */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500">Revenue Today</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">${revenueToday.toFixed(0)}K</div>
                <div className="mt-2">
                  <Link href="/admin/transactions" className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800">Manage</Link>
                </div>
              </div>
            </div>
          </section>

          {/* Immediate Actions Needed */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-gray-800">
              <span>⚡</span>
              <span className="font-medium">Immediate Actions Needed</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                <span>{pendingAlerts} pre-alerts submitted awaiting review</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                <span>{newToday} new packages created today</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                <span>Verify payments captured today totaling ${revenueToday.toFixed(2)}</span>
              </li>
            </ul>
          </section>

          {/* Recent Activity full table */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 font-medium">Recent Activity</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Event</th>
                    <th className="px-3 py-2 text-right">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recent.map((a, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{a.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-2">{a.text}</td>
                      <td className="px-3 py-2 text-right">
                        {a.right ? (
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">{a.right}</span>
                        ) : (
                          <Link href="/admin/packages" className="inline-flex items-center rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800">Manage</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pre-Alerts table (left side, under activity) */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 font-medium">Pre-Alerts</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Tracking #</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preAlertsList.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{p.trackingNumber}</td>
                      <td className="px-3 py-2">{p.status}</td>
                      <td className="px-3 py-2 text-right">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right widgets */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 font-medium">Overview</div>
            {/* Simple bar chart placeholder */}
            <div className="flex items-end gap-2 h-24">
              {[12, 18, 8, 16, 10, 20, 14].map((h, i) => (
                <div key={i} className="w-6 rounded bg-blue-200" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
          </section>

          {/* Compact Pre-Alerts widget */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium">Pre-Alerts</div>
            <ul className="space-y-2 text-sm">
              {preAlertsList.slice(0, 4).map((p, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="truncate">{p.trackingNumber}</span>
                  <span className="text-gray-500">{p.status}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick Actions */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium">Quick Actions</div>
            <div className="flex gap-2">
              <Link href="/admin/packages" className="inline-flex flex-1 items-center justify-center rounded-md bg-[#0f4d8a] px-3 py-2 text-sm font-medium text-white hover:bg-[#0e447d]">Add Package</Link>
              <Link href="/admin/reports" className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">View Reports</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Avatar({ children }: { children: React.ReactNode }) {
  return <div className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">{children}</div>;
}
