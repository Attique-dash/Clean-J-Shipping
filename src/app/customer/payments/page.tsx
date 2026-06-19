"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Loader2, DollarSign,
  Search, ChevronLeft, ChevronRight, Eye, X, Calendar, Hash, FileText,
  RefreshCw, ArrowUpRight, ArrowDownLeft, Filter,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Payment {
  _id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
  gatewayId?: string;
  trackingNumber?: string;
  meta?: { invoiceNumber?: string; paypalOrderId?: string };
  customer?: string;
  userCode?: string;
}

const PAGE_SIZE = 12;

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A"; }
function fmtDateTime(d?: string) { return d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"; }

function getStatusInfo(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "paid" || s === "success" || s === "captured") return { label: "Completed", classes: "bg-green-100 text-green-800", icon: CheckCircle };
  if (s === "pending" || s === "processing") return { label: "Pending", classes: "bg-yellow-100 text-yellow-800", icon: Clock };
  if (s === "failed" || s === "cancelled") return { label: "Failed", classes: "bg-red-100 text-red-800", icon: AlertCircle };
  return { label: status || "Unknown", classes: "bg-gray-100 text-gray-800", icon: Clock };
}

function getMethodIcon(method: string) {
  const m = (method || "").toLowerCase();
  if (m === "paypal") return { label: "PayPal", gradient: "from-blue-500 to-blue-600" };
  if (m === "visa" || m === "card") return { label: "Card", gradient: "from-purple-500 to-purple-600" };
  if (m === "cash") return { label: "Cash", gradient: "from-green-500 to-green-600" };
  return { label: method || "Other", gradient: "from-gray-500 to-gray-600" };
}

/* ═══ Payment Detail Modal ═══ */
function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const info = getStatusInfo(payment.status);
  const methodInfo = getMethodIcon(payment.method);
  const ref = payment.reference || payment.gatewayId || payment._id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Amount */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-gray-900">${Number(payment.amount || 0).toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">{payment.currency || "USD"}</p>
          </div>

          {/* Status */}
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${info.classes}`}>
              <info.icon className="h-4 w-4" />{info.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Reference</span>
              <span className="text-sm font-mono font-semibold text-gray-900 break-all">{ref}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm font-medium text-gray-900">{fmtDateTime(payment.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Method</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{payment.method || "N/A"}</span>
            </div>
            {payment.trackingNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Tracking Number</span>
                <span className="text-sm font-mono font-medium text-gray-900">{payment.trackingNumber}</span>
              </div>
            )}
            {payment.meta?.invoiceNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Invoice Number</span>
                <span className="text-sm font-mono font-medium text-gray-900">{payment.meta.invoiceNumber}</span>
              </div>
            )}
            {payment.meta?.paypalOrderId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">PayPal Order</span>
                <span className="text-sm font-mono font-medium text-gray-900 break-all">{payment.meta.paypalOrderId}</span>
              </div>
            )}
            {payment.gatewayId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Gateway ID</span>
                <span className="text-sm font-mono font-medium text-gray-900 break-all">{payment.gatewayId}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"><X className="h-4 w-4" />Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function PaymentsPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  async function loadPayments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/payments", { method: "GET", credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load payments");
      setPayments(data?.payments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (session?.user) loadPayments(); else if (session === null) setLoading(false); }, [session]);
  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const filtered = payments.filter(p => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || (p.reference || "").toLowerCase().includes(q) || (p.trackingNumber || "").toLowerCase().includes(q) || (p.gatewayId || "").toLowerCase().includes(q);
    const matchS = !statusFilter || (p.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchQ && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const totalPaid = filtered.filter(p => ["completed", "paid", "success", "captured"].includes((p.status || "").toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPayments = filtered.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center"><Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin mx-auto mb-2" /><p className="text-gray-600 text-sm">Loading payments…</p></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center max-w-md">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">Please log in to view your payments</p>
          <a href="/login" className="inline-flex items-center px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:shadow-lg font-medium">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Payment History</h1>
            <p className="text-gray-500 mt-1">{totalPayments} payment{totalPayments !== 1 ? "s" : ""} · Total paid: {formatCurrency(totalPaid, "USD")}</p>
          </div>
          <button onClick={loadPayments} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm text-sm font-medium"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>}

        {/* Search + Filter */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm" placeholder="Search reference or tracking number…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <select className="px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:outline-none text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="captured">Captured</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Payment Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No payments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map(payment => {
              const info = getStatusInfo(payment.status);
              const methodInfo = getMethodIcon(payment.method);
              const ref = payment.reference || payment.gatewayId || payment._id;
              const StatusIcon = info.icon;
              return (
                <div key={payment._id} className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className="p-5 space-y-4">
                    {/* Top row: method badge + status */}
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${methodInfo.gradient} text-white text-xs font-semibold`}>
                        <CreditCard className="h-3.5 w-3.5" />{methodInfo.label}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${info.classes}`}>
                        <StatusIcon className="h-3 w-3" />{info.label}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="text-center py-2">
                      <p className="text-2xl font-bold text-gray-900">${Number(payment.amount || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{payment.currency || "USD"}</p>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Ref:</span>
                        <span className="font-mono text-xs text-gray-800 truncate max-w-[160px]" title={ref}>{ref}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Date:</span>
                        <span className="text-gray-800 font-medium">{fmtDate(payment.createdAt)}</span>
                      </div>
                      {payment.trackingNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Tracking:</span>
                          <span className="font-mono text-xs text-gray-800 truncate max-w-[140px]" title={payment.trackingNumber}>{payment.trackingNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* View detail button */}
                    <div className="border-t border-gray-100 pt-3">
                      <button onClick={() => setDetailPayment(payment)} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold transition-colors">
                        <Eye className="h-4 w-4" />View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - curPage) <= 1).reduce<(number | "…")[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, []).map((p, idx) => p === "…" ? <span key={`e${idx}`} className="px-1 text-gray-400 text-sm">…</span> : <button key={p} onClick={() => setPage(p as number)} className={`h-9 w-9 rounded-lg text-sm font-medium border ${curPage === p ? "bg-[#0f4d8a] text-white border-[#0f4d8a]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>)}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {detailPayment && <PaymentDetailModal payment={detailPayment} onClose={() => setDetailPayment(null)} />}
    </div>
  );
}
