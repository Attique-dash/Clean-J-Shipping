"use client";

import { useEffect, useState } from "react";

type ArchivedPackage = {
  tracking_number: string;
  description?: string;
  status: string;
  last_updated?: string;
};

type ArchivedBill = {
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: string;
  document_url?: string;
  last_updated?: string;
};

type ArchivedMessage = {
  subject?: string | null;
  body: string;
  sender: string;
  created_at?: string;
};

export default function CustomerArchivesPage() {
  const [packages, setPackages] = useState<ArchivedPackage[]>([]);
  const [bills, setBills] = useState<ArchivedBill[]>([]);
  const [messages, setMessages] = useState<ArchivedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/archives", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load archives");
      setPackages(Array.isArray(data?.packages) ? data.packages : []);
      setBills(Array.isArray(data?.bills) ? data.bills : []);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Blue header */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-[#153e75] px-6 py-3 text-white">
          <h1 className="text-lg font-semibold">Archived Records</h1>
        </div>
        <div className="space-y-6 bg-white p-6">
          {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* Archived Packages */}
          <section className="rounded-xl border">
            <div className="border-b px-4 py-3 text-sm font-semibold">Archived Packages</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2 text-left">Tracking</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-3 py-4" colSpan={5}>Loading...</td></tr>
                  ) : packages.length === 0 ? (
                    <tr><td className="px-3 py-4" colSpan={5}>No completed packages</td></tr>
                  ) : (
                    packages.map((p) => (
                      <tr key={p.tracking_number}>
                        <td className="px-3 py-2 font-medium">{p.tracking_number}</td>
                        <td className="px-3 py-2">{p.description || '-'}</td>
                        <td className="px-3 py-2">{p.status}</td>
                        <td className="px-3 py-2">{p.last_updated ? new Date(p.last_updated).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 text-right">
                          <a className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50" href={`/dashboard/packages?tracking=${encodeURIComponent(p.tracking_number)}`}>View Details</a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lower grid: bills + messages */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bills */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 text-sm font-semibold">Archived Bills</div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading...</div>
                ) : bills.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No bills</div>
                ) : (
                  bills.map((b) => (
                    <div key={`${b.tracking_number}-${b.invoice_number||'doc'}`} className="flex items-center justify-between gap-3 p-4">
                      <div className="text-sm">
                        <div className="font-medium">Invoice {b.invoice_number || 'N/A'}</div>
                        <div className="text-gray-600">{b.invoice_date ? new Date(b.invoice_date).toLocaleDateString() : '-'}</div>
                        <div className="text-gray-600">{(b.amount_due||0).toLocaleString(undefined,{style:'currency',currency:b.currency||'USD'})} • <span className="capitalize">{b.payment_status.replaceAll('_',' ')}</span></div>
                      </div>
                      <div className="shrink-0">
                        {b.document_url ? (
                          <a href={b.document_url} target="_blank" className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50">View PDF</a>
                        ) : (
                          <span className="rounded-md border px-3 py-1 text-xs text-gray-400">No PDF</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Messages */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 text-sm font-semibold">Archived Messages</div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No messages</div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-4">
                      <div className="text-sm">
                        <div className="font-medium">{m.subject || 'Support Team'}</div>
                        <div className="text-gray-600">{m.sender} • {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</div>
                        <div className="line-clamp-1 text-gray-700">{m.body}</div>
                      </div>
                      <a className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50" href="/dashboard/messages">View Details</a>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
