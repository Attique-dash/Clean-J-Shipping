"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopHeader({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  // Hide header on auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 text-gray-900 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">Tasoko</Link>
        <div className="flex items-center gap-2">
          {!loggedIn ? (
            <>
              <Link href="/login" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Login</Link>
              <Link href="/register" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Register</Link>
            </>
          ) : (
            <form action="/api/auth/logout" method="POST">
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Logout</button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
