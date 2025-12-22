"use client";

import { useState } from "react";
import SharedModal from "@/components/admin/SharedModal";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import { 
  Edit, 
  Trash2, 
  FileText, 
  Package, 
  Weight, 
  MapPin, 
  Ruler, 
  CheckCircle2, 
  XCircle,
  Eye,
  Calendar,
  DollarSign,
  AlertTriangle
} from "lucide-react";

type UpdatePayload = {
  id: string;
  status?: string;
  weight?: number;
  description?: string;
  branch?: string;
  length?: number;
  width?: number;
  height?: number;
};

type Props = {
  id: string;
  trackingNumber: string;
  status?: string;
  weight?: number;
  description?: string;
  branch?: string;
  length?: number;
  width?: number;
  height?: number;
  hasInvoice?: boolean;
};

export default function Actions(props: Props) {
  const { id, trackingNumber } = props;
  const [loading, setLoading] = useState<null | "edit" | "delete" | "invoice_update">(null);
  const [open, setOpen] = useState(false);
  const [openInvoices, setOpenInvoices] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [status, setStatus] = useState<string>(props.status || "");
  const [weight, setWeight] = useState<string>(props.weight != null ? String(props.weight) : "");
  const [description, setDescription] = useState<string>(props.description || "");
  const [branch, setBranch] = useState<string>(props.branch || "");
  const [length, setLength] = useState<string>(props.length != null ? String(props.length) : "");
  const [width, setWidth] = useState<string>(props.width != null ? String(props.width) : "");
  const [height, setHeight] = useState<string>(props.height != null ? String(props.height) : "");

  // Invoice review state
  type InvoiceRec = {
    invoiceNumber: string;
    invoiceDate: string | Date;
    totalValue: number;
    currency: string;
    documentUrl: string;
    items?: Array<{ description: string; quantity: number; unitValue: number; totalValue: number }>;
    status: "submitted" | "reviewed" | "rejected";
    submittedAt?: string | Date;
  };
  const [records, setRecords] = useState<InvoiceRec[] | null>(null);
  const [invError, setInvError] = useState<string | null>(null);

  async function loadInvoices() {
    setInvError(null);
    setRecords(null);
    try {
      const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}/invoices`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load invoices");
      setRecords(Array.isArray(data?.invoice_records) ? data.invoice_records : []);
    } catch (e) {
      setInvError(e instanceof Error ? e.message : "Failed to load invoices");
    }
  }

  async function setInvoiceStatus(index: number, status: "reviewed" | "rejected") {
    setLoading("invoice_update");
    try {
      const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}/invoices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update invoice");
      setRecords((prev) => {
        if (!prev) return prev;
        const cp = [...prev];
        if (cp[index]) cp[index] = { ...cp[index], status } as InvoiceRec;
        return cp;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(null);
    }
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: UpdatePayload = { id };
    if (status.trim()) payload.status = status.trim();
    if (weight.trim()) payload.weight = Number(weight);
    if (description.trim()) payload.description = description.trim();
    if (branch.trim()) payload.branch = branch.trim();
    if (length.trim()) payload.length = Number(length);
    if (width.trim()) payload.width = Number(width);
    if (height.trim()) payload.height = Number(height);

    if (Object.keys(payload).length <= 1) {
      setOpen(false);
      return;
    }

    setLoading("edit");
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // Handle auth errors gracefully
      if (res.status === 401) {
        alert("Session expired. Please refresh the page to re-establish your session.");
        setOpen(false);
        return;
      }
      
      if (res.status === 403) {
        alert("You don't have permission to perform this action.");
        setOpen(false);
        return;
      }
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Update failed: ${j.error || res.statusText}`);
        return;
      }
      setOpen(false);
      // Use router for soft refresh instead of full page reload
      window.location.href = window.location.pathname + window.location.search;
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function onDelete() {
    setLoading("delete");
    try {
      const res = await fetch(`/api/admin/packages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      
      // Handle auth errors gracefully
      if (res.status === 401) {
        alert("Session expired. Please refresh the page to re-establish your session.");
        setDeleteConfirm(false);
        return;
      }
      
      if (res.status === 403) {
        alert("You don't have permission to perform this action.");
        setDeleteConfirm(false);
        return;
      }
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Delete failed: ${j.error || res.statusText}`);
        setDeleteConfirm(false);
        return;
      }
      setDeleteConfirm(false);
      // Use router for soft refresh instead of full page reload
      window.location.href = window.location.pathname + window.location.search;
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button 
          onClick={() => setOpen(true)} 
          disabled={loading !== null} 
          className="group flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-[#0f4d8a] hover:bg-blue-50 hover:text-[#0f4d8a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Edit className="h-4 w-4" />
          Edit Package
        </button>
        
        {props.hasInvoice && (
          <button
            onClick={() => { setOpenInvoices(true); void loadInvoices(); }}
            disabled={loading !== null}
            className="group flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            Review Invoices
          </button>
        )}
        
        <button 
          onClick={() => setDeleteConfirm(true)} 
          disabled={loading !== null} 
          className="group flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={onDelete}
        title="Delete Package"
        message="Are you sure you want to permanently delete this package? This action cannot be undone and will permanently remove all associated data."
        itemName={`Tracking Number: ${trackingNumber}`}
        loading={loading === "delete"}
      />

      {/* Edit Modal */}
      <SharedModal 
        open={open} 
        title={`Edit Package: ${trackingNumber}`} 
        onClose={() => setOpen(false)}
        footer={(
          <>
            <button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              form={`edit-${id}`} 
              type="submit" 
              disabled={loading === "edit"} 
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "edit" ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </>
        )}
      >
        <form id={`edit-${id}`} onSubmit={submitEdit} className="space-y-4">
          {/* Status Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Package className="h-4 w-4 text-gray-500" />
              Package Status
            </label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
            >
              <option value="">Select Status</option>
              <option value="At Warehouse">At Warehouse</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Weight */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Weight className="h-4 w-4 text-gray-500" />
                Weight (kg)
              </label>
              <input 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                Branch Location
              </label>
              <input 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)} 
                placeholder="e.g., Main Warehouse"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4 text-gray-500" />
              Description
            </label>
            <input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Package contents description"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Ruler className="h-4 w-4 text-gray-500" />
              Dimensions (cm)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input 
                value={length} 
                onChange={(e) => setLength(e.target.value)} 
                type="number" 
                step="1" 
                placeholder="Length"
                className="rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
              <input 
                value={width} 
                onChange={(e) => setWidth(e.target.value)} 
                type="number" 
                step="1" 
                placeholder="Width"
                className="rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
              <input 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                type="number" 
                step="1" 
                placeholder="Height"
                className="rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
            </div>
          </div>
        </form>
      </SharedModal>

      {/* Invoices Modal */}
      <SharedModal 
        open={openInvoices} 
        title={`Invoice Records — ${trackingNumber}`} 
        onClose={() => setOpenInvoices(false)}
        footer={
          <button 
            type="button" 
            onClick={() => setOpenInvoices(false)} 
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800"
          >
            Close
          </button>
        }
      >
        {invError && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <div className="font-semibold text-red-900">Error Loading Invoices</div>
              <div className="mt-1 text-sm text-red-700">{invError}</div>
            </div>
          </div>
        )}
        
        {!records && !invError && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#0f4d8a]" />
              <p className="mt-3 text-sm font-medium text-gray-600">Loading invoices...</p>
            </div>
          </div>
        )}
        
        {records && records.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">No invoice records found</p>
          </div>
        )}
        
        {records && records.length > 0 && (
          <div className="space-y-4">
            {records.map((r, idx) => (
              <div key={idx} className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm">
                {/* Invoice Header */}
                <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-gray-900">{r.invoiceNumber}</h4>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(r.invoiceDate as any).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {r.currency} {Number(r.totalValue).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <a 
                      href={r.documentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4" />
                      View Document
                    </a>
                  </div>
                </div>

                {/* Invoice Actions */}
                <div className="p-4">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setInvoiceStatus(idx, "reviewed")} 
                      disabled={loading === "invoice_update" || r.status === "reviewed"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Reviewed
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setInvoiceStatus(idx, "rejected")} 
                      disabled={loading === "invoice_update" || r.status === "rejected"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SharedModal>
    </>
  );
}

function StatusBadge({ status }: { status: "submitted" | "reviewed" | "rejected" }) {
  const config = {
    submitted: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending Review' },
    reviewed: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Reviewed' },
    rejected: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' }
  };

  const badge = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge.color}`}>
      {status === 'reviewed' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'rejected' && <XCircle className="h-3 w-3" />}
      {badge.label}
    </span>
  );
}