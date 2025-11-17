// src/app/customer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Package, TrendingUp, FileText, Bell } from "lucide-react";

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalPackages: 0,
    activeShipments: 0,
    pendingBills: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Load packages
      const packagesRes = await fetch("/api/customer/packages");
      const packagesData = await packagesRes.json();
      const packages = packagesData?.packages || [];
      
      // Load bills
      const billsRes = await fetch("/api/customer/bills");
      const billsData = await billsRes.json();
      const bills = billsData?.bills || [];
      
      setStats({
        totalPackages: packages.length,
        activeShipments: packages.filter((p: any) => 
          p.status === 'in_transit' || p.status === 'ready_for_pickup'
        ).length,
        pendingBills: bills.filter((b: any) => 
          b.payment_status === 'submitted' || b.payment_status === 'none'
        ).length,
        unreadMessages: 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || 'Customer'}!
        </h1>
        <p className="mt-1 text-gray-500">
          Here's what's happening with your shipments and orders.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Packages"
          value={stats.totalPackages}
          icon={Package}
          color="from-blue-500 to-blue-600"
          href="/customer/packages"
        />
        <StatCard
          title="Active Shipments"
          value={stats.activeShipments}
          icon={TrendingUp}
          color="from-emerald-500 to-emerald-600"
          href="/customer/packages"
        />
        <StatCard
          title="Pending Bills"
          value={stats.pendingBills}
          icon={FileText}
          color="from-amber-500 to-amber-600"
          href="/customer/bills"
        />
        <StatCard
          title="Messages"
          value={stats.unreadMessages}
          icon={Bell}
          color="from-purple-500 to-purple-600"
          href="/customer/messages"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/customer/packages"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  View Packages
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Track your shipments
                </p>
              </div>
            </Link>

            <Link
              href="/customer/bills"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  Pay Bills
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Manage payments
                </p>
              </div>
            </Link>

            <Link
              href="/customer/contact"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
            >
              <div className="flex-shrink-0">
                <Bell className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  Contact Support
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Get help
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </Link>
  );
}