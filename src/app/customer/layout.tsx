"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";
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
  Contact,
  HelpCircle,
  Headphones,
  Gift,
  ShoppingCart,
  MapPin,
} from "lucide-react";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  // Load cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const cartData = localStorage.getItem('customer_cart');
      if (cartData) {
        try {
          const trackingNumbers = JSON.parse(cartData);
          setCartCount(trackingNumbers.length);
        } catch (e) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();
    // Listen for storage changes (when cart is updated in other tabs)
    window.addEventListener('storage', updateCartCount);
    // Also check periodically
    const interval = setInterval(updateCartCount, 1000);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      href: "/customer/dashboard",
      label: "Dashboard",
      icon: Home,
      description: "Customer dashboard overview",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/customer/packages",
      label: "Packages",
      icon: Package,
      description: "View and track your packages",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      href: "/customer/addresses",
      label: "Addresses",
      icon: MapPin,
      description: "Manage your shipping addresses for air and sea delivery",
      color: "from-orange-500 to-orange-600",
    },
     {
      href: "/customer/invoice-upload",
      label: "Package Invoices",
      icon: FileText,
      description: "Upload invoice details and costs for received packages",
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/customer/bills",
      label: "Bills & Payments",
      icon: FileText,
      description: "View and manage your bills and payments",
      color: "from-pink-500 to-pink-600",
    },
    {
      href: "/customer/messages",
      label: "Messages",
      icon: MessageSquare,
      description: "View and send messages",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      href: "/customer/faq",
      label: "FAQ",
      icon: HelpCircle,
      description: "Frequently asked questions",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/customer/support",
      label: "Support",
      icon: Headphones,
      description: "Support tickets and help",
      color: "from-purple-500 to-purple-600",
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
      description: "View archived packages and messages",
      color: "from-gray-500 to-gray-600",
    },
    {
      href: "/customer/profile",
      label: "Profile",
      icon: User,
      description: "View and update your profile",
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <div className="h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 text-gray-900">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 flex h-full w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 h-screen bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <div className="border-b border-white/10 bg-gradient-to-r from-[#0e447d] to-[#0c3a6b] px-6 py-5">
            <div className="flex items-center justify-between gap-3">
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
                  <div className="text-xs font-medium text-[#E67919] mt-1">
                    Customer Portal
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto pr-2 scrollbar-orange overscroll-contain">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Special case: Bills & Payments should be active for both /customer/bills and /customer/payments
              const isActive =
                item.href === "/customer"
                  ? pathname === "/customer"
                  : item.href === "/customer/bills"
                  ? pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    pathname === "/customer/payments" ||
                    pathname.startsWith("/customer/payments/")
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");

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

          {/* Cart Link */}
          {cartCount > 0 && (
            <div className="border-t border-white/10 p-4">
              <Link
                href="/customer/checkout"
                className="group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white shadow-lg hover:shadow-xl"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 shadow-md">
                  <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="flex-1 text-left">Checkout Cart</span>
                <span className="bg-white text-[#E67919] text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>
            </div>
          )}

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
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur md:hidden">
            <div className="relative flex items-center justify-between px-3 py-2">
              {/* Left: Logo */}
              <div className="flex items-center">
                <Image
                  src="/images/Logo.png"
                  alt="Clean J Shipping"
                  width={70}
                  height={36}
                />
              </div>

              {/* Center: Title */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-900">
                Clean J Shipping
              </div>

              {/* Right: Cart & Toggle */}
              <div className="flex items-center gap-2">
                {cartCount > 0 && (
                  <Link
                    href="/customer/checkout"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"
                    aria-label="Shopping cart"
                  >
                    <ShoppingCart className="h-5 w-5 text-gray-700" />
                    <span className="absolute -top-1 -right-1 bg-[#E67919] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  </Link>
                )}
                <button
                  aria-label="Open sidebar"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
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
                        <Image
                          src="/images/Logo.png"
                          alt="Clean J Shipping"
                          width={36}
                          height={36}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Clean J Shipping</div>
                        <div className="text-xs font-medium text-[#E67919] mt-0.5">
                          Customer Portal
                        </div>
                      </div>
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
                    // Special case: Bills & Payments should be active for both /customer/bills and /customer/payments
                    const isActive =
                      item.href === "/customer"
                        ? pathname === "/customer"
                        : item.href === "/customer/bills"
                        ? pathname === item.href ||
                          pathname.startsWith(item.href + "/") ||
                          pathname === "/customer/payments" ||
                          pathname.startsWith("/customer/payments/")
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
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
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-md`}
                        >
                          <Icon
                            className="h-5 w-5 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-60" />
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-white/10 p-4">
                  <form action="/api/auth/logout" method="POST">
                    <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition">
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
