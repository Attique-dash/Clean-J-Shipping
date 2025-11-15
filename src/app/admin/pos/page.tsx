"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  User, 
  FileText, 
  CreditCard, 
  DollarSign, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  Download,
  Trash2,
  Plus,
  Receipt
} from "lucide-react";

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
    { key: "receive", name: "Package Receival", amount: 25.0, icon: Package, color: "from-blue-500 to-blue-600" },
    { key: "storage", name: "Storage Fee - $15/month", amount: 45.0, icon: Clock, color: "from-purple-500 to-purple-600" },
    { key: "shipping", name: "Shipping Fee", amount: 45.0, icon: ShoppingCart, color: "from-emerald-500 to-emerald-600" },
    { key: "handling", name: "Handling Fee", amount: 10.0, icon: FileText, color: "from-amber-500 to-amber-600" },
  ] as const;
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Active tab
  const [activeTab, setActiveTab] = useState<"services" | "fees" | "payments">("services");

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
        const list = Array.isArray(d?.customers)
          ? d.customers
          : Array.isArray(d?.items)
          ? d.items
          : Array.isArray(d)
          ? d
          : [];
        const mapped = list.map((c: any) => ({
          id: String(c.customer_id ?? c._id ?? c.id ?? c.userCode ?? Math.random()),
          name: c.full_name ?? c.name ?? c.email ?? c.userCode ?? "Customer",
          email: c.email,
          userCode: c.userCode,
        }));
        setCustomers(mapped);
      })
      .catch(() => {});
  }, []);

  const subtotal = services.reduce((sum, s) => sum + (selected[s.key] ? s.amount : 0), 0);
  const TAX_RATE = Number(process.env.NEXT_PUBLIC_POS_TAX_RATE ?? 0.1) || 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
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

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Point of Sale</h1>
                <p className="mt-1 text-sm text-blue-100">Process in-person transactions</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2">
              <div className="text-xs text-blue-100">Items Selected</div>
              <div className="text-2xl font-bold text-white">{selectedCount}</div>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2">
              <div className="text-xs text-blue-100">Total Amount</div>
              <div className="text-2xl font-bold text-white">${total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main POS */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Customer & Notes Section */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Customer Information</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Select Customer
                  </label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
                      value={customerCode} 
                      onChange={(e) => setCustomerCode(e.target.value)}
                    >
                      <option value="">Walk-in Customer (Optional)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.userCode || c.email || c.id}>
                          {c.name} {c.userCode ? `(${c.userCode})` : ""}
                        </option>
                      ))}
                    </select>
                    <User className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Transaction Notes
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
                      placeholder="Add notes (optional)" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                    />
                    <FileText className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs and Services Section */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-2 py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("services")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === "services"
                        ? "bg-[#0f4d8a] text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("fees")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === "fees"
                        ? "bg-[#0f4d8a] text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    Fees
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payments")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === "payments"
                        ? "bg-[#0f4d8a] text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Payments
                  </button>
                </div>
              </div>

              {/* Services Content */}
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Select Services</h3>
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </button>
                  )}
                </div>

                {/* Services Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map((s) => {
                    const Icon = s.icon;
                    const isSelected = !!selected[s.key];
                    return (
                      <label
                        key={s.key}
                        className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 p-4 transition-all ${
                          isSelected
                            ? "border-[#0f4d8a] bg-blue-50 shadow-lg"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-md transition-transform ${isSelected ? "scale-110" : "group-hover:scale-105"}`}>
                              <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{s.name}</div>
                              <div className="mt-1 text-2xl font-bold text-[#0f4d8a]">
                                ${s.amount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelected((prev) => ({ ...prev, [s.key]: e.target.checked }))
                              }
                              className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-gray-300 bg-white transition-all checked:border-[#0f4d8a] checked:bg-[#0f4d8a]"
                            />
                            <CheckCircle2 className="pointer-events-none absolute left-0 top-0 h-6 w-6 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f4d8a] to-[#0e7893]" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-lg">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900">Transaction Failed</div>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column - Cart & Summary */}
        <div className="space-y-6">
          {/* Cart Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Order Summary</h3>
                  <p className="text-xs text-gray-500">{selectedCount} items selected</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Selected Items */}
              {selectedCount === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No services selected</p>
                  <p className="mt-1 text-xs text-gray-400">Select services to continue</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services
                    .filter((s) => selected[s.key])
                    .map((s) => {
                      const Icon = s.icon;
                      return (
                        <div
                          key={s.key}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color}`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{s.name}</span>
                          </div>
                          <span className="font-bold text-gray-900">${s.amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-semibold text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-[#0f4d8a]">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border-t border-gray-200 pt-4">
                <label className="mb-3 block text-sm font-bold text-gray-900">Payment Method</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="card">💳 Credit Card</option>
                    <option value="cash">💵 Cash</option>
                    <option value="visa">💳 VISA</option>
                    <option value="mastercard">💳 Mastercard</option>
                    <option value="amex">💳 American Express</option>
                    <option value="bank">🏦 Bank Transfer</option>
                    <option value="wallet">👛 Digital Wallet</option>
                  </select>
                  <CreditCard className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Process Payment Button */}
              <button
                onClick={onSubmit}
                disabled={submitting || subtotal === 0}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-6 py-4 font-bold text-white shadow-xl transition-all hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Process Payment
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#0f4d8a] to-[#0e447d] p-6 text-white shadow-xl">
            <h3 className="mb-4 font-bold">Transaction Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Services</span>
                <span className="text-xl font-bold">{selectedCount}</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Amount</span>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-100">Method</span>
                <span className="text-sm font-semibold uppercase">{method}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Transaction Receipt */}
      {lastTxn && (
        <div className="overflow-hidden rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl">
          <div className="border-b border-green-200 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Transaction Successful!</h3>
                  <p className="text-sm text-green-700">Receipt #{lastTxn.receipt_no}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition-all hover:bg-green-50">
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                  <Receipt className="h-4 w-4" />
                  Receipt Number
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900">{lastTxn.receipt_no}</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900">{lastTxn.method.toUpperCase()}</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </div>
                <div className="mt-2 text-xl font-bold text-green-600">${lastTxn.total.toFixed(2)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Tax: ${lastTxn.tax.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                  <Clock className="h-4 w-4" />
                  Transaction Time
                </div>
                <div className="mt-2 text-sm font-bold text-gray-900">
                  {new Date(lastTxn.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}