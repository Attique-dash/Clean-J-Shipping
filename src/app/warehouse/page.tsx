"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { User, Package, FileText, TrendingUp, AlertCircle, Calendar, Weight, Upload, RefreshCw, Clock, ChevronRight, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const StatusPieChart = dynamic(
  () => import('@/components/charts/StatusPieChart').then(mod => mod.StatusPieChart),
  { ssr: false }
);

type Analytics = {
  totalPackages?: number;
  statusCounts: Record<string, number>;
  today: { packages: number; weight: number; delivered?: number };
  weeklyTrend: { _id: string; count: number }[];
  monthly: { total: number; delivered: number; inTransit: number };
  topCustomers: { _id: string; packageCount: number; totalWeight: number }[];
  totalCustomers: number;
  readyToShip?: number;
  avgProcessingTime?: number;
};

export default function WarehouseDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/warehouse/analytics", { 
        cache: "no-store",
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/warehouse/login';
          return;
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching warehouse analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Update the status count access with correct database values
  const activePackages = Object.entries(analytics?.statusCounts || {}).reduce((sum, [status, count]) => {
    // Consider all active statuses (non-delivered packages)
    const activeStatuses = ["pending", "received", "in_processing", "ready_to_ship", "shipped", "in_transit", "out_for_delivery"];
    return activeStatuses.includes(status) ? sum + count : sum;
  }, 0);
  const inTransit = analytics?.statusCounts?.["in_transit"] ?? 0;
  const delivered = analytics?.statusCounts?.["delivered"] ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Animated Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10">
          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-widest text-blue-100">Warehouse Management</p>
                    <h1 className="text-3xl font-bold leading-tight md:text-4xl">Dashboard</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last updated: {lastUpdated.toLocaleTimeString()}
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Data Loaded
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={fetchAnalytics}
                    disabled={loading}
                    className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
                  >
                    <RefreshCw className={`h-4 w-4 transition-transform ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          {loading && !analytics ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
            </div>
          ) : error && !analytics ? (
            <ErrorState error={error} onRetry={fetchAnalytics} />
          ) : (
            <div className="space-y-6">
              {/* Today's Activity Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Today&apos;s Activity
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                      label="Total Packages" 
                      value={String(analytics?.totalPackages ?? 0)} 
                      color="blue"
                      icon={<Package className="w-5 h-5" />}
                    />
                    <StatCard 
                      label="Active Packages" 
                      value={String(activePackages)} 
                      color="blue"
                      icon={<Package className="w-5 h-5" />}
                    />
                    <StatCard 
                      label="Delivered Today" 
                      value={String(analytics?.today?.delivered ?? 0)} 
                      color="green"
                      icon={<TrendingUp className="w-5 h-5" />}
                    />
                    <StatCard 
                      label="Total Weight Today" 
                      value={`${(analytics?.today?.weight ?? 0).toFixed(2)} kg`} 
                      color="orange"
                      icon={<Weight className="w-5 h-5" />}
                    />
                  </div>
                </div>
              </div>

              {/* Package Status Overview Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Package Status Overview
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pie Chart */}
                    <div className="group overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">Status Distribution</h3>
                      </div>
                      <div className="p-6">
                        <div className="h-64">
                          <StatusPieChart data={[
                            { status: "Received", count: analytics?.statusCounts?.["received"] || 0, percentage: 0 },
                            { status: "In Processing", count: analytics?.statusCounts?.["in_processing"] || 0, percentage: 0 },
                            { status: "Ready to Ship", count: analytics?.statusCounts?.["ready_to_ship"] || 0, percentage: 0 },
                            { status: "In Transit", count: inTransit, percentage: 0 },
                            { status: "Delivered", count: delivered, percentage: 0 },
                          ].filter(item => item.count > 0).map(item => ({
                            ...item,
                            percentage: ((item.count / (activePackages + inTransit + delivered || 1)) * 100).toFixed(1)
                          }))} />
                        </div>
                      </div>
                    </div>
                    {/* Status Cards */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <StatusCard label="Received" value={analytics?.statusCounts?.["received"] || 0} color="blue" />
                      <StatusCard label="In Processing" value={analytics?.statusCounts?.["in_processing"] || 0} color="orange" />
                      <StatusCard label="Ready to Ship" value={analytics?.statusCounts?.["ready_to_ship"] || 0} color="blue" />
                      <StatusCard label="In Transit" value={inTransit} color="orange" />
                      <StatusCard label="Delivered" value={delivered} color="green" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Statistics Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Monthly Statistics
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Total This Month</p>
                      <p className="text-2xl sm:text-3xl font-bold text-[#0f4d8a]">
                        {analytics?.monthly?.total ?? 0}
                      </p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Delivered</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-600">
                        {analytics?.monthly?.delivered ?? 0}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">In Transit</p>
                      <p className="text-2xl sm:text-3xl font-bold text-[#E67919]">
                        {analytics?.monthly?.inTransit ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Customers Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Top Customers
                    </h2>
                    <Link href="/warehouse/customers" className="text-sm font-medium text-white/80 hover:text-white flex items-center">
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Customer Code</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Packages</th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(analytics?.topCustomers ?? []).slice(0, 5).map((customer, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 sm:px-6 py-4">
                              <code className="font-mono font-bold text-[#0f4d8a] text-sm">{customer._id}</code>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right font-semibold">{customer.packageCount}</td>
                            <td className="px-4 sm:px-6 py-4 text-right text-sm">{(customer.totalWeight || 0).toFixed(2)} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Quick Actions
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <ActionCard 
                      title="Account" 
                      href="/warehouse/account" 
                      desc="View and edit your profile"
                      icon={<User className="w-6 h-6" />}
                      color="blue"
                    />
                    <ActionCard 
                      title="Packages" 
                      href="/warehouse/packages" 
                      desc="Manage all packages"
                      icon={<Package className="w-6 h-6" />}
                      color="orange"
                    />
                    <ActionCard 
                      title="Search" 
                      href="/warehouse/search" 
                      desc="Advanced package search"
                      icon={<AlertCircle className="w-6 h-6" />}
                      color="blue"
                    />
                    <ActionCard 
                      title="Bulk Upload" 
                      href="/warehouse/bulk-upload" 
                      desc="Upload multiple packages"
                      icon={<FileText className="w-6 h-6" />}
                      color="orange"
                    />
                    <ActionCard 
                      title="Manifests" 
                      href="/warehouse/manifests" 
                      desc="Create shipment manifests"
                      icon={<FileText className="w-6 h-6" />}
                      color="blue"
                    />
                    <ActionCard 
                      title="Upload Manifest" 
                      href="/warehouse/manifests" 
                      desc="Upload manifest file"
                      icon={<Upload className="w-6 h-6" />}
                      color="orange"
                    />
                    <ActionCard 
                      title="Inventory" 
                      href="/warehouse/inventory" 
                      desc="Track packing materials"
                      icon={<Package className="w-6 h-6" />}
                      color="blue"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color, 
  icon 
}: { 
  label: string; 
  value: string; 
  color: "blue" | "orange" | "green";
  icon: React.ReactNode;
}) {
  const gradient = color === "blue" 
    ? "from-blue-500 to-cyan-600" 
    : color === "orange" 
    ? "from-orange-500 to-red-600"
    : "from-emerald-500 to-teal-600";
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-red-50 to-orange-50 p-4">
    <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
      <h3 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h3>
      <p className="mt-2 text-sm text-gray-600">{error}</p>
      <button onClick={onRetry} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg">
        Try Again
      </button>
    </div>
  </div>
);

function StatusCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: "blue" | "orange" | "green";
}) {
  const gradient = color === "blue" ? "from-blue-500 to-cyan-600" : color === "orange" ? "from-orange-500 to-red-600" : "from-emerald-500 to-teal-600";
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${gradient}`}></div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-3">{value}</p>
    </div>
  );
}

function ActionCard({ 
  title, 
  desc, 
  href, 
  icon, 
  color 
}: { 
  title: string; 
  desc: string; 
  href: string; 
  icon: React.ReactNode;
  color: "blue" | "orange";
}) {
  const gradient = color === "blue" ? "from-blue-500 to-cyan-600" : "from-orange-500 to-red-600";
  
  return (
    <Link 
      href={href} 
      className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1"
    >
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-all group-hover:opacity-20`}></div>
      <div className="relative">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-lg transition-transform group-hover:scale-110`}>
          <div className="text-white">{icon}</div>
        </div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
        <ChevronRight className="mt-2 h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-gray-600" />
      </div>
    </Link>
  );
}