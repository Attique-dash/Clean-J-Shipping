// src/app/warehouse/layout.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaBox,
  FaBoxes,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaHome,
  FaFileUpload,
  FaWarehouse,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { ChevronRight, Menu, X } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type NavigationItem = {
  href: string;
  label: string;
  icon: IconType;
  description: string;
  color: string;
  count?: number;
};

export default function WarehouseLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const navigation: NavigationItem[] = [
    {
      href: "/warehouse",
      label: "Dashboard",
      icon: FaHome,
      description: "Warehouse dashboard overview",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/warehouse/packages",
      label: "Packages",
      icon: FaBox,
      description: "Manage all packages",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/warehouse/bulk-upload",
      label: "Bulk Upload",
      icon: FaFileUpload,
      description: "Upload multiple packages",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      href: "/warehouse/manifests",
      label: "Manifests",
      icon: FaBoxes,
      description: "Create shipment manifests",
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/warehouse/inventory",
      label: "Inventory",
      icon: FaWarehouse,
      description: "Track packing materials",
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/warehouse/customers",
      label: "Customers",
      icon: FaUsers,
      description: "Customer management",
      color: "from-pink-500 to-pink-600",
    },
    {
      href: "/warehouse/messages",
      label: "Messages",
      icon: FaComments,
      description: "Customer messages and support",
      color: "from-green-500 to-green-600",
    },
    {
      href: "/warehouse/settings",
      label: "Settings",
      icon: FaCog,
      description: "Warehouse settings",
      color: "from-slate-500 to-slate-600",
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-72 flex-col bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl">
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
                  className="h-10 w-10 object-contain"
                />
              </div>
              {/* Title */}
              <div>
                <div className="text-xl font-bold tracking-tight">
                  Clean J Shipping
                </div>
                <div className="text-xs text-amber-400 font-medium">
                  Warehouse Portal
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Scrollable */}
          <style jsx global>{`
            /* Custom scrollbar for WebKit browsers */
            .sidebar-scrollbar {
              overflow-y: auto;
            }
            .sidebar-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .sidebar-scrollbar::-webkit-scrollbar-track {
              background: transparent;
              margin: 8px 0;
            }
            .sidebar-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
              border-radius: 3px;
              transition: background 0.2s ease-in-out;
            }
            .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.4);
            }
            /* Custom scrollbar for Firefox */
            .sidebar-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            }
          `}</style>
          <nav className="flex-1 overflow-y-auto space-y-1 p-4 pr-2 sidebar-scrollbar">
            {navigation.map((item) => {
              const Icon = item.icon;
              const currentPath = pathname || "";
              const isActive = item.href === "/warehouse"
                ? currentPath === "/warehouse"
                : (currentPath === item.href || currentPath.startsWith(item.href + "/"));

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
                  {item.count && (
                    <span className="ml-auto inline-block py-0.5 px-3 text-xs font-medium rounded-full bg-red-600 text-white">
                      {item.count}
                    </span>
                  )}
                  {isActive && (
                    <>
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-lg" />
                      <ChevronRight className="h-4 w-4 text-white" />
                    </>
                  )}
                  {!isActive && !item.count && (
                    <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer with user info and Logout button */}
          <div className="border-t border-white/10 p-4">
            
            <form action="/api/auth/logout" method="POST">
              <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition">
                <FaSignOutAlt className="inline mr-2" />
                Logout
              </button>
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
              Warehouse Portal
            </div>

            {/* Right: Toggle */}
            <button
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 transform bg-gradient-to-b from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] text-white shadow-2xl transition-transform">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 backdrop-blur-sm">
                    <Image src="/images/Logo.png" alt="Clean J Shipping" width={36} height={36} />
                  </div>
                  <div className="text-sm font-semibold">Warehouse Portal</div>
                </div>
                <button
                  aria-label="Close sidebar"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-white/20 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-140px)] sidebar-scrollbar">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const currentPath = pathname || "";
                  const isActive = item.href === "/warehouse"
                    ? currentPath === "/warehouse"
                    : (currentPath === item.href || currentPath.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
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
                      {item.count && (
                        <span className="ml-auto inline-block py-0.5 px-3 text-xs font-medium rounded-full bg-red-600 text-white">
                          {item.count}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-white/10 p-4">
                
                <form action="/api/auth/logout" method="POST">
                  <button className="w-full rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition">
                    <FaSignOutAlt className="inline mr-2" />
                    Logout
                  </button>
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

      <ToastContainer position="bottom-right" />
    </div>
  );
}