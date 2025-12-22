"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Users, DollarSign, TrendingUp, RefreshCw, AlertCircle,
  Clock, Truck, BarChart3, ArrowUpRight, ArrowDownRight, 
  Activity, ChevronRight, FileText, CreditCard, 
  Download, Radio, Loader2
} from 'lucide-react';

interface DashboardStats {
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
  packagesByStatus: Array<{
    status: string;
    count: number;
    percentage: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    packages: number;
  }>;
  topCustomers: Array<{
    name: string;
    packages: number;
    revenue: number;
  }>;
  packagesByBranch: Array<{
    branch: string;
    count: number;
  }>;
  recentActivity?: Array<{
    title?: string;
    description?: string;
    timestamp?: string;
    icon?: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers'>('overview');

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get session token
      const { data: session } = await fetch('/api/auth/session').then(res => res.json());
      
      const response = await fetch(`/api/admin/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` })
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error && data.code === 'MEMORY_ERROR') {
        setError('Data set too large. Please try a shorter time range (7d or 30d).');
        setStats(null);
      } else if (data.error) {
        throw new Error(data.error || `Failed to fetch stats: ${response.statusText}`);
      } else if (!data.overview) {
        throw new Error('Invalid response format from server - missing overview');
      } else {
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading && !stats) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
      <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
    </div>
  );
  if (error && !stats) return <ErrorState error={error} onRetry={fetchStats} />;
  if (!stats && !isLoading && !error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
      <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
    </div>
  );
  if (stats && !stats.overview) return <ErrorState error="Invalid data structure received from server" onRetry={fetchStats} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Title & Welcome */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/50">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Dashboard</h1>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Last updated: {lastUpdated.toLocaleTimeString()}
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Data Loaded
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchStats}
                disabled={isLoading}
                className="group flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-medium text-gray-700 shadow-md ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 transition-transform ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button 
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/admin/reports/packages?format=csv`, {
                      credentials: 'include',
                    });
                    if (!response.ok) throw new Error('Export failed');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to export data');
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'overview' as const, label: 'Overview', icon: <Activity className="h-4 w-4" /> },
              { id: 'revenue' as const, label: 'Revenue', icon: <DollarSign className="h-4 w-4" /> },
              { id: 'customers' as const, label: 'Customers', icon: <Users className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-md ring-2 ring-blue-600/20'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.overview?.totalRevenue ?? 0)}
            change={stats?.overview?.revenueGrowth ?? 0}
            icon={<DollarSign className="h-6 w-6" />}
            gradient="from-emerald-500 to-teal-600"
          />
          <StatCard
            title="Total Packages"
            value={(stats?.overview?.totalPackages ?? 0).toLocaleString()}
            change={stats?.overview?.packagesGrowth ?? 0}
            icon={<Package className="h-6 w-6" />}
            gradient="from-blue-500 to-cyan-600"
          />
          <StatCard
            title="Total Customers"
            value={(stats?.overview?.totalCustomers ?? 0).toLocaleString()}
            change={stats?.overview?.customersGrowth ?? 0}
            icon={<Users className="h-6 w-6" />}
            gradient="from-purple-500 to-pink-600"
          />
          <StatCard
            title="Avg. Order Value"
            value={formatCurrency(stats?.overview?.averageValue ?? 0)}
            change={stats?.overview?.valueGrowth ?? 0}
            icon={<TrendingUp className="h-6 w-6" />}
            gradient="from-orange-500 to-red-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Revenue Chart Placeholder */}
                <div className="group overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                    <h3 className="text-xl font-bold text-gray-900">Revenue Overview</h3>
                    <p className="mt-1 text-sm text-gray-600">Monthly performance tracking</p>
                  </div>
                  <div className="p-6">
                    <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-400">Chart Component Would Go Here</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <QuickActionCard 
                    title="New Package" 
                    description="Add package to system" 
                    icon={<Package className="h-5 w-5" />} 
                    color="blue" 
                    onClick={() => router.push('/admin/packages')}
                  />
                  <QuickActionCard 
                    title="Generate Invoice" 
                    description="Create new invoice" 
                    icon={<FileText className="h-5 w-5" />} 
                    color="purple" 
                    onClick={() => router.push('/admin/invoices')}
                  />
                  <QuickActionCard 
                    title="Send Broadcast" 
                    description="Send announcement to customers" 
                    icon={<Radio className="h-5 w-5" />} 
                    color="red" 
                    onClick={() => router.push('/admin/broadcast-messages')}
                  />
                </div>

                {/* Recent Activity Card */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                        View All
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((activity, index) => (
                        <ActivityItem 
                          key={index} 
                          title={activity.title || 'Activity'}
                          desc={activity.description || ''}
                          time={activity.timestamp ? new Date(activity.timestamp).toLocaleString() : ''}
                          icon={(activity.icon || 'Package') as 'Package' | 'CreditCard' | 'Users' | 'FileText'}
                          color="blue"
                        />
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'revenue' && (
              <div className="group overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                  <h3 className="text-xl font-bold text-gray-900">Revenue Analytics</h3>
                </div>
                <div className="p-6">
                  <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                    <p className="text-gray-400">Revenue Chart</p>
                  </div>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.overview?.totalRevenue ?? 0)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg. Order Value</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.overview?.averageValue ?? 0)}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Growth</p>
                      <p className="text-2xl font-bold text-gray-900">{(stats?.overview?.revenueGrowth ?? 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="group overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
                <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
                  <h3 className="text-xl font-bold text-gray-900">Customer Analytics</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {stats?.topCustomers?.map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.packages} packages</p>
                          </div>
                        </div>
                        <p className="font-bold text-emerald-600">{formatCurrency(customer.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Package Status Card */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
              <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
                <h3 className="text-lg font-bold text-gray-900">Package Status</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {stats?.packagesByStatus?.map((item, index) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-3 w-3 rounded-full shadow-lg"
                          style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{item.status}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{item.count}</p>
                        <p className="text-xs text-gray-500">{item.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats Mini Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MiniStatCard
                label="In Transit"
                value={stats?.packagesByStatus?.find(s => s.status === 'In Transit')?.count?.toString() || '0'}
                icon={<Truck className="h-4 w-4" />}
                color="blue"
              />
              <MiniStatCard
                label="Delivered"
                value={stats?.packagesByStatus?.find(s => s.status === 'Delivered')?.count?.toString() || '0'}
                icon={<Package className="h-4 w-4" />}
                color="green"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
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

const StatCard = ({ title, value, change, icon, gradient }: { 
  title: string; 
  value: string | number; 
  change: number; 
  icon: React.ReactNode; 
  gradient: string; 
}) => {
  const isPositive = change >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

const ActivityItem = ({ title, desc, time, icon, color }: { title: string; desc: string; time: string; icon: 'Package' | 'CreditCard' | 'Users' | 'FileText'; color: 'blue' | 'green' | 'purple' | 'orange' }) => {
  const router = useRouter();
  const iconMap = { Package, CreditCard, Users, FileText };
  const IconComponent = iconMap[icon] || Package;
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  };

  const handleClick = () => {
    if (title?.toLowerCase().includes('order') || title?.toLowerCase().includes('package')) {
      router.push('/admin/packages');
    } else if (title?.toLowerCase().includes('payment')) {
      router.push('/admin/transactions');
    } else if (title?.toLowerCase().includes('customer')) {
      router.push('/admin/customers');
    } else if (title?.toLowerCase().includes('invoice')) {
      router.push('/admin/invoices');
    } else {
      router.push('/admin/reporting');
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="flex items-start gap-4 p-4 transition-all hover:bg-gray-50 w-full text-left"
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
        <IconComponent className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-600 line-clamp-2">{desc}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {time}
        </p>
      </div>
      <div className="flex-shrink-0 text-gray-400">
        <ChevronRight className="h-5 w-5" />
      </div>
    </button>
  );
};

const QuickActionCard = ({ title, description, icon, color, onClick }: { title: string; description: string; icon: React.ReactNode; color: 'blue' | 'purple' | 'red'; onClick?: () => void }) => {
  const router = useRouter();
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    red: 'from-red-500 to-orange-600'
  };

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick();
    } else {
      // Default navigation based on title
      if (title?.toLowerCase().includes('package')) {
        router.push('/admin/packages');
      } else if (title?.toLowerCase().includes('invoice')) {
        router.push('/admin/invoices/generator');
      } else if (title?.toLowerCase().includes('broadcast')) {
        router.push('/admin/broadcasts');
      }
    }
  };

  return (
    <button onClick={handleClick} className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${colorClasses[color]} opacity-10 blur-2xl transition-all group-hover:opacity-20`}></div>
      <div className="relative">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg transition-transform group-hover:scale-110`}>
          <div className="text-white">{icon}</div>
        </div>
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        <ChevronRight className="mt-2 h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-gray-600" />
      </div>
    </button>
  );
};

const MiniStatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: 'blue' | 'green' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-emerald-500 to-teal-600',
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}