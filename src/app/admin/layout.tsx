"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";   
import {
  Home,
  Package,
  Bell,
  Users,
  Wrench,
  Truck,
  Radio,
  CreditCard,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  FileText,
  Calculator,
  UserCircle,
  Receipt,
  Settings
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: Home,
      description: "Admin dashboard overview",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/admin/invoices",
      label: "Invoices",
      icon: FileText,
      description: "View and manage all invoices",
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/admin/packages",
      label: "Packages",
      icon: Package,
      description: "Manage all system packages",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/admin/pre-alerts",
      label: "Pre-Alerts",
      icon: Bell,
      description: "Manage incoming shipment notifications",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: Users,
      description: "Customer management",
      color: "from-pink-500 to-pink-600",
    },
    {
      href: "/admin/staff",
      label: "Staff",
      icon: Wrench,
      description: "Manage warehouse staff accounts",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/admin/shipments",
      label: "Shipments",
      icon: Truck,
      description: "Manage manifests and batches",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      href: "/admin/broadcasts",
      label: "Broadcasts",
      icon: Radio,
      description: "Send announcements",
      color: "from-red-500 to-red-600",
    },
    {
      href: "/admin/bills",
      label: "Bills",
      icon: Receipt,
      description: "Billing and invoice management",
      color: "from-indigo-400 to-indigo-600",
    },
    {
      href: "/admin/transactions",
      label: "Transactions",
      icon: CreditCard,
      description: "Financial transactions",
      color: "from-green-500 to-green-600",
    },
    {
      href: "/admin/reporting",
      label: "Reporting",
      icon: BarChart3,
      description: "Business reports",
      color: "from-violet-500 to-violet-600",
    },
    {
      href: "/admin/rate-calculator",
      label: "Rate Calculator",
      icon: Calculator,
      description: "Calculate shipping rates",
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
      description: "System-wide configuration",
      color: "from-slate-500 to-slate-600",
    },
    {
      href: "/admin/profile",
      label: "Profile",
      icon: UserCircle,
      description: "Manage your profile and password",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-72 flex-col admin-sidebar text-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/10 admin-header px-6 py-5">
            <div className="flex items-center gap-3">
              {/* Logo Box */}
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                <Image
                  src="/images/Logo.png"
                  alt="Clean J Shipping"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </div>
              {/* Title */}
              <div>
                <div className="text-xl font-bold tracking-tight">
                  Clean J Shipping
                </div>
                <div className="text-xs text-gray-300 font-medium">
                  Admin Portal
                </div>
              </div>
            </div>
          </div>

                    <nav className="flex-1 overflow-y-auto space-y-1 p-4 pr-2 sidebar-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const currentPath = pathname || "";
              const isActive = item.href === "/admin"
                ? currentPath === "/admin"
                : (currentPath === item.href || currentPath.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary-light-blue text-white shadow-lg backdrop-blur-sm"
                      : "text-gray-300-custom hover:bg-white/10 hover:text-white"
                  }`}
                  title={item.description}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${
                      item.color
                    } shadow-md transition-transform duration-200 ${
                      isActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && (
                    <>
            <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-lg" />
                      <ChevronRight className="h-4 w-4 text-white" />
                    </>
                  )}
                  {!isActive && (
                    <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer with Logout button */}
          <div className="border-t border-white/10 p-4">
            <form action="/api/auth/logout" method="POST">
              <LogoutButton />
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur md:hidden">
          <div className="relative flex items-center justify-between px-3 py-2">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Image src="/images/Logo.png" alt="Clean J Shipping" width={70} height={36} />
            </div>

            {/* Center: Title */}
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-900">
              Clean J Shipping
            </div>

            {/* Right: Toggle */}
            <button
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 transform bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl transition-transform">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                    <Image src="/images/Logo.png" alt="Clean J Shipping" width={36} height={36} />
                  </div>
                  <div className="text-sm font-semibold">Admin Portal</div>
                </div>
                <button
                  aria-label="Close sidebar"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-white/20 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-140px)] sidebar-scrollbar">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const currentPath = pathname || "";
                  const isActive = item.href === "/admin"
                    ? currentPath === "/admin"
                    : (currentPath === item.href || currentPath.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
                          : "text-blue-100 hover:bg-white/10 hover:text-white"
                      }`}
                      title={item.description}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md`}>
                        <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                      </div>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-white/10 p-4">
                <form action="/api/auth/logout" method="POST">
                  <LogoutButton />
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Main content area - Scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}