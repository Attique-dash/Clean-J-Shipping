"use client";

import { useState, useEffect } from "react";
import SharedModal from "@/components/admin/SharedModal";
import AddButton from "@/components/admin/AddButton";
import { generateTrackingNumber } from "@/lib/tracking";
import { 
  Package, 
  User, 
  Weight, 
  MapPin, 
  FileText, 
  CheckCircle2,
  Hash,
  RefreshCw,
  AlertCircle,
  ChevronDown
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  userCode: string;
  email?: string;
};

export default function AddForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedUserCode, setSelectedUserCode] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Load customers when modal opens
  useEffect(() => {
    if (open) {
      loadCustomers();
      // Generate tracking number instantly when modal opens
        generateNewTrackingNumber();
    }
  }, [open]);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/admin/customers", { 
        cache: "no-store",
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load customers:", data?.error);
        setCustomers([]);
        return;
      }
      const list = Array.isArray(data?.customers)
        ? data.customers
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      const mapped = list.map((c: { customer_id?: string; _id?: string; id?: string; userCode?: string; user_code?: string; full_name?: string; firstName?: string; lastName?: string; email?: string }) => {
        const userCode = c.userCode || c.user_code || "";
        const name = (c.full_name ?? `${c.firstName || ''} ${c.lastName || ''}`.trim()) || c.email || "Unknown Customer";
        return {
          id: String((c.customer_id ?? c._id ?? c.id ?? userCode) || Math.random()),
          name: name,
          userCode: userCode,
        email: c.email,
        };
      }).filter((c: { id: string; name: string; userCode: string; email?: string }) => c.userCode); // Only include customers with userCode
      setCustomers(mapped);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function checkTrackingNumber(tn: string): Promise<boolean> {
    if (!tn.trim()) return false;
    setCheckingTracking(true);
    try {
      const res = await fetch(`/api/admin/packages?q=${encodeURIComponent(tn)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      // If package exists, tracking number is not unique
      return !(data.packages && data.packages.length > 0);
    } catch {
      return true; // Assume unique on error
    } finally {
      setCheckingTracking(false);
    }
  }

  function generateNewTrackingNumber() {
    // Generate instantly without API calls - check uniqueness only on submit
    const newTn = generateTrackingNumber("TAS", true); // Use short format: TAS-XXXXXX
      setTrackingNumber(newTn);
      setTrackingError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    
    const tn = trackingNumber.trim() || String(data.get("tracking_number") || "").trim();
    const userCode = selectedUserCode.trim() || String(data.get("user_code") || "").trim();

    if (!tn || !userCode) {
      setTrackingError(!tn ? "Tracking number is required" : "Customer code is required");
      return;
    }

    // Check if tracking number is unique
    const isUnique = await checkTrackingNumber(tn);
    if (!isUnique) {
      setTrackingError("This tracking number already exists. Please generate a new one.");
      return;
    }

    const payload: Record<string, unknown> = {
      tracking_number: tn,
      user_code: userCode,
    };
    const weight = String(data.get("weight") || "").trim();
    const description = String(data.get("description") || "").trim();
    const branch = String(data.get("branch") || "").trim();
    if (weight) payload["weight"] = Number(weight);
    if (description) payload["description"] = description;
    if (branch) payload["branch"] = branch;

    setSubmitting(true);
    setTrackingError(null);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      // Handle auth errors gracefully
      if (res.status === 401) {
        setTrackingError("Session expired. Please refresh the page to re-establish your session.");
        return;
      }
      
      if (res.status === 403) {
        setTrackingError("You don't have permission to perform this action.");
        return;
      }
      
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = j.error || res.statusText;
        if (errorMsg.toLowerCase().includes("tracking") || errorMsg.toLowerCase().includes("duplicate")) {
          setTrackingError(errorMsg);
        } else {
          setTrackingError(`Create failed: ${errorMsg}`);
        }
        return;
      }
      // Success - close modal and refresh page without full reload
      setOpen(false);
      form.reset();
      setTrackingNumber("");
      setSelectedUserCode("");
      setTrackingError(null);
      // Use soft refresh to maintain session
      window.location.href = window.location.pathname + window.location.search;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AddButton className="bg-white/15 text-white hover:bg-white/25" onClick={() => setOpen(true)} label="Add Package" />

      <SharedModal 
        open={open} 
        title="Add New Package" 
        onClose={() => {
          setOpen(false);
          setTrackingNumber("");
          setTrackingError(null);
          setSelectedUserCode("");
        }}
        footer={(
          <>
            <button 
              type="button" 
              onClick={() => {
                setOpen(false);
                setTrackingNumber("");
                setTrackingError(null);
                setSelectedUserCode("");
              }} 
              className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              form="add-pkg-form" 
              type="submit" 
              disabled={submitting || checkingTracking} 
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Package
                </>
              )}
            </button>
          </>
        )}
      >
        <form id="add-pkg-form" onSubmit={onSubmit} className="space-y-4">
          {/* Tracking Number */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Hash className="h-4 w-4 text-gray-500" />
              Tracking Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input 
                name="tracking_number" 
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setTrackingError(null);
                }}
                required 
                placeholder="Auto-generated tracking number"
                className={`flex-1 rounded-xl border-2 px-4 py-3 font-medium text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 ${
                  trackingError 
                    ? "border-red-300 focus:border-red-500" 
                    : "border-gray-200 focus:border-[#0f4d8a]"
                }`}
              />
              <button
                type="button"
                onClick={generateNewTrackingNumber}
                className="flex items-center gap-2 rounded-xl border-2 border-[#0f4d8a] bg-[#0f4d8a] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#0e447d]"
              >
                <RefreshCw className="h-4 w-4" />
                Generate
              </button>
            </div>
            {trackingError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p className="text-xs text-red-700">{trackingError}</p>
              </div>
            )}
            <p className="text-xs text-gray-500">
              A unique tracking number is automatically generated. Click &quot;Generate&quot; to create a new one.
            </p>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="h-4 w-4 text-gray-500" />
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="user_code"
                value={selectedUserCode}
                onChange={(e) => setSelectedUserCode(e.target.value)}
                required
                disabled={loadingCustomers}
                className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 disabled:opacity-50"
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.userCode}>
                    {c.name} {c.userCode ? `(${c.userCode})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">
              {loadingCustomers ? "Loading customers..." : "Select a customer from the list"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Weight */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Weight className="h-4 w-4 text-gray-500" />
                Weight (kg)
              </label>
              <input 
                name="weight" 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                Branch Location
              </label>
              <input 
                name="branch" 
                placeholder="e.g., Main Warehouse"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4 text-gray-500" />
              Package Description
            </label>
            <textarea 
              name="description" 
              rows={3}
              placeholder="Describe the package contents..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 resize-none" 
            />
          </div>

          {/* Info Box */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Quick Tip</p>
                <p className="mt-1 text-xs text-blue-700">
                  Make sure the tracking number is unique. You can add dimensions and other details after creating the package.
                </p>
              </div>
            </div>
          </div>
        </form>
      </SharedModal>
    </>
  );
}