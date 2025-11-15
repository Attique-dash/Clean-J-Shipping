"use client";

import { useEffect, useState } from "react";
import { Package, Users, Truck, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, FileText, Activity, RefreshCw, Calendar, ArrowUpRight } from "lucide-react";

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

type ActivityItem = { action: string; description: string; timestamp: string };

type Report = {
  summary: Summary;
  weekly_stats: Weekly;
  alerts: Alerts;
  recent_activity: ActivityItem[];
};

// Demo data for fallback
const demoReport: Report = {
  summary: {
    total_packages: 1247,
    total_customers: 385,
    packages_in_transit: 89,
    total_revenue: 156750.50
  },
  weekly_stats: {
    packages_this_week: 156,
    revenue_this_week: 18420.75,
    new_customers_this_week: 23
  },
  alerts: {
    packages_awaiting_invoice: 12,
    packages_ready_for_pickup: 8,
    overdue_payments: 5
  },
  recent_activity: [
    {
      action: "package_created",
      description: "New package #PKG-2024-1247 created for customer Ali Ahmed",
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      action: "payment_received",
      description: "Payment of $450 received from Sara Khan for invoice #INV-2024-089",
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      action: "package_shipped",
      description: "Package #PKG-2024-1245 marked as shipped to Lahore",
      timestamp: new Date(Date.now() - 10800000).toISOString()
    },
    {
      action: "customer_registered",
      description: "New customer Hassan Malik registered in the system",
      timestamp: new Date(Date.now() - 14400000).toISOString()
    },
    {
      action: "package_delivered",
      description: "Package #PKG-2024-1240 successfully delivered to customer",
      timestamp: new Date(Date.now() - 18000000).toISOString()
    }
  ]
};

export default function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setUsingDemo(false);
    
    try {
      const res = await fetch("/api/admin/reports/summary", { cache: "no-store" });
      
      // Check content type before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API endpoint not available. Using demo data.");
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load summary");
      }
      
      setReport(data as Report);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to load data";
      setError(errorMsg);
      // Load demo data as fallback
      setReport(demoReport);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('package') || action.includes('shipped')) return Package;
    if (action.includes('customer') || action.includes('user')) return Users;
    if (action.includes('payment') || action.includes('invoice')) return DollarSign;
    if (action.includes('pickup') || action.includes('delivered')) return CheckCircle;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('new') || action.includes('registered')) return 'text-green-600 bg-green-50';
    if (action.includes('updated') || action.includes('modified')) return 'text-blue-600 bg-blue-50';
    if (action.includes('deleted') || action.includes('cancelled')) return 'text-red-600 bg-red-50';
    if (action.includes('payment') || action.includes('invoice')) return 'text-[#E67919] bg-orange-50';
    if (action.includes('shipped') || action.includes('delivered')) return 'text-[#0f4d8a] bg-blue-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-slate-600 mt-1">Monitor your business performance and key metrics</p>
          </div>
          <button 
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Demo Data Notice */}
        {usingDemo && (
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Using Demo Data</p>
              <p className="text-sm text-blue-600 mt-1">
                API endpoint is not available. Showing sample data for demonstration. 
                {error && <span className="block mt-1 text-xs">Error: {error}</span>}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-[#0f4d8a] animate-spin mx-auto" />
              <p className="text-slate-600 font-medium">Loading reports...</p>
            </div>
          </div>
        ) : report ? (
          <>
            {/* Summary Stats */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#0f4d8a]" />
                <h2 className="text-xl font-semibold text-slate-800">Business Overview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#0f4d8a]/70 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Total Packages</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{report.summary.total_packages.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#E67919] to-orange-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Total Customers</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{report.summary.total_customers.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">In Transit</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{report.summary.packages_in_transit.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">${report.summary.total_revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>
            </section>

            {/* Weekly Stats */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-[#E67919]" />
                <h2 className="text-xl font-semibold text-slate-800">This Week's Performance</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 shadow-md border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <Package className="w-8 h-8 text-[#0f4d8a]" />
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Packages Processed</p>
                  <p className="text-4xl font-bold text-slate-800 mt-2">{report.weekly_stats.packages_this_week.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-2">vs last week</p>
                </div>

                <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-6 shadow-md border border-green-100">
                  <div className="flex items-center justify-between mb-3">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+8%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Revenue Generated</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">${report.weekly_stats.revenue_this_week.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="text-xs text-slate-500 mt-2">vs last week</p>
                </div>

                <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl p-6 shadow-md border border-orange-100">
                  <div className="flex items-center justify-between mb-3">
                    <Users className="w-8 h-8 text-[#E67919]" />
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+15%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">New Customers</p>
                  <p className="text-4xl font-bold text-[#E67919] mt-2">{report.weekly_stats.new_customers_this_week.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-2">vs last week</p>
                </div>
              </div>
            </section>

            {/* Alerts Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-800">Action Required</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-yellow-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                        PENDING
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Awaiting Invoice</p>
                    <p className="text-3xl font-bold text-yellow-600">{report.alerts.packages_awaiting_invoice}</p>
                    <p className="text-xs text-slate-500 mt-2">Packages need invoicing</p>
                  </div>
                  <div className="bg-yellow-50 px-6 py-3 border-t border-yellow-100">
                    <button className="text-sm font-medium text-yellow-700 hover:text-yellow-800 transition-colors">
                      View Packages →
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        READY
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Ready for Pickup</p>
                    <p className="text-3xl font-bold text-green-600">{report.alerts.packages_ready_for_pickup}</p>
                    <p className="text-xs text-slate-500 mt-2">Awaiting customer pickup</p>
                  </div>
                  <div className="bg-green-50 px-6 py-3 border-t border-green-100">
                    <button className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors">
                      View Packages →
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-red-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        OVERDUE
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-1">Overdue Payments</p>
                    <p className="text-3xl font-bold text-red-600">{report.alerts.overdue_payments}</p>
                    <p className="text-xs text-slate-500 mt-2">Require immediate attention</p>
                  </div>
                  <div className="bg-red-50 px-6 py-3 border-t border-red-100">
                    <button className="text-sm font-medium text-red-700 hover:text-red-800 transition-colors">
                      View Payments →
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-[#0f4d8a]" />
                <h2 className="text-xl font-semibold text-slate-800">Recent Activity</h2>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Latest Updates</h3>
                </div>
                <div className="overflow-x-auto">
                  {report.recent_activity.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No recent activity</p>
                      <p className="text-sm text-slate-400 mt-1">Activity will appear here as it happens</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {report.recent_activity.map((activity, idx) => {
                        const ActionIcon = getActionIcon(activity.action);
                        const colorClass = getActionColor(activity.action);
                        
                        return (
                          <div key={idx} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                                <ActionIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-1">
                                  <p className="font-semibold text-slate-800 capitalize">
                                    {activity.action.replaceAll('_', ' ')}
                                  </p>
                                  <span className="text-sm text-slate-500 whitespace-nowrap">
                                    {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">{activity.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Stats Summary */}
            <section className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] rounded-xl p-6 shadow-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
                <div className="text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">Completion Rate</p>
                  <p className="text-4xl font-bold">94%</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">Avg. Delivery Time</p>
                  <p className="text-4xl font-bold">2.5d</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">Customer Satisfaction</p>
                  <p className="text-4xl font-bold">4.8★</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">Return Rate</p>
                  <p className="text-4xl font-bold">2.3%</p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}