"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Package,
  FileText,
  CreditCard,
  MessageSquare,
  Mail,
  Bell,
  Archive,
  User,
  Settings,
  Menu,
  X,
  ChevronRight,
  UserCog,
  Contact
} from "lucide-react";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      description: "Customer dashboard overview",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/customer/profile",
      label: "Profile",
      icon: User,
      description: "View and update your profile",
      color: "from-green-500 to-green-600",
    },
    {
      href: "/customer/packages",
      label: "Packages",
      icon: Package,
      description: "View and track your packages",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      href: "/customer/bills",
      label: "Bills",
      icon: FileText,
      description: "View and manage your bills",
      color: "from-pink-500 to-pink-600",
    },
    {
      href: "/customer/payments",
      label: "Payments",
      icon: CreditCard,
      description: "Make and track payments",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/customer/messages",
      label: "Messages",
      icon: MessageSquare,
      description: "View and send messages",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      href: "/customer/contact",
      label: "Contact Us",
      icon: Contact,
      description: "Get in touch with support",
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/customer/pre-alerts",
      label: "Pre-Alerts",
      icon: Bell,
      description: "Manage your shipment notifications",
      color: "from-red-500 to-red-600",
    },
    {
      href: "/customer/archives",
      label: "Archives",
      icon: Archive,
      description: "View archived items",
      color: "from-gray-500 to-gray-600",
    },
  ];

  return (
    <div className="h-screen w-full overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="flex h-full w-full">
        {/* Desktop Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl overflow-hidden flex-col`}>
          {/* Header */}
          <div className="border-b border-white/10 bg-gradient-to-r from-[#0e447d] to-[#0c3a6b] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">
                  Clean J Shipping
                </div>
                <div className="text-xs text-amber-400 font-medium">
                  Customer Portal
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto pr-2 scrollbar-orange overscroll-contain">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/customer"
                ? pathname === "/customer"
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
                  onClick={() => setMobileOpen(false)}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${
                      item.color
                    } shadow-md transition-transform duration-200 ${
                      isActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                  >
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
              <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition">
                Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="relative flex-1 h-full overflow-y-auto bg-gray-50">
          {/* Mobile header (small screens) */}
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur lg:hidden">
            <div className="relative flex items-center justify-between px-3 py-2">
              {/* Left: Logo */}
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
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

          <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-full">
            <div className="mx-auto w-full max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
