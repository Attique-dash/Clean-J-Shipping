// src/app/warehouse/layout.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaBox,
  FaBoxes,
  FaSearch,
  FaUserCog,
  FaUsers,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHome,
  FaExclamationTriangle,
  FaFileUpload,
  FaBarcode,
  FaWarehouse,
} from 'react-icons/fa';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unknownPackagesCount, setUnknownPackagesCount] = useState(0);

  // Check for unknown packages
  useEffect(() => {
    const checkUnknownPackages = async () => {
      try {
        const res = await fetch('/api/warehouse/packages/unknown/count');
        const data = await res.json();
        if (res.ok) {
          setUnknownPackagesCount(data.count);
        }
      } catch (error) {
        console.error('Error checking unknown packages:', error);
      }
    };

    if (status === 'authenticated') {
      checkUnknownPackages();
      const interval = setInterval(checkUnknownPackages, 300000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [status]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/warehouse/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/warehouse', icon: FaHome },
    { name: 'Packages', href: '/warehouse/packages', icon: FaBox },
    { name: 'Scan', href: '/warehouse/scan', icon: FaBarcode },
    { name: 'Search', href: '/warehouse/search', icon: FaSearch },
    {
      name: 'Unknown Packages',
      href: '/warehouse/unknown-packages',
      icon: FaExclamationTriangle,
      count: unknownPackagesCount,
    },
    { name: 'Bulk Upload', href: '/warehouse/bulk-upload', icon: FaFileUpload },
    { name: 'Manifests', href: '/warehouse/manifests', icon: FaBoxes },
    { name: 'Inventory', href: '/warehouse/inventory', icon: FaWarehouse },
    { name: 'Settings', href: '/warehouse/settings', icon: FaCog },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-800 transition-transform duration-300 ease-in-out z-50`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-gray-900">
          <div className="flex items-center">
            <FaBox className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-xl font-semibold text-white">
              Warehouse Portal
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  pathname === item.href
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon
                  className={`mr-3 h-6 w-6 ${
                    pathname === item.href
                      ? 'text-blue-400'
                      : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                />
                {item.name}
                {item.count ? (
                  <span className="ml-auto inline-block py-0.5 px-3 text-xs font-medium rounded-full bg-red-600 text-white">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                className="h-10 w-10 rounded-full"
                src={session.user?.image || '/images/avatar-placeholder.png'}
                alt="User avatar"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {session.user?.name}
              </p>
              <p className="text-xs font-medium text-gray-400">
                {session.user?.email}
              </p>
            </div>
          </div>
            <form action="/api/auth/logout" method="POST" className="mt-4">
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <FaSignOutAlt className="mr-2" /> Sign out
              </button>
            </form>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex items-center h-16 px-4 bg-gray-900">
            <FaBox className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-xl font-semibold text-white">
              Warehouse Portal
            </span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      pathname === item.href
                        ? 'text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                  />
                  {item.name}
                  {item.count ? (
                    <span className="ml-auto inline-block py-0.5 px-3 text-xs font-medium rounded-full bg-red-600 text-white">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-full"
                  src={session.user?.image || '/images/avatar-placeholder.png'}
                  alt="User avatar"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {session.user?.name}
                </p>
                <p className="text-xs font-medium text-gray-400">
                  {session.user?.email}
                </p>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST" className="mt-4">
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <FaSignOutAlt className="mr-2" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="sr-only">Open sidebar</span>
            <FaBars className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      <ToastContainer position="bottom-right" />
    </div>
  );
}