"use client";

import { useEffect, useState } from "react";

type Pkg = {
  _id?: string;
  trackingNumber: string;
  status?: string;
  description?: string;
  updatedAt?: string;
};

type UploadDoc = {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string | Date;
};

export default function InvoiceUploadPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadDoc[]>([]);

  // New metadata fields
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [totalValue, setTotalValue] = useState<string>("");
  type Item = { name: string; qty: number; value: number; description?: string };
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, value: 0, description: "" }]);

  useEffect(() => {
    // load user's packages
    fetch("/api/customer/packages", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          const items = (data.items || []) as Pkg[];
          setPackages(items);
          if (items.length > 0) setSelectedId((items as any)[0]._id || "");
        } else {
          setError(data?.error || "Failed to load packages");
        }
      })
      .catch(() => setError("Failed to load packages"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setUploaded([]);

    if (!selectedId) {
      setError("Please select a package");
      return;
    }
    if (!files || files.length === 0) {
      setError("Please choose at least one file");
      return;
    }

    const form = new FormData();
    // Support multiple files under the expected field name "files"
    Array.from(files).forEach((f) => form.append("files", f));
    // Append metadata (backend may ignore if unsupported)
    form.append("invoiceDate", invoiceDate);
    form.append("invoiceNumber", invoiceNo);
    form.append("totalValue", totalValue);
    form.append("items", JSON.stringify(items));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/packages/${selectedId}/invoice`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Upload failed");
      } else {
        setMessage("Invoice uploaded successfully");
        setUploaded((data?.invoiceDocuments || []) as UploadDoc[]);
      }
    } catch (err) {
      setError("Network error while uploading");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Card header like the design */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-[#153e75] px-6 py-3 text-white">
          <h1 className="text-lg font-semibold">Submit Invoice</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 bg-white px-6 py-6">
          {/* Top grid: package + invoice meta */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Package</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                {packages.map((p) => (
                  <option key={(p as any)._id} value={(p as any)._id}>
                    {(p.trackingNumber || "")} — {p.description || p.status || "Package"}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Invoice Date</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Invoice No</span>
              <input
                placeholder="INV-0001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Total Value</span>
              <input
                type="number"
                step="0.01"
                placeholder="$0.00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2"
              />
            </label>
          </div>

          {/* Upload control row */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Upload Invoice Document</span>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFiles(e.target.files)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2"
              />
              <span className="text-xs text-gray-500">PDF, JPG, PNG, WEBP</span>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Items</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white">
                  <tr className="border-b">
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Qty</th>
                    <th className="px-4 py-2">Value</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <input
                          value={it.name}
                          onChange={(e) => {
                            const cp = [...items];
                            cp[idx].name = e.target.value;
                            setItems(cp);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1"
                          placeholder="Item name"
                        />
                      </td>
                      <td className="px-4 py-2 w-24">
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => {
                            const cp = [...items];
                            cp[idx].qty = Number(e.target.value || 0);
                            setItems(cp);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 w-32">
                        <input
                          type="number"
                          step="0.01"
                          value={it.value}
                          onChange={(e) => {
                            const cp = [...items];
                            cp[idx].value = Number(e.target.value || 0);
                            setItems(cp);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={it.description || ""}
                          onChange={(e) => {
                            const cp = [...items];
                            cp[idx].description = e.target.value;
                            setItems(cp);
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1"
                          placeholder="Details"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setItems((arr) => [...arr, { name: "", qty: 1, value: 0, description: "" }])}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Add Item
              </button>
              <div className="text-sm text-gray-700">
                Total: <span className="font-semibold">
                  {
                    items.reduce((sum, it) => sum + (isFinite(it.qty * it.value) ? it.qty * it.value : 0), 0).toLocaleString(undefined, { style: "currency", currency: "USD" })
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#153e75] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2e58] disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Invoice"}
            </button>
          </div>
          {(message || error) && (
            <div className="text-sm">
              {message && <span className="text-green-600">{message}</span>}
              {error && <span className="text-red-600">{error}</span>}
            </div>
          )}
        </form>
      </div>

      {uploaded.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-medium">Uploaded Documents</h2>
          <ul className="space-y-2 text-sm">
            {uploaded.map((d) => (
              <li key={d.filename} className="flex items-center justify-between gap-3">
                <div className="truncate">
                  <div className="truncate font-mono text-xs">{d.filename}</div>
                  <div className="text-xs text-neutral-500">{d.mimeType} • {(d.size / 1024).toFixed(1)} KB</div>
                </div>
                <a className="text-blue-600 hover:underline" href={d.url} target="_blank">View</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
