"use client";

import { useState, useEffect, useMemo, useCallback, type ComponentType } from "react";
import Image from "next/image";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Package,
  PieChart,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from "react-hot-toast";

type Item = { sku?: string; product_id?: string; name?: string; qty: string; unit_price: string };

type Txn = {
  id?: string;
  receipt_no: string;
  customer_code?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  created_at: string;
  notes?: string | null;
  items?: {
    sku?: string;
    productId?: string;
    name?: string;
    qty: number;
    unitPrice?: number;
    total: number;
  }[];
};

type PosStats = {
  total_revenue: number;
  today_revenue: number;
  avg_order_value: number;
  total_transactions: number;
};

type PaymentBreakdown = {
  method: string;
  count: number;
  total: number;
};

const SERVICES = [
  { key: "receive", name: "Package Receival", amount: 25.0, icon: Package, color: "from-blue-500 to-blue-600" },
  { key: "storage", name: "Storage Fee - $15/month", amount: 45.0, icon: Clock, color: "from-purple-500 to-purple-600" },
  { key: "shipping", name: "Shipping Fee", amount: 45.0, icon: ShoppingCart, color: "from-emerald-500 to-emerald-600" },
  { key: "handling", name: "Handling Fee", amount: 10.0, icon: FileText, color: "from-amber-500 to-amber-600" },
] as const;

const CLIENT_TAX_RATE = Number(process.env.NEXT_PUBLIC_POS_TAX_RATE ?? 0.1) || 0;
const AUTO_REFRESH_MS = Number(process.env.NEXT_PUBLIC_POS_REFRESH_MS || 10000) || 10000;

const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  cash: "Cash",
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  bank: "Bank Transfer",
  wallet: "Digital Wallet",
};

const METHOD_COLORS: Record<string, string> = {
  card: "bg-blue-100 text-blue-700",
  cash: "bg-emerald-100 text-emerald-700",
  visa: "bg-indigo-100 text-indigo-700",
  mastercard: "bg-amber-100 text-amber-700",
  amex: "bg-purple-100 text-purple-700",
  bank: "bg-slate-100 text-slate-700",
  wallet: "bg-pink-100 text-pink-700",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount || 0);

