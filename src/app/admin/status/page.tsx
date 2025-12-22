'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Package, DollarSign, Users, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalPackages: number;
  newToday: number;
  pendingAlerts: number;
  revenueToday: number;
  recentActivity: Array<{
    time: string;
    text: string;
    right?: string;
  }>;
  preAlerts: Array<{
    trackingNumber: string;
    status: string;
    createdAt: string;
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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!stats) {
    return <div className="p-6">Failed to load dashboard data</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Status</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Packages</p>
              <p className="text-2xl font-bold">{stats.totalPackages}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Today</p>
              <p className="text-2xl font-bold">{stats.newToday}</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Alerts</p>
              <p className="text-2xl font-bold">{stats.pendingAlerts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Today</p>
              <p className="text-2xl font-bold">${stats.revenueToday.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{activity.text}</span>
                <div className="text-right">
                  <div className="text-gray-500">{activity.right}</div>
                  <div className="text-gray-400">
                    {new Date(activity.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Pre-Alerts</h2>
          <div className="space-y-3">
            {stats.preAlerts.map((alert, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{alert.trackingNumber}</span>
                <div className="text-right">
                  <div className="font-medium">{alert.status}</div>
                  <div className="text-gray-400">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
