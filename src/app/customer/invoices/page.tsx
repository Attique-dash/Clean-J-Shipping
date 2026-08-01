"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { CurrencyService } from '@/lib/currency-service';
import {
  FileText, DollarSign, CheckCircle, AlertCircle, RefreshCw,
  Package, Eye, Download, Search, ChevronLeft, ChevronRight, Clock,
  Tag, MapPin, User, Calendar, Receipt, Filter, X
} from "lucide-react";
import Loading from "@/components/Loading";

interface InvoiceData {
  _id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  trackingNumber?: string;
  description?: string;
  customer?: any;
  items?: any[];
  createdAt?: string;
}

const PAGE_SIZE = 9;

function statusLabel(s: string) {
  const m: Record<string, string> = { 
    sent: "Sent", 
    paid: "Paid", 
    unpaid: "Unpaid", 
    overdue: "Overdue", 
    draft: "Draft",
    cancelled: "Cancelled"
  };
  return m[s] || s;
}

function statusClasses(s: string) {
  switch(s) {
    case 'paid': return "bg-green-100 text-green-800";
    case 'sent': return "bg-blue-100 text-blue-800";
    case 'overdue': return "bg-red-100 text-red-800";
    case 'unpaid': return "bg-yellow-100 text-yellow-800";
    case 'draft': return "bg-gray-100 text-gray-800";
    case 'cancelled': return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function statusIcon(s: string) {
  switch(s) {
    case 'paid': return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
    case 'sent': return <FileText className="w-3.5 h-3.5 mr-1" />;
    case 'overdue': return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    case 'unpaid': return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    default: return <FileText className="w-3.5 h-3.5 mr-1" />;
  }
}

function fmtDate(d?: string) { 
  return d ? new Date(d).toLocaleDateString("en-GB", {day:"2-digit",month:"2-digit",year:"numeric"}) : "N/A"; 
}

function relDate(d: string) { 
  const diff = Date.now() - new Date(d).getTime(); 
  const days = Math.floor(diff / 86400000); 
  if (days === 0) return "today"; 
  if (days < 7) return `${days}d ago`; 
  const w = Math.floor(days / 7); 
  if (w < 5) return `${w}w ago`; 
  const m = Math.floor(days / 30); 
  return m < 2 ? "a month ago" : `${m}mo ago`; 
}

export default function CustomerInvoicesPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/invoices", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setInvoices(data.invoices || []);
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : "Failed"); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    if (session?.user) load(); 
    else if (session === null) setLoading(false); 
  }, [session]);

  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const filtered = invoices.filter(inv => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || 
      inv.invoiceNumber.toLowerCase().includes(q) || 
      (inv.trackingNumber || "").toLowerCase().includes(q) ||
      (inv.description || "").toLowerCase().includes(q);
    const matchS = !statusFilter || inv.status === statusFilter;
    return matchQ && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const unpaidCount = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length;
  const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);

  if (loading && session === undefined) return <Loading message="Loading invoices..." />;
  if (!session && !loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center max-w-md">
        <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-6">Please log in to view your invoices</p>
        <a href="/login" className="inline-flex items-center px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:shadow-lg font-medium">Sign In</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Receipt className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {filtered.length} Invoice{filtered.length !== 1 ? "s" : ""}
                </h1>
                <p className="text-gray-300-custom mt-1">
                  {unpaidCount} unpaid · {paidCount} paid · Total: {CurrencyService.format(totalAmount, "USD")}
                </p>
              </div>
            </div>
            <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-blue-100 hover:bg-gray-50 shadow-sm text-sm font-medium">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh
            </button>
          </div>
        </header>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          {[{v:"",l:`All (${invoices.length})`},{v:"unpaid",l:`Unpaid (${unpaidCount})`},{v:"paid",l:`Paid (${paidCount})`},{v:"sent",l:"Sent"},{v:"overdue",l:"Overdue"}].map(o => (
            <button key={o.v} onClick={()=>setStatusFilter(o.v)} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${statusFilter===o.v?"bg-[#0f4d8a] text-white shadow-md":"bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}>{o.l}</button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
            <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm" placeholder="Search invoice number, tracking number, or description…" value={query} onChange={e=>setQuery(e.target.value)}/>
          </div>
        </div>

        {/* Invoice Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
            <p className="text-gray-500 text-lg">No invoices found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map(inv => {
              const isPaid = inv.status === 'paid';
              const balance = inv.balanceDue || inv.total - (inv.amountPaid || 0);
              return (
                <div key={inv._id} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  {/* Header with invoice number */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl shrink-0">
                        <Receipt className="h-5 w-5 text-[#0f4d8a]" />
                      </div>
                      <span className="font-bold text-lg text-gray-900 truncate" title={inv.invoiceNumber}>
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    {isPaid && <CheckCircle className="h-6 w-6 text-green-600" />}
                  </div>

                  {/* Date and relative time */}
                  <div className="flex items-center justify-between px-6 pb-3 text-sm text-gray-500">
                    <span className="font-medium">{fmtDate(inv.issueDate)}</span>
                    {inv.issueDate && <span className="text-gray-400 text-xs">({relDate(inv.issueDate)})</span>}
                  </div>

                  {/* Status badge */}
                  <div className="px-6 pb-3">
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${statusClasses(inv.status)}`}>
                      {statusIcon(inv.status)}{statusLabel(inv.status)}
                    </span>
                  </div>

                  {/* Invoice details */}
                  <div className="px-6 pb-4 space-y-2 text-sm text-gray-700 flex-1">
                    {inv.trackingNumber && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400 shrink-0"/>
                        <span className="font-mono text-xs">{inv.trackingNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <FileText className="h-4 w-4 shrink-0"/>
                      <span className="truncate">{inv.description || 'Invoice'}</span>
                    </div>
                    {inv.dueDate && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                        <Clock className="h-3.5 w-3.5"/>
                        Due: {fmtDate(inv.dueDate)}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="mx-6 mb-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg text-sm flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Total:</span>
                    <span className="font-bold text-gray-900 text-base">{CurrencyService.format(inv.total, (inv.currency || 'USD').toUpperCase())}</span>
                  </div>

                  {/* Balance */}
                  {balance > 0 && (
                    <div className="mx-6 mb-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg text-sm flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Balance Due:</span>
                      <span className="font-bold text-red-600 text-base">{CurrencyService.format(balance, (inv.currency || 'USD').toUpperCase())}</span>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3 bg-gray-50 mt-auto">
                    <button 
                      onClick={() => { setSelectedInvoice(inv); setDetailOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl font-semibold hover:shadow-lg text-sm transition-all"
                    >
                      <Eye className="h-4 w-4"/>View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-curPage)<=1).reduce<(number|"…")[]>((acc,p,idx,arr)=>{if(idx>0&&p-(arr[idx-1] as number)>1) acc.push("…"); acc.push(p); return acc;},[]).map((p,idx)=><span key={idx}>{p==="…" ? <span className="px-1 text-gray-400 text-sm">…</span> : <button key={p as number} onClick={()=>setPage(p as number)} className={`h-9 w-9 rounded-lg text-sm font-medium border ${curPage===p?"bg-[#0f4d8a] text-white border-[#0f4d8a]":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>}</span>)}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
          </div>
        )}
      </div>

      {detailOpen && selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={()=>{setDetailOpen(false); setSelectedInvoice(null);}}/>}
    </div>
  );
}

