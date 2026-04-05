'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  Users,
  CreditCard,
  RefreshCw,
  Package2,
  LayoutGrid,
} from 'lucide-react';

interface DashboardStats {
  totalPackages: number;
  newToday: number;
  pendingAlerts: number;
  revenueToday: number;
  revenueGrowth: number;
  packagesGrowth: number;
  recentActivity: Array<{
    time: string;
    text: string;
    right?: string;
    type?: 'package' | 'payment' | 'alert' | 'user';
  }>;
  preAlerts: Array<{
    trackingNumber: string;
    status: string;
    createdAt: string;
    customerName?: string;
  }>;
}

export default function AdminStatusPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = () => {
    fetch('/api/admin/status')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(error => {
        console.error('Failed to fetch stats:', error);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'package': return <Package className="h-4 w-4 text-blue-600" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'user': return <Users className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'received': 'bg-blue-100 text-blue-800',
      'in_transit': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'customs': 'bg-orange-100 text-orange-800',
    };
    return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-8 flex items-center justify-center">
        <div className="text-center">
          <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Failed to load dashboard data</p>
          <button onClick={handleRefresh} className="mt-4 text-sm text-[#0f4d8a] underline hover:text-blue-800">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">Dashboard</h1>
                <p className="text-blue-100 mt-1">Real-time overview of your shipping operations</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg disabled:opacity-50 text-sm sm:text-base self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </header>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Packages */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0f4d8a] rounded-l-2xl" />
            <div className="flex items-start justify-between pl-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Packages</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPackages.toLocaleString()}</p>
                {stats.packagesGrowth !== undefined && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${stats.packagesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.packagesGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{Math.abs(stats.packagesGrowth)}% from last month</span>
                  </div>
                )}
              </div>
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Package className="h-5 w-5 text-[#0f4d8a]" />
              </div>
            </div>
          </div>

          {/* New Today */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500 rounded-l-2xl" />
            <div className="flex items-start justify-between pl-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.newToday}</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">Packages received today</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-xl">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Pending Alerts */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500 rounded-l-2xl" />
            <div className="flex items-start justify-between pl-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingAlerts}</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">Require attention</p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Revenue Today */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl" />
            <div className="flex items-start justify-between pl-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">${stats.revenueToday.toFixed(2)}</p>
                {stats.revenueGrowth !== undefined && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{Math.abs(stats.revenueGrowth)}% from yesterday</span>
                  </div>
                )}
              </div>
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </h2>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">{stats.recentActivity.length} events</span>
                </div>
              </div>
            </div>

            {stats.recentActivity.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No Recent Activity</h3>
                <p className="text-sm text-gray-500">System events will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg mt-0.5 flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(activity.time).toLocaleTimeString()}
                          </span>
                          {activity.right && (
                            <span className="text-xs text-gray-400">• {activity.right}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Pre-Alerts */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Pre-Alerts
                </h2>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">{stats.preAlerts.length} pending</span>
                </div>
              </div>
            </div>

            {stats.preAlerts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No Pending Pre-Alerts</h3>
                <p className="text-sm text-gray-500">All pre-alerts have been processed</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.preAlerts.map((alert, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#1a6db5] flex items-center justify-center">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 font-mono">{alert.trackingNumber}</p>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(alert.status)}`}>
                              {alert.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {alert.customerName && (
                            <p className="text-xs text-gray-500 mt-0.5">{alert.customerName}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}