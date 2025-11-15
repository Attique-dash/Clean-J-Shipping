import { Package } from "@/models/Package";
import { PreAlert } from "@/models/PreAlert";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import { authOptions } from '@/lib/auth';
import Order from '@/models/Order';
import { 
  PackageIcon, 
  TrendingUp, 
  Bell, 
  DollarSign, 
  Plus, 
  FileText, 
  Clock, 
  Activity,
  Zap,
  ArrowUpRight,
  Users,
  CreditCard,
  AlertCircle
} from "lucide-react";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

 if (!session || !session.user) {
    redirect('/login');
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    redirect('/'); // Redirect to home if not admin
  }

  // Now connect to database
  await dbConnect();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    totalPackages,
    newToday,
    pendingAlerts,
    revenueAgg,
    recentPackages,
    recentPayments,
    recentCustomers,
    preAlertsList,
  ] = await Promise.all([
    Package.countDocuments({}),
    Package.countDocuments({ createdAt: { $gte: startOfToday, $lt: endOfToday } }),
    PreAlert.countDocuments({ status: "submitted" }),
    Payment.aggregate([
      { $match: { status: "captured", createdAt: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Package.find({}, { trackingNumber: 1, status: 1, updatedAt: 1, userCode: 1 }).sort({ updatedAt: -1 }).limit(5).lean<{
      trackingNumber: string;
      status: string;
      updatedAt: Date;
      userCode?: string;
      _id: unknown;
    }>(),
    Payment.find({ status: "captured" }, { amount: 1, userCode: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).lean<{
      amount: number;
      userCode: string;
      createdAt: Date;
      _id: unknown;
    }>(),
    User.find({ role: "customer" }, { email: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5).lean<{
      email: string;
      createdAt: Date;
      _id: unknown;
    }>(),
    PreAlert.find({}, { trackingNumber: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(6).lean<{
      trackingNumber: string;
      status: string;
      createdAt: Date;
      _id: unknown;
    }>(),
  ]);

  const revenueToday = Number(revenueAgg?.[0]?.total || 0);

  type Activity = { time: Date; text: string; right?: string };
  const activities: Activity[] = [];
  recentPackages.forEach((p) => {
    activities.push({ time: new Date(p.updatedAt), text: `Package ${p.trackingNumber} ${p.status}` });
  });
  recentPayments.forEach((pay) => {
    activities.push({ time: new Date(pay.createdAt), text: `Payment captured $${pay.amount.toFixed(2)}`, right: pay.userCode });
  });
  recentCustomers.forEach((u) => {
    activities.push({ time: new Date(u.createdAt), text: `New customer registered`, right: u.email });
  });
  activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  const recent = activities.slice(0, 8);

  return (
    <div className="w-full max-w-full px-2 sm:px-4 space-y-6">

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
              title="Total Packages" 
              value={totalPackages.toString()} 
              icon={PackageIcon}
              gradient="from-blue-500 to-blue-600"
              trend="+12%"
            />
            <KpiCard 
              title="New Today" 
              value={newToday.toString()} 
              icon={TrendingUp}
              gradient="from-emerald-500 to-emerald-600"
              trend="+5"
            />
            <KpiCard 
              title="Pending Alerts" 
              value={pendingAlerts.toString()} 
              icon={Bell}
              gradient="from-amber-500 to-amber-600"
              trend={pendingAlerts > 0 ? "Action needed" : "All clear"}
            />
            <KpiCard 
              title="Revenue Today" 
              value={`$${revenueToday.toFixed(0)}`} 
              icon={DollarSign}
              gradient="from-purple-500 to-purple-600"
              trend={`$${revenueToday.toFixed(2)}`}
              actionLink="/admin/transactions"
            />
          </div>

          {/* Hero Banner with overlay */}
          <section className="group relative overflow-hidden rounded-2xl border border-gray-200 shadow-xl transition-all hover:shadow-2xl w-full">
            <div className="relative h-40 w-full sm:h-48 md:h-56">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f4d8a]/95 via-[#0e7893]/90 to-[#0f4d8a]/95" />
              <Image
                src="/images/package.jpg"
                alt="Courier & Delivery"
                fill
                priority
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="relative z-10 flex h-full items-center px-6 sm:px-8">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-medium text-white">Live Operations</span>
                  </div>
                  <p className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    Reliable Courier & Delivery Services
                  </p>
                  <p className="mt-3 text-base text-blue-100">
                    Managing {totalPackages} packages with excellence
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Immediate Actions Card */}
          <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Immediate Actions Needed</h3>
            </div>
            <div className="space-y-3">
              <ActionItem 
                icon={AlertCircle}
                text={`${pendingAlerts} pre-alerts submitted awaiting review`}
                urgent={pendingAlerts > 0}
              />
              <ActionItem 
                icon={PackageIcon}
                text={`${newToday} new packages created today`}
                urgent={false}
              />
              <ActionItem 
                icon={CreditCard}
                text={`Verify payments captured today totaling $${revenueToday.toFixed(2)}`}
                urgent={false}
              />
            </div>
          </section>

          {/* Recent Activity Table */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Event</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {recent.map((a, i) => (
                    <tr key={i} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-900">
                        {a.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{a.text}</td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-right text-sm">
                        {a.right ? (
                          <span className="inline-flex items-center rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                            {a.right}
                          </span>
                        ) : (
                          <Link 
                            href="/admin/packages" 
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg"
                          >
                            Manage
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pre-Alerts Table */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pre-Alerts</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tracking #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {preAlertsList.map((p, i) => (
                    <tr key={i} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900">{p.trackingNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          p.status === 'submitted' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-right text-sm text-gray-700">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Sidebar - Widgets */}
        <aside className="space-y-6">
          {/* Overview Chart Widget */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Weekly Overview</h3>
              <span className="text-xs text-gray-500">Last 7 days</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-32">
              {[12, 18, 8, 16, 10, 20, 14].map((h, i) => (
                <div key={i} className="group relative flex-1">
                  <div 
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#0f4d8a] to-[#0e7893] transition-all hover:from-[#E67919] hover:to-[#d66f15]" 
                    style={{ height: `${h * 4}px` }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white">{h}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Mon</span>
              <span>Sun</span>
            </div>
          </section>

          {/* Compact Pre-Alerts Widget */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Recent Pre-Alerts</h3>
              <Link href="/admin/pre-alerts" className="text-xs font-medium text-[#0f4d8a] hover:text-[#E67919]">
                View All →
              </Link>
            </div>
            <ul className="space-y-3">
              {preAlertsList.slice(0, 4).map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-all hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <Bell className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">{p.trackingNumber}</span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    p.status === 'submitted' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick Actions Widget */}
          <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-xl">
            <h3 className="mb-4 font-bold text-gray-900">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                href="/admin/packages" 
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#E67919] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#d66f15] hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                Add New Package
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link 
                href="/admin/reporting" 
                className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-[#0f4d8a] hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" />
                View All Reports
              </Link>
              <Link 
                href="/admin/customers" 
                className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-[#0f4d8a] hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                Manage Customers
              </Link>
            </div>
          </section>

          {/* Stats Summary */}
          <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0f4d8a] to-[#0e447d] p-6 shadow-xl text-white">
            <h3 className="mb-4 font-bold">Today's Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Total Revenue</span>
                <span className="text-xl font-bold">${revenueToday.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">New Packages</span>
                <span className="text-xl font-bold">{newToday}</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Pending Alerts</span>
                <span className="text-xl font-bold">{pendingAlerts}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Enhanced KPI Card Component
function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  trend, 
  actionLink 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  gradient: string; 
  trend?: string; 
  actionLink?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-lg transition-all hover:shadow-2xl">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          {trend && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              {trend}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {actionLink && (
          <Link 
            href={actionLink} 
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0f4d8a] transition-colors hover:text-[#E67919]"
          >
            View Details
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 transition-all group-hover:scale-150`} />
    </div>
  );
}

// Action Item Component
function ActionItem({ 
  icon: Icon, 
  text, 
  urgent 
}: { 
  icon: any; 
  text: string; 
  urgent: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        urgent ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        <Icon className={`h-4 w-4 ${urgent ? 'text-red-600' : 'text-blue-600'}`} />
      </div>
      <p className="text-sm font-medium text-gray-700">{text}</p>
    </div>
  );
}