"use client";

import { useState } from "react";
import Modal from "./Modal";
import { 
  Plus, 
  Package, 
  User, 
  Weight, 
  MapPin, 
  FileText, 
  Ruler,
  CheckCircle2,
  Hash
} from "lucide-react";

export default function AddForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const payload: Record<string, unknown> = {
      tracking_number: String(data.get("tracking_number") || "").trim(),
      user_code: String(data.get("user_code") || "").trim(),
    };
    const weight = String(data.get("weight") || "").trim();
    const description = String(data.get("description") || "").trim();
    const branch = String(data.get("branch") || "").trim();
    if (weight) payload["weight"] = Number(weight);
    if (description) payload["description"] = description;
    if (branch) payload["branch"] = branch;

    if (!payload["tracking_number"] || !payload["user_code"]) {
      alert("Tracking number and user code are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Create failed: ${j.error || res.statusText}`);
        return;
      }
      alert("Package created successfully!");
      setOpen(false);
      form.reset();
      location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#0f4d8a] shadow-lg transition-all hover:shadow-xl hover:scale-105"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f4d8a] transition-transform group-hover:rotate-90">
          <Plus className="h-5 w-5 text-white" strokeWidth={3} />
        </div>
        Add Package
      </button>

      <Modal 
        open={open} 
        title="Add New Package" 
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
              form="add-pkg-form" 
              type="submit" 
              disabled={submitting} 
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
            <input 
              name="tracking_number" 
              required 
              placeholder="e.g., TRK123456789"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
            />
            <p className="text-xs text-gray-500">Enter a unique tracking number for this package</p>
          </div>

          {/* User Code */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="h-4 w-4 text-gray-500" />
              Customer Code <span className="text-red-500">*</span>
            </label>
            <input 
              name="user_code" 
              required 
              placeholder="e.g., CUS123"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
            />
            <p className="text-xs text-gray-500">The customer's unique identification code</p>
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
                name="branch" 
                placeholder="e.g., Main Warehouse"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
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
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 resize-none" 
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
      </Modal>
    </>
  );
}