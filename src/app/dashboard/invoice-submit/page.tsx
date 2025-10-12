"use client";

import { useEffect, useMemo, useState } from "react";

type Pkg = {
  _id?: string;
  trackingNumber: string;
  status?: string;
  description?: string;
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_value: number; // camelCase will be normalized by API
  total_value: number;
};

export default function InvoiceSubmitPage() {
  // Load user packages to select tracking
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  // Invoice meta
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [totalValue, setTotalValue] = useState<string>("");

  // File
  const [file, setFile] = useState<File | null>(null);

  // Items table
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_value: 0, total_value: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/packages", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          const list = (data.items || []) as Pkg[];
          setPackages(list);
          if (list.length > 0) setSelectedId((list as any)[0]._id || "");
        } else {
          setError(data?.error || "Failed to load packages");
        }
      })
      .catch(() => setError("Failed to load packages"));
  }, []);

  // Keep item row totals synced
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        total_value: Number((it.quantity || 0) * (it.unit_value || 0)),
      }))
    );
  }, [items.length]);

  const computedItemsTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.total_value) || 0), 0),
    [items]
  );

  useEffect(() => {
    if (!totalValue || totalValue === "0") {
      // If total not manually set, auto-fill from computed items
      setTotalValue(String(Number(computedItemsTotal.toFixed(2))));
    }
  }, [computedItemsTotal]);

  function updateItem(idx: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_value: 0, total_value: 0 }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedId) return setError("Please select a package");
    if (!invoiceNumber) return setError("Please enter invoice number");
    if (!invoiceDate) return setError("Please select invoice date");
    if (!file) return setError("Please upload the invoice document");

    const form = new FormData();
    form.append("invoice_number", invoiceNumber);
    form.append("invoice_date", invoiceDate);
    form.append("total_value", totalValue || String(computedItemsTotal));
    form.append("currency", currency || "USD");
    form.append("items", JSON.stringify(items));
    form.append("files", file);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/packages/${selectedId}/invoice`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to submit invoice");
      } else {
        setMessage("Invoice submitted successfully");
        // Clear form but keep package selection
        setInvoiceNumber("");
        setInvoiceDate("");
        setCurrency("USD");
        setTotalValue("");
        setFile(null);
        setItems([{ description: "", quantity: 1, unit_value: 0, total_value: 0 }]);
      }
    } catch (err) {
      setError("Network error while submitting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Submit Invoice</h1>
        <p className="text-sm text-neutral-600">Provide invoice details, attach the document, and submit.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl border p-5 dark:border-neutral-800">
        {/* Header fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Package Tracking</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {packages.map((p) => (
                <option key={(p as any)._id} value={(p as any)._id}>
                  {(p.trackingNumber || "")} — {p.description || p.status || "Package"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm">Invoice Date</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm">Invoice Number</span>
              <input
                type="text"
                placeholder="INV-00123"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm">Total Value</span>
              <input
                type="number"
                step="0.01"
                placeholder="250.00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="KES">KES</option>
                <option value="TZS">TZS</option>
              </select>
            </label>
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-2 rounded-md border p-4 dark:border-neutral-800">
          <div className="text-sm font-medium">Upload Invoice Document</div>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="text-xs text-neutral-500">Allowed: PDF, JPG, PNG, WEBP. Max per file as configured.</div>
          {file && (
            <div className="text-xs text-neutral-600">Selected: {file.name}</div>
          )}
        </div>

        {/* Items table */}
        <div className="space-y-3 rounded-md border p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Items</div>
            <button type="button" onClick={addRow} className="rounded-md bg-neutral-200 px-3 py-1 text-sm dark:bg-neutral-700">
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-600">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2 w-32">Unit Value</th>
                  <th className="p-2 w-32">Total</th>
                  <th className="p-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t dark:border-neutral-800">
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-right dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={it.unit_value}
                        onChange={(e) => updateItem(idx, { unit_value: Number(e.target.value || 0) })}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-right dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={Number((it.quantity || 0) * (it.unit_value || 0)).toFixed(2)}
                        readOnly
                        className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-right dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t dark:border-neutral-800">
                  <td className="p-2 text-right font-medium" colSpan={3}>
                    Total:
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={Number(totalValue || computedItemsTotal).toFixed(2)}
                      onChange={(e) => setTotalValue(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-right dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={submitting} className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit Invoice"}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
