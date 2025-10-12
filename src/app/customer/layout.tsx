export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl grid grid-cols-12 gap-6 p-6">
      <aside className="col-span-12 md:col-span-3 space-y-2">
        <div className="rounded-lg border p-4">
          <div className="font-semibold mb-2">Customer</div>
          <nav className="grid gap-2 text-sm">
            <a className="hover:underline" href="/customer/manage-account">Manage Account</a>
            <a className="hover:underline" href="/customer/profile">Profile</a>
            <a className="hover:underline" href="/customer/packages">Packages</a>
            <a className="hover:underline" href="/customer/bills">Bills</a>
            <a className="hover:underline" href="/customer/payments">Payments</a>
            <a className="hover:underline" href="/customer/messages">Messages</a>
            <a className="hover:underline" href="/customer/contact">Contact Us</a>
            <a className="hover:underline" href="/customer/pre-alerts">Pre-Alerts</a>
            <a className="hover:underline" href="/customer/archives">Archives</a>
          </nav>
        </div>
      </aside>
      <main className="col-span-12 md:col-span-9">{children}</main>
    </div>
  );
}
