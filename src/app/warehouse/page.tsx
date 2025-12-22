"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User, Package, FileText, Users, TrendingUp, AlertCircle, Calendar, Weight, Upload } from "lucide-react";
import dynamic from "next/dynamic";

const StatusPieChart = dynamic(
  () => import('@/components/charts/StatusPieChart').then(mod => mod.StatusPieChart),
  { ssr: false }
);

type Analytics = {
  statusCounts: Record<string, number>;
  today: { packages: number; weight: number };
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

  useEffect(() => {
    fetch("/api/warehouse/analytics", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

// Update the status count access with optional chaining and default values
const activePackages = analytics?.statusCounts?.["At Warehouse"] ?? 0;
const inTransit = analytics?.statusCounts?.["In Transit"] ?? 0;
const delivered = analytics?.statusCounts?.["Delivered"] ?? 0;
const atPort = analytics?.statusCounts?.["At Local Port"] ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#E67919] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Warehouse Dashboard</h1>
              <p className="text-blue-100 text-sm mt-1">Real-time insights and quick access to operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f4d8a]"></div>
          </div>
        ) : (
          <>
            {/* Today's Activity */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#E67919]" />
                Today's Activity
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  label="Packages Received Today" 
                  value={(analytics?.today?.packages ?? 0).toString()} 
                  color="blue"
                  icon={<Package className="w-5 h-5" />}
                />
                <StatCard 
                  label="Ready to Ship" 
                  value={(analytics?.readyToShip ?? atPort).toString()} 
                  color="orange"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard 
                  label="Average Processing Time" 
                  value={`${(analytics?.avgProcessingTime ?? 0).toFixed(1)} hrs`} 
                  color="blue"
                  icon={<Calendar className="w-5 h-5" />}
                />
                <StatCard 
                  label="Total Weight Today" 
                  value={`${(analytics?.today?.weight ?? 0).toFixed(2)} kg`} 
                  color="orange"
                  icon={<Weight className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* Package Status Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#E67919]" />
                Package Status Overview
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>
                  <div className="h-64">
                    <StatusPieChart data={[
                      { status: "At Warehouse", count: activePackages, percentage: ((activePackages / (activePackages + inTransit + delivered + atPort || 1)) * 100).toFixed(1) },
                      { status: "In Transit", count: inTransit, percentage: ((inTransit / (activePackages + inTransit + delivered + atPort || 1)) * 100).toFixed(1) },
                      { status: "At Local Port", count: atPort, percentage: ((atPort / (activePackages + inTransit + delivered + atPort || 1)) * 100).toFixed(1) },
                      { status: "Delivered", count: delivered, percentage: ((delivered / (activePackages + inTransit + delivered + atPort || 1)) * 100).toFixed(1) },
                    ].filter(item => item.count > 0)} />
                  </div>
                </div>
                {/* Status Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatusCard label="At Warehouse" value={activePackages} color="blue" />
                  <StatusCard label="In Transit" value={inTransit} color="orange" />
                  <StatusCard label="At Local Port" value={atPort} color="blue" />
                  <StatusCard label="Delivered" value={delivered} color="green" />
                </div>
              </div>
            </div>

            {/* Monthly Statistics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Monthly Statistics</h2>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total This Month</p>
                    <p className="text-3xl font-bold text-[#0f4d8a]">
                      {analytics?.monthly?.total ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Delivered</p>
                    <p className="text-3xl font-bold text-green-600">
                      {analytics?.monthly?.delivered ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">In Transit</p>
                    <p className="text-3xl font-bold text-[#E67919]">
                      {analytics?.monthly?.inTransit ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Customers */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Customers</h2>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Customer Code</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Packages</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(analytics?.topCustomers ?? []).slice(0, 5).map((customer, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="font-mono font-bold text-[#0f4d8a]">{customer._id}</code>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">{customer.packageCount}</td>
                        <td className="px-6 py-4 text-right">{(customer.totalWeight || 0).toFixed(2)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          </>
        )}
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
  color: "blue" | "orange";
  icon: React.ReactNode;
}) {
  const bgColor = color === "blue" ? "bg-[#0f4d8a]" : "bg-[#E67919]";
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`${bgColor} rounded-lg p-2 text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StatusCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: "blue" | "orange" | "green";
}) {
  const bgColor = color === "blue" ? "bg-blue-500" : color === "orange" ? "bg-[#E67919]" : "bg-green-500";
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`${bgColor} w-3 h-3 rounded-full`}></div>
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
  const iconBgColor = color === "blue" ? "bg-[#0f4d8a]" : "bg-[#E67919]";
  const hoverBorderColor = color === "blue" ? "hover:border-[#0f4d8a]" : "hover:border-[#E67919]";
  
  return (
    <Link 
      href={href} 
      className={`group block rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${hoverBorderColor} hover:-translate-y-1`}
    >
      <div className="flex items-start gap-4">
        <div className={`${iconBgColor} rounded-lg p-3 text-white transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#0f4d8a] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );
}