/* ═══ Invoice Detail Modal ═══ */
function InvoiceDetailModal({ invoice, onClose }: { invoice: InvoiceData; onClose: () => void }) {
  const isPaid = invoice.status === 'paid';
  const balance = invoice.balanceDue || invoice.total - (invoice.amountPaid || 0);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-500 font-medium">System Invoice</span>
                {isPaid ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-5 w-5 text-green-600"/>
                    <span className="bg-green-600 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full transform rotate-[-8deg]">PAID</span>
                  </div>
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500"/>
                )}
                <span className="text-sm text-gray-400">{fmtDate(invoice.issueDate)}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex justify-end gap-8 mt-3 text-sm">
            <div><span className="text-gray-500">Total:</span><span className="ml-2 font-semibold">{CurrencyService.format(invoice.total, (invoice.currency || 'USD').toUpperCase())}</span></div>
            <div><span className="text-gray-500">Paid:</span><span className="ml-2 font-semibold">{CurrencyService.format(invoice.amountPaid || 0, (invoice.currency || 'USD').toUpperCase())}</span></div>
            <div><span className="text-gray-500">Balance:</span><span className="ml-2 font-bold">{CurrencyService.format(balance, (invoice.currency || 'USD').toUpperCase())}</span></div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          {invoice.customer && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium">{invoice.customer.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{invoice.customer.email}</span></div>
                {invoice.customer.phone && <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="font-medium">{invoice.customer.phone}</span></div>}
                {invoice.customer.address && <div className="flex justify-between"><span className="text-gray-500">Address:</span><span className="font-medium">{invoice.customer.address}</span></div>}
              </div>
            </div>
          )}

          {/* Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-gray-600 font-semibold text-xs uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{item.description}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{CurrencyService.format(item.unitPrice, (invoice.currency || 'USD').toUpperCase())}</td>
                      <td className="px-4 py-3 text-right font-semibold">{CurrencyService.format(item.total, (invoice.currency || 'USD').toUpperCase())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tracking */}
          {invoice.trackingNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="h-4 w-4 text-gray-400"/>
              <span className="font-medium">Tracking Number:</span>
              <span className="font-mono">{invoice.trackingNumber}</span>
            </div>
          )}

          {/* Notes */}
          {invoice.description && (
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Description/Notes</label>
              <div className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600 min-h-[60px] bg-gray-50">
                {invoice.description}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 text-sm font-semibold">
              <X className="h-4 w-4"/>Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
