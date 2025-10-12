"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-0px)] grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="bg-[#0d3b66] text-white">
        <div className="sticky top-0 flex h-full flex-col gap-2 p-4 md:p-6">
          <div className="mb-2 text-base font-semibold tracking-tight">Customer Portal</div>
          <nav className="flex flex-col gap-1">
            <NavItem href="/dashboard" label="Overview" icon={<span>🏠</span>} />
            <NavItem href="/dashboard/invoice-upload" label="Submit Invoice" icon={<span>🧾</span>} />
            <NavItem href="/dashboard/pre-alerts" label="Pre-Alerts" icon={<span>🔔</span>} />
            <NavItem href="/dashboard/packages" label="Packages" icon={<span>📦</span>} />
            <NavItem href="/dashboard/bills" label="Bills" icon={<span>🧾</span>} />
            <NavItem href="/dashboard/payments" label="Payments" icon={<span>💳</span>} />
            <NavItem href="/dashboard/contact" label="Contact Us" icon={<span>📞</span>} />
            <NavItem href="/dashboard/messages" label="Messages" icon={<span>✉️</span>} />
            <NavItem href="/dashboard/profile" label="Manage Account" icon={<span>👤</span>} />
            <NavItem href="/dashboard/archives" label="Archives" icon={<span>🗂️</span>} />
          </nav>
          <div className="mt-auto text-xs text-white/60">Tasoko</div>
        </div>
      </aside>

      {/* Content */}
      <section className="min-w-0 bg-gray-50">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </section>
    </div>
  );
}
