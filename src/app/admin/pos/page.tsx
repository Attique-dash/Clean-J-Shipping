"use client";

import { useState, useEffect } from "react";

type Item = { sku?: string; product_id?: string; name?: string; qty: string; unit_price: string };

type Txn = {
  receipt_no: string;
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  created_at: string;
};

export default function AdminPosPage() {
  // Customers
  const [customers, setCustomers] = useState<{ id: string; name: string; email?: string; userCode?: string }[]>([]);
  const [customerCode, setCustomerCode] = useState("");

  // Services preset per UI
  const services = [
    { key: "receive", name: "Package Receival", amount: 25.0 },
    { key: "storage", name: "Storage Fee - $15/month", amount: 45.0 },
    { key: "shipping", name: "Shipping Fee", amount: 45.0 },
    { key: "handling", name: "Handling Fee", amount: 10.0 },
  ] as const;
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Payment
  const [method, setMethod] = useState("card");

  // Notes/UX
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastTxn, setLastTxn] = useState<Txn | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load customers to populate dropdown (best-effort)
  useEffect(() => {
    fetch("/api/admin/customers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        const mapped = list.map((c: any) => ({
          id: String(c._id ?? c.id ?? c.userCode ?? Math.random()),
          name: c.name ?? c.fullName ?? c.email ?? c.userCode ?? "Customer",
          email: c.email,
          userCode: c.userCode,
        }));
        setCustomers(mapped);
      })
      .catch(() => {});
  }, []);

  const subtotal = services.reduce((sum, s) => sum + (selected[s.key] ? s.amount : 0), 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100; // 10% example
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Build items from selected services
      const items: Item[] = services
        .filter((s) => selected[s.key])
        .map((s) => ({ name: s.name, qty: "1", unit_price: String(s.amount) }));

      const payload = {
        customer_code: customerCode || undefined,
        method,
        items: items.map((i) => ({ name: i.name || undefined, qty: Number(i.qty), unit_price: Number(i.unit_price) })),
        notes: notes || undefined,
      };
      const res = await fetch("/api/admin/pos/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to process transaction");
      setLastTxn(data as Txn);
      setSelected({});
      setCustomerCode("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Point of Sale</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Customer selectors */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-gray-600">Customer</div>
              <select className="mt-1 w-full rounded border px-3 py-2" value={customerCode} onChange={(e) => setCustomerCode(e.target.value)}>
                <option value="">Select customer (optional)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.userCode || c.email || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-600">Notes</div>
              <input className="mt-1 w-full rounded border px-3 py-2" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Tabs placeholder to mirror UI */}
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2 border-b px-2 py-2 text-sm">
            <button type="button" className="rounded bg-gray-900 px-3 py-1 text-white">Services</button>
            <button type="button" className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100">Fees</button>
            <button type="button" className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100">Payments</button>
          </div>
          {/* Services checklist */}
          <div className="p-4">
            <div className="mb-3 font-medium">Services</div>
            <div className="space-y-2">
              {services.map((s) => (
                <label key={s.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={!!selected[s.key]} onChange={(e) => setSelected((prev) => ({ ...prev, [s.key]: e.target.checked }))} />
                    {s.name}
                  </span>
                  <span className="font-medium">${s.amount.toFixed(2)}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-gray-700">
              <div className="flex items-center justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Tax:</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between font-semibold text-gray-900"><span>Total:</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">Payment Method</div>
              <select className="rounded border px-3 py-2" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="visa">VISA</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">AmEx</option>
                <option value="bank">Bank</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
            {error && <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
            <div className="mt-4">
              <button disabled={submitting || subtotal === 0} className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Processing..." : "Process Payment"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {lastTxn && (
        <div className="rounded-lg border p-4">
          <div className="font-medium mb-2">Receipt</div>
          <div className="text-sm">Receipt #: {lastTxn.receipt_no}</div>
          <div className="text-sm">Method: {lastTxn.method.toUpperCase()}</div>
          <div className="text-sm">Subtotal: ${lastTxn.subtotal.toFixed(2)} | Tax: ${lastTxn.tax.toFixed(2)} | Total: ${lastTxn.total.toFixed(2)}</div>
          <div className="text-xs text-neutral-400">Created at: {new Date(lastTxn.created_at).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
