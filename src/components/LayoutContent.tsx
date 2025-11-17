"use client";

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SessionProvider } from 'next-auth/react';

const TopHeader = dynamic(() => import('@/components/TopHeader'), { ssr: false });

const HIDE_HEADER_PATHS = ['/admin', '/customer', '/warehouse', '/login'];

function shouldShowHeader(pathname: string) {
  return !HIDE_HEADER_PATHS.some(path => pathname && pathname.startsWith(path));
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = shouldShowHeader(pathname || '');

  return (
    <SessionProvider>
      {showHeader && <TopHeader />}
      <main className={!showHeader ? 'min-h-screen' : ''}>
        {children}
      </main>
    </SessionProvider>
  );
}