export default function AdminPosPage() {
  const [customers, setCustomers] = useState<{ id: string; name: string; email?: string; userCode?: string }[]>([]);
  const [customerCode, setCustomerCode] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"services" | "fees" | "payments">("services");
  const [method, setMethod] = useState("card");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastTxn, setLastTxn] = useState<Txn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<PosStats | null>(null);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

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

  const fetchPosData = useCallback(async () => {
    setSyncing(true);
    setDataError(null);
    try {
      const response = await fetch("/api/admin/pos/transactions?limit=8", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load POS data");
      }
      setStats(payload.stats || null);
      setPaymentBreakdown(payload.payment_breakdown || []);
      setTransactions(payload.transactions || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setDataError(err instanceof Error ? err.message : "Unable to refresh POS data");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosData();
    const interval = setInterval(fetchPosData, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchPosData]);

  const services = SERVICES;
  const selectedServices = useMemo(() => services.filter((svc) => selected[svc.key]), [services, selected]);
  const subtotal = useMemo(() => selectedServices.reduce((sum, svc) => sum + svc.amount, 0), [selectedServices]);
  const tax = useMemo(() => Math.round(subtotal * CLIENT_TAX_RATE * 100) / 100, [subtotal]);
  const total = useMemo(() => Math.round((subtotal + tax) * 100) / 100, [subtotal, tax]);
  const selectedCount = selectedServices.length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // If PayPal is selected, show PayPal button instead
    if (method === "paypal") {
      setShowPayPal(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const items: Item[] = selectedServices.map((s) => ({
        name: s.name,
        qty: "1",
        unit_price: String(s.amount),
      }));

      const payload = {
        customer_code: customerCode || undefined,
        method,
        items: items.map((i) => ({
          name: i.name || undefined,
          qty: Number(i.qty),
          unit_price: Number(i.unit_price),
        })),
        notes: notes || undefined,
      };

      const res = await fetch("/api/admin/pos/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to process transaction");
      }
      setLastTxn(data as Txn);
      setSelected({});
      setCustomerCode("");
      setNotes("");
      setShowPayPal(false);
      setTransactions((prev) => [data as Txn, ...prev].slice(0, 8));
      fetchPosData();
      toast.success("Payment processed successfully!");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayPalCreateOrder() {
    try {
      const items: Item[] = selectedServices.map((s) => ({
        name: s.name,
        qty: "1",
        unit_price: String(s.amount),
      }));

      const res = await fetch("/api/admin/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          currency: "USD",
          description: `POS Payment - ${items.map(i => i.name).join(", ")}`,
          customerCode: customerCode || undefined,
          receiptNo: `POS-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create PayPal order");
      }

      setPaypalOrderId(data.orderId);
      return data.orderId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PayPal order creation failed");
      throw error;
    }
  }

  async function handlePayPalApprove(data: { orderID: string }) {
    try {
      setSubmitting(true);
      
      // Capture the PayPal order
      const captureRes = await fetch("/api/admin/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        throw new Error(captureData?.error || "Failed to capture PayPal payment");
      }

      // Create POS transaction record
      const items: Item[] = selectedServices.map((s) => ({
        name: s.name,
        qty: "1",
        unit_price: String(s.amount),
      }));

      const payload = {
        customer_code: customerCode || undefined,
        method: "paypal",
        items: items.map((i) => ({
          name: i.name || undefined,
          qty: Number(i.qty),
          unit_price: Number(i.unit_price),
        })),
        notes: notes || `PayPal Order: ${data.orderID}`,
      };

      const res = await fetch("/api/admin/pos/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txnData = await res.json();
      if (!res.ok) {
        throw new Error(txnData?.error || "Failed to create transaction record");
      }

      setLastTxn(txnData as Txn);
      setSelected({});
      setCustomerCode("");
      setNotes("");
      setShowPayPal(false);
      setPaypalOrderId(null);
      setTransactions((prev) => [txnData as Txn, ...prev].slice(0, 8));
      fetchPosData();
      toast.success("PayPal payment processed successfully!");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Payment failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  function buildReceiptHtml(txn: Txn) {
    const createdAt = txn.created_at ? new Date(txn.created_at) : new Date();
    const items = txn.items ?? [];
    const currency = "USD";

    const rowsHtml =
      items.length > 0
        ? items
            .map(
              (it) => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${it.name || "Item"}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.qty}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(
                it.unitPrice ?? 0
              )}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(
                it.total
              )}</td>
            </tr>`
            )
            .join("")
        : `
        <tr>
          <td colspan="4" style="padding:12px;text-align:center;color:#6b7280;font-size:12px;">
            Line item details are not available for this receipt.
          </td>
        </tr>`;

    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Receipt ${txn.receipt_no}</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f9fafb; padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e7eb;padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#6b7280;">Clean J Shipping</div>
              <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">POS Receipt</div>
            </div>
            <div style="text-align:right;font-size:12px;color:#6b7280;">
              <div><strong>Receipt #</strong> ${txn.receipt_no}</div>
              <div><strong>Date</strong> ${createdAt.toLocaleString()}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:12px;color:#4b5563;margin-bottom:16px;">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">Customer</div>
              <div>${txn.customer_code || "Walk-in Customer"}</div>
            </div>
            <div>
              <div style="font-weight:600;margin-bottom:4px;">Payment Method</div>
              <div>${METHOD_LABELS[txn.method] || txn.method}</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;text-align:left;font-weight:600;color:#374151;">Description</th>
                <th style="padding:8px;text-align:center;font-weight:600;color:#374151;">Qty</th>
                <th style="padding:8px;text-align:right;font-weight:600;color:#374151;">Unit</th>
                <th style="padding:8px;text-align:right;font-weight:600;color:#374151;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:12px;font-size:13px;">
            <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
              <div style="width:160px;display:flex;justify-content:space-between;">
                <span style="color:#6b7280;">Subtotal</span>
                <span style="font-weight:600;">${formatCurrency(txn.subtotal)}</span>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
              <div style="width:160px;display:flex;justify-content:space-between;">
                <span style="color:#6b7280;">Tax</span>
                <span style="font-weight:600;">${formatCurrency(txn.tax)}</span>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:4px;">
              <div style="width:160px;display:flex;justify-content:space-between;font-weight:700;font-size:15px;">
                <span>Total</span>
                <span>${formatCurrency(txn.total)}</span>
              </div>
            </div>
          </div>

          ${
            txn.notes
              ? `<div style="margin-top:16px;font-size:12px;color:#4b5563;">
                   <div style="font-weight:600;margin-bottom:4px;">Notes</div>
                   <div>${txn.notes}</div>
                 </div>`
              : ""
          }

          <div style="margin-top:24px;font-size:11px;color:#9ca3af;text-align:center;">
            Thank you for your business!
          </div>
        </div>
      </body>
    </html>`;
  }

  function downloadReceiptForTxn(txn: Txn) {
    const html = buildReceiptHtml(txn);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${txn.receipt_no}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadReceipt() {
    if (!lastTxn) return;
    try {
      setIsDownloading(true);
      downloadReceiptForTxn(lastTxn);
    } finally {
      setIsDownloading(false);
    }
  }

  const statItems = useMemo(
    () => [
      {
        title: "Total Revenue",
        value: formatCurrency(stats?.total_revenue || 0),
        caption: `${(stats?.total_transactions || 0).toLocaleString()} lifetime sales`,
        gradient: "from-emerald-500 to-teal-600",
        icon: DollarSign,
      },
      {
        title: "Today’s Revenue",
        value: formatCurrency(stats?.today_revenue || 0),
        caption: `Auto-refresh ${(AUTO_REFRESH_MS / 1000).toFixed(0)}s`,
        gradient: "from-blue-500 to-cyan-600",
        icon: Activity,
      },
      {
        title: "Avg. Order Value",
        value: formatCurrency(stats?.avg_order_value || 0),
        caption: "Across POS transactions",
        gradient: "from-purple-500 to-pink-600",
        icon: CreditCard,
      },
      {
        title: "Transactions",
        value: (stats?.total_transactions || 0).toLocaleString(),
        caption: "Real-time count",
        gradient: "from-amber-500 to-red-500",
        icon: Receipt,
      },
    ],
    [stats]
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(37, 99, 235, 0.15) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Point of Sale</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">POS Control Center</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={fetchPosData}
                  className="flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/30 transition hover:bg-white/25 disabled:opacity-60"
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Refresh Data"}
                </button>
                <div className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm">
                  <div className="text-blue-100">Last synced</div>
                  <div className="text-base font-semibold">{lastUpdated ? lastUpdated.toLocaleTimeString() : "Just now"}</div>
                </div>
              </div>
            </div>

            {/* Stats Cards inside header */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Items Selected */}
              <div className="group relative overflow-hidden rounded-xl bg-white/10 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Items Selected</p>
                    <p className="mt-1 text-2xl font-bold">{selectedCount}</p>
                  </div>
                </div>
              </div>

              {/* Current Total */}
              <div className="group relative overflow-hidden rounded-xl bg-emerald-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-100">Current Total</p>
                    <p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>

              {/* Auto-refresh */}
              <div className="group relative overflow-hidden rounded-xl bg-blue-500/20 p-5 shadow-md backdrop-blur">
                <div className="relative flex items-center gap-4">
                  <div className="rounded-lg bg-white/20 p-3">
                    <RefreshCw className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Auto-refresh</p>
                    <p className="mt-1 text-2xl font-bold">{(AUTO_REFRESH_MS / 1000).toFixed(0)}s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-gray-500">Customer</p>
                  <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Select Customer</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 transition focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
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
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Transaction Notes</label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 pr-10 text-sm font-medium text-gray-900 transition focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="Add notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <FileText className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
                <div className="flex gap-2">
                  {(["services", "fees", "payments"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
                        activeTab === tab ? "bg-[#0f4d8a] text-white shadow-lg" : "text-gray-600"
                      }`}
                    >
                      {tab === "services" && <Package className="h-4 w-4" />}
                      {tab === "fees" && <DollarSign className="h-4 w-4" />}
                      {tab === "payments" && <CreditCard className="h-4 w-4" />}
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-6">
                {activeTab === "services" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-widest text-gray-500">Services</p>
                        <h3 className="text-lg font-bold text-gray-900">Select Services</h3>
                      </div>
                      {selectedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelected({})}
                          className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {services.map((service) => {
                        const Icon = service.icon;
                        const isSelected = !!selected[service.key];
                        return (
                          <label
                            key={service.key}
                            className={`group relative flex cursor-pointer flex-col gap-4 rounded-2xl border-2 p-4 transition ${
                              isSelected
                                ? "border-[#0f4d8a] bg-blue-50 shadow-lg"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${service.color} text-white shadow-md transition group-hover:scale-105`}
                              >
                                <Icon className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                                <p className="text-2xl font-bold text-[#0f4d8a]">${service.amount.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase tracking-wide text-gray-500">Add to cart</span>
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(event) =>
                                    setSelected((prev) => ({ ...prev, [service.key]: event.target.checked }))
                                  }
                                  className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-gray-300 transition checked:border-[#0f4d8a] checked:bg-[#0f4d8a]"
                                />
                                <CheckCircle2 className="pointer-events-none absolute inset-0 m-auto h-5 w-5 text-white opacity-0 transition peer-checked:opacity-100" />
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {activeTab === "fees" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm uppercase tracking-widest text-gray-500">Fees</p>
                      <h3 className="text-lg font-bold text-gray-900">Additional Fees</h3>
                    </div>
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-sm font-medium text-gray-600">All fees are included in services</p>
                      <p className="mt-2 text-xs text-gray-500">Select services from the Services tab to add fees</p>
                    </div>
                  </div>
                )}

                {activeTab === "payments" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm uppercase tracking-widest text-gray-500">Payments</p>
                      <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
                    </div>
                    {paymentBreakdown.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                        <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-sm font-medium text-gray-600">No payment data available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentBreakdown.map((entry) => {
                          const percent = stats?.total_revenue ? Math.round((entry.total / stats.total_revenue) * 100) : 0;
                          return (
                            <div key={entry.method} className="rounded-xl border border-gray-200 bg-white p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${METHOD_COLORS[entry.method] || "bg-gray-100"}`}>
                                    <CreditCard className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{METHOD_LABELS[entry.method] || entry.method}</p>
                                    <p className="text-xs text-gray-500">{entry.count} transactions</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-gray-900">{formatCurrency(entry.total)}</p>
                                  <p className="text-xs text-gray-500">{percent}%</p>
                                </div>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#0f4d8a] to-[#0e7893]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Transaction Failed</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-widest text-gray-500">Live Feed</p>
                    <h3 className="text-lg font-bold text-gray-900">Recent POS Transactions</h3>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Auto {(AUTO_REFRESH_MS / 1000).toFixed(0)}s
                </span>
              </div>
              <div className="overflow-x-auto">
                {dataError ? (
                  <div className="p-6 text-sm text-red-600">{dataError}</div>
                ) : transactions.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">No transactions yet</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-3">Receipt</th>
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Method</th>
                        <th className="px-6 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map((txn) => (
                        <tr key={txn.id || txn.receipt_no} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-900">#{txn.receipt_no}</td>
                          <td className="px-6 py-4 text-gray-600">{txn.customer_code || "Walk-in"}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(txn.total)}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                METHOD_COLORS[txn.method] || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {METHOD_LABELS[txn.method] || txn.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {txn.created_at ? new Date(txn.created_at).toLocaleString() : "--"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => downloadReceiptForTxn(txn)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="h-3 w-3" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Cart</p>
                    <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                {selectedCount === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    Add a service to begin
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedServices.map((service) => {
                      const Icon = service.icon;
                      return (
                        <div key={service.key} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${service.color} text-white`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{service.name}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">${service.amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Tax ({(CLIENT_TAX_RATE * 100).toFixed(0)}%)</span>
                    <span className="font-semibold text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[#0f4d8a]">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <label className="text-sm font-semibold text-gray-700">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      setShowPayPal(false);
                    }}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  >
                    <option value="card">💳 Credit Card</option>
                    <option value="cash">💵 Cash</option>
                    <option value="visa">💳 Visa</option>
                    <option value="mastercard">💳 Mastercard</option>
                    <option value="amex">💳 American Express</option>
                    <option value="bank">🏦 Bank Transfer</option>
                    <option value="wallet">👛 Digital Wallet</option>
                    <option value="paypal">🅿️ PayPal</option>
                  </select>
                </div>

                {showPayPal && method === "paypal" && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Pay with PayPal</p>
                    <PayPalScriptProvider
                      options={{
                        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                        currency: "USD",
                        intent: "capture",
                      }}
                    >
                      <PayPalButtons
                        createOrder={handlePayPalCreateOrder}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.error("PayPal error:", err);
                          toast.error("PayPal payment failed. Please try again.");
                          setShowPayPal(false);
                        }}
                        onCancel={() => {
                          toast.error("PayPal payment cancelled");
                          setShowPayPal(false);
                        }}
                        style={{
                          layout: "vertical",
                          color: "blue",
                          shape: "rect",
                          label: "paypal",
                        }}
                      />
                    </PayPalScriptProvider>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPayPal(false);
                        setMethod("card");
                      }}
                      className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Cancel and use another payment method
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || subtotal === 0}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-xl transition hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
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
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Payments</p>
                    <h3 className="text-sm font-semibold text-gray-900">Payment Mix</h3>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                {paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">No payment data yet</p>
                ) : (
                  paymentBreakdown.map((entry) => {
                    const percent = stats?.total_revenue ? Math.round((entry.total / stats.total_revenue) * 100) : 0;
                    return (
                      <div key={entry.method}>
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                          <span>{METHOD_LABELS[entry.method] || entry.method}</span>
                          <span>{formatCurrency(entry.total)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{entry.count} payments</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#0f4d8a] to-[#0e7893]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#0f4d8a] to-[#0e447d] p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-100">Current Session</p>
                  <h3 className="text-xl font-bold">Transaction Snapshot</h3>
                </div>
                <div className="rounded-xl bg-white/20 px-3 py-1 text-xs font-semibold">
                  {METHOD_LABELS[method] || method}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <p className="text-blue-100">Services</p>
                  <p className="text-2xl font-bold">{selectedCount}</p>
                </div>
                <div>
                  <p className="text-blue-100">Amount</p>
                  <p className="text-2xl font-bold">${total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {lastTxn && (
          <div className="overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-green-200 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-lg flex items-center justify-center">
                  <Image
                    src="/images/Logo.png"
                    alt="Clean J Shipping"
                    width={48}
                    height={48}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-green-800 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Receipt
                  </p>
                  <h3 className="text-lg font-bold text-green-900">Transaction Successful #{lastTxn.receipt_no}</h3>
                  <p className="text-xs text-green-900/80">
                    {lastTxn.customer_code || "Walk-in Customer"} • {METHOD_LABELS[lastTxn.method] || lastTxn.method} •{" "}
                    {new Date(lastTxn.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={isDownloading}
                  className="flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Downloading..." : "Download Receipt"}
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptCard label="Receipt Number" value={lastTxn.receipt_no} icon={Receipt} />
              <ReceiptCard label="Payment Method" value={lastTxn.method.toUpperCase()} icon={CreditCard} />
              <ReceiptCard label="Total Amount" value={formatCurrency(lastTxn.total)} icon={DollarSign} helper={`Tax: ${formatCurrency(lastTxn.tax)}`} />
              <ReceiptCard label="Transaction Time" value={new Date(lastTxn.created_at).toLocaleString()} icon={Clock} />
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function StatCard({
  title,
  value,
  caption,
  gradient,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  gradient: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-xl ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-2xl">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl transition group-hover:opacity-20`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{caption}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-100">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
        <Icon className="h-4 w-4 text-gray-400" />
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-gray-900">{value}</div>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

