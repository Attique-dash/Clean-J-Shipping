'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, Clock, Users, CreditCard } from 'lucide-react';
import AddButton from '@/components/admin/AddButton';

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

  useEffect(() => {
    fetch('/api/admin/status')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch stats:', error);
        setLoading(false);
      });
  }, []);

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'package': return <Package className="h-4 w-4 text-blue-600" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'user': return <Users className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'received': 'bg-blue-100 text-blue-700',
      'in_transit': 'bg-purple-100 text-purple-700',
      'delivered': 'bg-green-100 text-green-700',
      'customs': 'bg-orange-100 text-orange-700',
    };
    return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6">Failed to load dashboard data</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-[#0f4d8a]" />
            Dashboard Status
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time overview of your shipping operations
          </p>
        </div>
        <AddButton onClick={() => window.location.reload()} label="Refresh Data" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-[#0f4d8a]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Packages</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPackages.toLocaleString()}</p>
              {stats.packagesGrowth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${stats.packagesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.packagesGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(stats.packagesGrowth)}% from last month</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-[#0f4d8a]" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">New Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.newToday}</p>
              <p className="text-sm text-gray-400 mt-2">Packages received today</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-yellow-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Alerts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingAlerts}</p>
              <p className="text-sm text-gray-400 mt-2">Require attention</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${stats.revenueToday.toFixed(2)}</p>
              {stats.revenueGrowth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{Math.abs(stats.revenueGrowth)}% from yesterday</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-gray-500 text-sm">Latest system events</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg mt-0.5">
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
              ))
            )}
          </div>
        </Card>

        {/* Recent Pre-Alerts */}
        <Card>
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Pre-Alerts</h2>
                <p className="text-gray-500 text-sm">{stats.preAlerts.length} pending</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.preAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No pending pre-alerts</p>
              </div>
            ) : (
              stats.preAlerts.map((alert, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{alert.trackingNumber}</p>
                        <Badge className={getStatusBadge(alert.status)}>
                          {alert.status}
                        </Badge>
                      </div>
                      {alert.customerName && (
                        <p className="text-sm text-gray-500">{alert.customerName}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
