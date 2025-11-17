"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";   
import {
  Home,
  ShoppingCart,
  Package,
  HelpCircle,
  Bell,
  Users,
  Wrench,
  Truck,
  Radio,
  Inbox,
  CreditCard,
  BarChart3,
  BookOpen,
  ChevronRight,
  Menu,
  X,
  FileText,
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
      href: "/admin/pos",
      label: "Point of Sale",
      icon: ShoppingCart,
      description: "In-person transaction processing",
      color: "from-green-500 to-green-600",
    },
    {
      href: "/admin/invoices",
      label: "Invoices",
      icon: FileText,
      description: "Generate and manage invoices",
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/admin/packages",
      label: "Packages",
      icon: Package,
      description: "Manage all system packages",
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/admin/unknown-packages",
      label: "Unknown Packages",
      icon: HelpCircle,
      description: "Handle unassigned packages",
      color: "from-orange-500 to-orange-600",
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
      href: "/admin/receivals",
      label: "Receivals",
      icon: Inbox,
      description: "Manage incoming receipts",
      color: "from-teal-500 to-teal-600",
    },
    {
      href: "/admin/transactions",
      label: "Transactions",
      icon: CreditCard,
      description: "Financial transactions",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      href: "/admin/reporting",
      label: "Reporting",
      icon: BarChart3,
      description: "Business reports",
      color: "from-violet-500 to-violet-600",
    },
    {
      href: "/admin/documentation",
      label: "Documentation",
      icon: BookOpen,
      description: "Guides and API docs",
      color: "from-slate-500 to-slate-600",
    },
  ];

  return (
    <div className="h-screen w-full overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="flex h-full w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 h-screen bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-[#0e447d] to-[#0c3a6b] px-6 py-5">
  <div className="flex items-center gap-3">
    
    {/* Logo Box */}
    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
      <Image
        src="/images/Logo.png"
        alt="Clean J Shipping"
        width={40}
        height={40}
        className="h-10 w-12 object-contain"
      />
    </div>

    {/* Title */}
    <div>
      <div className="text-xl font-bold tracking-tight">
        Clean J Shipping
      </div>
      <div className="text-xs text-amber-400 font-medium">
        Admin Portal
      </div>
    </div>
    
  </div>
</div>


          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto pr-2 scrollbar-orange overscroll-contain">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : (pathname === item.href || pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
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
        </aside>
        <div className="relative flex-1 h-full overflow-y-auto bg-gray-50">
          {/* Mobile header (small screens) */}
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

                <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-140px)] pr-2 scrollbar-orange overscroll-contain">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === "/admin"
                      ? pathname === "/admin"
                      : (pathname === item.href || pathname.startsWith(item.href + "/"));
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

          <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-full">
          <div className="mx-auto w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
        </div>{" "}
        {/* Right column with top bar + content */}
      </div>
    </div>
  );
}

function SideLink({
  href,
  label,
  icon,
  title,
}: {
  href: string;
  label: string;
  icon?: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-white/15 hover:backdrop-blur"
      title={title}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
