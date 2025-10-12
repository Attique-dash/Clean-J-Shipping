"use client";

import { useEffect, useState } from "react";

type Bill = {
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: "submitted" | "reviewed" | "rejected" | "none";
  document_url?: string;
  last_updated?: string;
};

export default function CustomerBillsPage() {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("USD");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      const list: Bill[] = Array.isArray(data?.bills) ? data.bills : [];
      setItems(list);
      const ccy = list.find((b: Bill) => b.currency)?.currency || "USD";
      setCurrency(ccy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalDue = items.reduce((s, it) => s + (Number(it.amount_due) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">💲</span>
          <h1 className="text-2xl font-semibold">Bills & Payments</h1>
        </div>
        <div className="text-sm text-gray-700">
          Balance Due: <span className="font-semibold">{totalDue.toLocaleString(undefined, { style: 'currency', currency })}</span>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">No bills found</div>
        ) : (
          items.map((b) => (
            <div key={`${b.tracking_number}-${b.invoice_number || 'doc'}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium">Invoice: {b.invoice_number || 'N/A'}</div>
              <div className="grid gap-2 px-4 py-3">
                <div className="text-sm"><span className="text-gray-500">Date:</span> {b.invoice_date ? new Date(b.invoice_date).toLocaleDateString() : '-'}</div>
                <div className="text-sm"><span className="text-gray-500">Amount:</span> {(b.amount_due || 0).toLocaleString(undefined, { style: 'currency', currency: b.currency || currency })}</div>
                <div className="text-sm"><span className="text-gray-500">Status:</span> <span className="capitalize">{b.payment_status.replaceAll('_',' ')}</span></div>
                <div className="text-sm"><span className="text-gray-500">Tracking:</span> {b.tracking_number}</div>
                <div className="text-sm"><span className="text-gray-500">Document:</span> {b.document_url ? <a className="text-blue-600 hover:underline" href={b.document_url} target="_blank">View</a> : '-'}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Primary action */}
      <div>
        <a href="/dashboard/payments" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Make Payment</a>
      </div>
    </div>
  );
}
