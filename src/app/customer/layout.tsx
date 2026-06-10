"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import {
  Home,
  Package,
  FileText,
  MessageSquare,
  Bell,
  User,
  Menu,
  X,
  MapPin,
  CreditCard,
} from "lucide-react";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: "/customer/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/customer/packages",
      label: "Packages",
      icon: Package,
    },
    {
      href: "/customer/shipping-addresses",
      label: "Shipping Addresses",
      icon: MapPin,
    },
    {
      href: "/customer/invoice-upload",
      label: "Package Invoices",
      icon: FileText,
    },
    {
      href: "/customer/bills",
      label: "Bills",
      icon: FileText,
    },
    {
      href: "/customer/payments",
      label: "Payments",
      icon: CreditCard,
    },
    {
      href: "/customer/messages",
      label: "Messages",
      icon: MessageSquare,
    },
    {
      href: "/customer/pre-alerts",
      label: "Pre-Alerts",
      icon: Bell,
    },
    {
      href: "/customer/profile",
      label: "Profile",
      icon: User,
    },
  ];

  return (
    <div className="h-screen w-full overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="flex h-full w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 h-screen bg-white border-r border-gray-200 flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/Logo.png"
                alt="Clean J Shipping"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <div>
                <div className="text-lg font-bold text-gray-900">
                  Clean J Shipping
                </div>
                <div className="text-xs text-gray-500">
                  Customer Portal
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/customer"
                  ? pathname === "/customer"
                  : item.href === "/customer/bills"
                  ? pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    pathname.startsWith("/customer/pay/")
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium mb-1 ${
                    isActive
                      ? "bg-[#0f4d8a] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>


          {/* Logout */}
          <div className="border-t border-gray-200 p-4">
            <form action="/api/auth/logout" method="POST">
              <button className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 text-left">
                Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="relative flex-1 h-full overflow-y-auto bg-gray-50">
          {/* Mobile header */}
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Image
                src="/images/Logo.png"
                alt="Clean J Shipping"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <div className="text-base font-semibold text-gray-900">
                Clean J Shipping
              </div>
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 hover:bg-gray-50"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/images/Logo.png"
                      alt="Clean J Shipping"
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Clean J Shipping</div>
                      <div className="text-xs text-gray-500">Customer Portal</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-200 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="p-4 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/customer"
                        ? pathname === "/customer"
                        : item.href === "/customer/bills"
                        ? pathname === item.href ||
                          pathname.startsWith(item.href + "/") ||
                          pathname.startsWith("/customer/pay/")
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium mb-1 ${
                          isActive
                            ? "bg-[#0f4d8a] text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-gray-200 p-4">
                  <form action="/api/auth/logout" method="POST">
                    <button className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 text-left">
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-full">
            <div className="mx-auto w-full max-w-full overflow-x-hidden">
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
