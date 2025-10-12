"use client";

import { useEffect, useState } from "react";

type Summary = {
  total_packages: number;
  total_customers: number;
  packages_in_transit: number;
  total_revenue: number;
};

type Weekly = {
  packages_this_week: number;
  revenue_this_week: number;
  new_customers_this_week: number;
};

type Alerts = {
  packages_awaiting_invoice: number;
  packages_ready_for_pickup: number;
  overdue_payments: number;
};

type Activity = { action: string; description: string; timestamp: string };

type Report = {
  summary: Summary;
  weekly_stats: Weekly;
  alerts: Alerts;
  recent_activity: Activity[];
};

export default function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/summary", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load summary");
      setReport(data as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <button onClick={load} className="rounded-md border px-3 py-1.5 text-sm">Refresh</button>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {!report || loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat title="Total Packages" value={report.summary.total_packages} />
              <Stat title="Customers" value={report.summary.total_customers} />
              <Stat title="In Transit" value={report.summary.packages_in_transit} />
              <Stat title="Total Revenue" value={`$${report.summary.total_revenue.toFixed(2)}`} />
            </div>
          </section>

          <section>
            <h2 className="mt-6 mb-2 text-lg font-medium">This Week</h2>
            <div className="grid grid-cols-3 gap-3">
              <Stat title="Packages" value={report.weekly_stats.packages_this_week} />
              <Stat title="Revenue" value={`$${report.weekly_stats.revenue_this_week.toFixed(2)}`} />
              <Stat title="New Customers" value={report.weekly_stats.new_customers_this_week} />
            </div>
          </section>

          <section>
            <h2 className="mt-6 mb-2 text-lg font-medium">Alerts</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card title="Awaiting Invoice" value={report.alerts.packages_awaiting_invoice} />
              <Card title="Ready for Pickup" value={report.alerts.packages_ready_for_pickup} />
              <Card title="Overdue Payments" value={report.alerts.overdue_payments} />
            </div>
          </section>

          <section>
            <h2 className="mt-6 mb-2 text-lg font-medium">Recent Activity</h2>
            <div className="rounded-lg border border-neutral-800 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recent_activity.length === 0 ? (
                    <tr><td className="px-3 py-3" colSpan={3}>No recent activity</td></tr>
                  ) : (
                    report.recent_activity.map((a, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{new Date(a.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2 capitalize">{a.action.replaceAll('_',' ')}</td>
                        <td className="px-3 py-2">{a.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <div className="text-sm text-neutral-400">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <div className="text-sm text-neutral-400">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
