import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-[#0f4d8a] text-white md:block">
          <div className="border-b border-white/10 bg-[#0e447d] px-4 py-4">
            <div className="mt-1 text-lg font-semibold">Admin Portal</div>
          </div>
          <nav className="space-y-1 py-4">
            <SideLink href="/admin" label="Home" icon="🏠" title="Purpose: Admin dashboard overview | Endpoint: GET /api/admin/reports/summary" />
            <SideLink href="/admin/pos" label="Point of Sale" icon="🧾" title="Purpose: In-person transaction processing | Endpoint: POST /api/admin/pos/transactions" />
            <SideLink href="/admin/packages" label="Packages" icon="📦" title="Purpose: Manage all system packages | Endpoint: GET /api/admin/packages" />
            <SideLink href="/admin/unknown-packages" label="Unknown Pkgs" icon="❓" title="Purpose: Handle unassigned packages | Endpoint: GET /api/admin/packages/unknown" />
            <SideLink href="/admin/pre-alerts" label="Pre-Alerts" icon="⚠️" title="Purpose: Manage incoming shipment notifications | Endpoint: GET /api/admin/pre-alerts" />
            <SideLink href="/admin/customers" label="Customers" icon="👥" title="Purpose: Customer management | Endpoint: GET /api/admin/customers" />
            <SideLink href="/admin/shipments" label="Shipments" icon="🚚" title="Purpose: Manage manifests and batches | Endpoint: POST /api/warehouse/manifests/update" />
            <SideLink href="/admin/broadcasts" label="Broadcast Messages" icon="📣" title="Purpose: Send announcements | Endpoint: POST /api/admin/broadcast-messages" />
            <SideLink href="/admin/receivals" label="Receivals" icon="📥" title="Purpose: Manage incoming receipts | Endpoint: POST /api/warehouse/packages/add" />
            <SideLink href="/admin/transactions" label="Transactions" icon="💳" title="Purpose: Financial transactions | Endpoint: GET /api/admin/transactions" />
            <SideLink href="/admin/reporting" label="Reporting" icon="📊" title="Purpose: Business reports | Endpoint: GET /api/admin/reports/{type}" />
            <SideLink href="/admin/documentation" label="Documentation" icon="📖" title="Purpose: Guides and API docs | Endpoint: Static content" />
          </nav>
        </aside>

       <div className="flex-1 bg-gray-50">

          <main className="p-4 sm:p-6">{children}</main>
        </div>   {/* Right column with top bar + content */}
      
      </div>
    </div>
  );
}

function SideLink({ href, label, icon, title }: { href: string; label: string; icon?: string; title?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-white/10"
      title={title}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
