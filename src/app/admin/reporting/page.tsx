"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from "lucide-react";
import dynamic from "next/dynamic";
import Loading from "@/components/Loading";

const RevenueChart = dynamic(
  () => import('@/components/charts/RevenueChart').then(mod => mod.RevenueChart),
  { ssr: false }
);

const StatusPieChart = dynamic(
  () => import('@/components/charts/StatusPieChart').then(mod => mod.StatusPieChart),
  { ssr: false }
);

type AnalyticsData = {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    totalPackages: number;
    packagesGrowth: number;
    totalCustomers: number;
    customersGrowth: number;
    averageValue: number;
    valueGrowth: number;
  };
  packagesByStatus: Array<{ status: string; count: number; percentage: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; packages: number }>;
  topCustomers: Array<{ name: string; packages: number; revenue: number }>;
  packagesByBranch: Array<{ branch: string; count: number }>;
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${timeRange}`);
      const json = await res.json();
      
      if (!res.ok) {
        if (json.code === 'MEMORY_ERROR') {
          console.error('Memory error:', json.error);
          // Show error but don't crash
          alert('Data set too large. Please try a shorter time range (7d or 30d).');
          return;
        }
        throw new Error(json.error || 'Failed to load analytics');
      }
      
      setData(json);
    } catch (e) {
      console.error('Error loading analytics:', e);
      // Don't set data on error to prevent crashes
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [timeRange, loadData]);

  if (loading) {
    return <Loading message="Loading analytics data..." />;
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />

          <div className="relative flex flex-col gap-6">
            
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Analytics Dashboard
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Detailed business insights and performance metrics
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur"
                >
                  <option value="7d" className="text-gray-900">Last 7 Days</option>
                  <option value="30d" className="text-gray-900">Last 30 Days</option>
                  <option value="90d" className="text-gray-900">Last 90 Days</option>
                  <option value="1y" className="text-gray-900">Last Year</option>
                </select>
                
                <button 
                  onClick={loadData}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="h-5 w-5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats Cards inside header */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* Total Revenue */}
              <div className="group relative overflow-hidden rounded-xl bg-green-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold">${data.overview.totalRevenue.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${data.overview.revenueGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {data.overview.revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(data.overview.revenueGrowth)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Packages */}
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Total Packages</p>
                    <p className="mt-1 text-2xl font-bold">{data.overview.totalPackages.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${data.overview.packagesGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {data.overview.packagesGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(data.overview.packagesGrowth)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Customers */}
              <div className="group relative overflow-hidden rounded-xl bg-orange-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-100">Total Customers</p>
                    <p className="mt-1 text-2xl font-bold">{data.overview.totalCustomers.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${data.overview.customersGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {data.overview.customersGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(data.overview.customersGrowth)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="group relative overflow-hidden rounded-xl bg-purple-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-100">Avg Order Value</p>
                    <p className="mt-1 text-2xl font-bold">${data.overview.averageValue.toFixed(2)}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${data.overview.valueGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {data.overview.valueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(data.overview.valueGrowth)}%
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Revenue Trend</h3>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-80">
              {data.revenueByMonth && data.revenueByMonth.length > 0 ? (
                <RevenueChart data={data.revenueByMonth.map(item => ({
                  month: item.month,
                  revenue: item.revenue,
                  packages: item.packages
                }))} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No revenue data available
                </div>
              )}
            </div>
          </div>

          {/* Package Status Distribution Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Package Status Distribution</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-80">
              {data.packagesByStatus && data.packagesByStatus.length > 0 ? (
                <StatusPieChart data={data.packagesByStatus.map(item => ({
                  status: item.status,
                  count: item.count,
                  percentage: item.percentage.toString()
                }))} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No package status data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Top Customers</h3>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {data.topCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#E67919] flex items-center justify-center text-white font-semibold">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.packages} packages</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">${customer.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Packages by Branch */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Packages by Branch</h3>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {data.packagesByBranch.map((branch, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium text-slate-600">{branch.branch}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#E67919] to-orange-600 rounded-lg transition-all"
                        style={{ 
                          width: `${(branch.count / Math.max(...data.packagesByBranch.map(b => b.count))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-sm font-semibold text-slate-800 text-right">
                    {branch.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
