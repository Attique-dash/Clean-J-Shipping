"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { LogoutButton } from "@/components/LogoutButton";
import {
  Home,
  Package,
  FileText,
  MessageSquare,
  Bell,
  User,
  Menu,
  X,
  CreditCard,
  Headphones,
  ChevronRight,
  Receipt,
  Upload,
} from "lucide-react";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/customer/dashboard", label: "Dashboard", icon: Home, description: "Customer dashboard overview", color: "from-blue-500 to-blue-600" },
    { href: "/customer/packages", label: "Packages", icon: Package, description: "Track and manage packages", color: "from-indigo-500 to-indigo-600" },
    { href: "/customer/invoices", label: "My Invoices", icon: FileText, description: "View system-generated invoices", color: "from-violet-500 to-violet-600" },
    { href: "/customer/invoice-upload", label: "Package Invoices", icon: Upload, description: "Upload package invoices", color: "from-purple-500 to-purple-600" },
    { href: "/customer/bills", label: "Bills", icon: Receipt, description: "View and pay bills", color: "from-cyan-500 to-cyan-600" },
    { href: "/customer/payments", label: "Payments", icon: CreditCard, description: "Payment history", color: "from-green-500 to-green-600" },
    { href: "/customer/messages", label: "Messages", icon: MessageSquare, description: "Communication center", color: "from-pink-500 to-pink-600" },
    { href: "/customer/pre-alerts", label: "Pre-Alerts", icon: Bell, description: "Shipment notifications", color: "from-yellow-500 to-yellow-600" },
    { href: "/customer/profile", label: "Profile", icon: User, description: "Manage your profile", color: "from-orange-500 to-orange-600" },
    { href: "/customer/contact", label: "Contact Us", icon: Headphones, description: "Get in touch with us", color: "from-teal-500 to-teal-600" },
  ];

  const isNavActive = (href: string) => {
    if (href === "/customer") return pathname === "/customer";
    if (href === "/customer/bills") return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith("/customer/pay/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-72 flex-col admin-sidebar text-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/10 admin-header px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                <Image src="/images/Logo.png" alt="Clean J Shipping" width={40} height={40} className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">Clean J Shipping</div>
                <div className="text-xs text-gray-300 font-medium">Customer Portal</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-1 p-4 pr-2 sidebar-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.href);
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
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
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

          {/* Sidebar footer with Logout */}
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
            <div className="flex items-center">
              <Image src="/images/Logo.png" alt="Clean J Shipping" width={70} height={36} />
            </div>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-900">
              Clean J Shipping
            </div>
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
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 transform bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl transition-transform">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                    <Image src="/images/Logo.png" alt="Clean J Shipping" width={36} height={36} />
                  </div>
                  <div className="text-sm font-semibold">Customer Portal</div>
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
                  const isActive = isNavActive(item.href);
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

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
