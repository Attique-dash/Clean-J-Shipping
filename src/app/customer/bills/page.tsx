"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import Link from "next/link";
import { CreditCard, FileText, CheckCircle, Lock, Unlock, ShoppingCart, Filter, X, Calendar, Package, User, MapPin, Printer, Mail, ChevronLeft, ChevronRight, Eye, Plane, Building, Hash, Scale, DollarSign, Copy } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Loading from "@/components/Loading";

interface PackageDetails { branch?: string; manifest?: string; merchant?: string; weight?: number; description?: string; hsCode?: string; userCode?: string; pieces?: number; dimensions?: { length: number; width: number; height: number }; entryDate?: string; serviceMode?: string; itemValue?: number; freight?: number; processingFee?: number; storageFee?: number; dutyPercent?: number; gctPercent?: number; warehouseLocation?: string; rateGroup?: string; commercialInvoice?: string; houseAwb?: string; trackingNum?: string; collection?: string; customerName?: string; customerEmail?: string; customerPhone?: string; }
interface Bill { _id: string; billNumber?: string; tracking_number: string; description?: string; invoice_number?: string; invoice_date?: string; currency?: string; amount_due: number; payment_status: "submitted"|"reviewed"|"rejected"|"none"|"paid"|"overdue"|"partially_paid"; due_payment?: number; paid_payment?: number; balance?: number; last_updated?: string; payment_id?: string; payment_method?: string; status?: string; totalAmount?: number; paidAt?: string; paidAmount?: number; createdAt?: string; adminNotes?: string; packageDetails?: PackageDetails; }

const PAGE_SIZE = 12;
const CART_KEY = "customer_bills_cart";
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A"; }
function relDate(d: string): string { const diff = Date.now() - new Date(d).getTime(); const days = Math.floor(diff / 86400000); if (days === 0) return "today"; if (days < 7) return `${days}d ago`; const w = Math.floor(days / 7); if (w < 5) return `${w}w ago`; const m = Math.floor(days / 30); return m < 2 ? "a month ago" : `${m}mo ago`; }
function isPaid(b: Bill) { return b.payment_status === "paid" || b.status === "paid"; }

export default function BillsPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill|null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptBill, setReceiptBill] = useState<Bill|null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cart, setCart] = useState<Bill[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { try { const s = localStorage.getItem(CART_KEY); if (s) setCart(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { if (session?.user?.id) fetchBills(); }, [session]);

  const fetchBills = async () => {
    try { const r = await fetch("/api/customer/bills", { credentials: "include" }); const d = await r.json(); if (r.ok) setBills(d.bills||[]); else toast.error(d.error||"Failed"); } catch { toast.error("Error loading bills"); } finally { setLoading(false); }
  };
  const addToCart = (b: Bill) => { if (!cart.find(x=>x._id===b._id)) { setCart([...cart,b]); toast.success("Added to cart"); } else toast.info("Already in cart"); };
  const removeFromCart = (id: string) => setCart(cart.filter(b=>b._id!==id));

  const filtered = bills.filter(b => !statusFilter || b.payment_status === statusFilter);
  const pending = filtered.filter(b => !isPaid(b));
  const paid = filtered.filter(b => isPaid(b));
  const display = showHistory ? paid : pending;
  const totalPages = Math.max(1, Math.ceil(display.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = display.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);
  const totalAmt = display.reduce((s,b) => s+(b.amount_due||0), 0);

  if (loading) return <Loading message="Loading your bills..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{display.length} Bills <span className="text-red-600">{formatCurrency(totalAmt,"USD")}</span></h1>
            <p className="text-gray-500 mt-1">Manage your bills and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setCartOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0f4d8a] rounded-lg text-[#0f4d8a] hover:bg-blue-50 text-sm font-semibold"><ShoppingCart className="h-4 w-4" />CART{cart.length>0?` (${cart.length})`:""}</button>
            <button onClick={()=>setFilterOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0f4d8a] rounded-lg text-[#0f4d8a] hover:bg-blue-50 text-sm font-semibold"><Filter className="h-4 w-4" />FILTER</button>
          </div>
        </div>
        {/* Top pagination */}
        {totalPages > 1 && <div className="flex items-center gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm">&laquo;</button>{Array.from({length:totalPages},(_,i)=>i+1).map(n=><button key={n} onClick={()=>setPage(n)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${curPage===n?"bg-[#f5f0e8] text-gray-900 border border-gray-300":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{n}</button>)}<button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm">&raquo;</button></div>}
        {/* Toggle */}
        <div className="flex gap-2">
          <button onClick={()=>{setShowHistory(false);setPage(1);}} className={`px-5 py-2 rounded-lg font-medium text-sm ${!showHistory?"bg-[#0f4d8a] text-white shadow-md":"bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}>Pending ({pending.length})</button>
          <button onClick={()=>{setShowHistory(true);setPage(1);}} className={`px-5 py-2 rounded-lg font-medium text-sm ${showHistory?"bg-[#0f4d8a] text-white shadow-md":"bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}>Paid ({paid.length})</button>
        </div>
        {/* Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No bills found</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginated.map(bill => {
              const bn = bill.billNumber||bill.invoice_number||bill.tracking_number;
              const due = bill.due_payment||bill.amount_due||0;
              const paidAmt = bill.paid_payment||(isPaid(bill)?due:0);
              const bal = bill.balance||(isPaid(bill)?0:due);
              const dt = bill.invoice_date||bill.last_updated||bill.createdAt;
              const branch = bill.packageDetails?.branch||"Main Branch";
              const p = isPaid(bill);
              return (
                <div key={bill._id||bn} className="bg-[#faf8f5] rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Package TX</p><h3 className="text-lg font-bold text-gray-900">#{bn}</h3></div>
                      {p ? <div className="relative flex items-center justify-center w-12 h-12"><Lock className="h-8 w-8 text-green-600" strokeWidth={2.5}/><span className="absolute -bottom-0.5 -right-1 bg-red-600 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full border border-white transform rotate-[-12deg]">PAID</span></div> : <Unlock className="h-8 w-8 text-blue-500" strokeWidth={2}/>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4"><span className="font-medium">{fmtDate(dt)}</span><span className="text-gray-400">{branch}</span>{dt&&<span className="text-gray-400">({relDate(dt)})</span>}</div>
                    <div className="space-y-1.5 mb-4 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">DUE:</span><span className="font-semibold text-gray-900">{formatCurrency(due,bill.currency||"USD")} <span className="text-xs text-gray-400">({bill.currency||"USD"})</span></span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">PAID:</span><span className="font-semibold text-gray-900">{formatCurrency(paidAmt,bill.currency||"USD")} <span className="text-xs text-gray-400">({bill.currency||"USD"})</span></span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">BALANCE:</span><span className={`font-bold ${bal>0?"text-red-600":"text-green-600"}`}>{formatCurrency(bal,bill.currency||"USD")} <span className="text-xs">({bill.currency||"USD"})</span></span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setSelectedBill(bill);setDetailOpen(true);}} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Eye className="h-4 w-4"/>DETAILS</button>
                      {!p && <button onClick={()=>addToCart(bill)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><ShoppingCart className="h-4 w-4"/>ADD</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Bottom pagination */}
        {totalPages > 1 && <div className="flex items-center justify-center gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-5 w-5"/></button>{Array.from({length:totalPages},(_,i)=>i+1).map(n=><button key={n} onClick={()=>setPage(n)} className={`px-4 py-2 rounded-lg font-medium ${curPage===n?"bg-[#0f4d8a] text-white":"bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{n}</button>)}<button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-5 w-5"/></button></div>}
      </div>
      {detailOpen && selectedBill && <BillDetailModal bill={selectedBill} onClose={()=>{setDetailOpen(false);setSelectedBill(null);}} onOpenReceipt={()=>{setReceiptBill(selectedBill);setDetailOpen(false);}}/>}
      {receiptBill && <ReceiptModal bill={receiptBill} onClose={()=>setReceiptBill(null)}/>}
      {cartOpen && <CartModal cart={cart} removeFromCart={removeFromCart} onClose={()=>setCartOpen(false)}/>}
      {filterOpen && <FilterModal onClose={()=>setFilterOpen(false)} statusFilter={statusFilter} setStatusFilter={setStatusFilter}/>}
    </div>
  );
}

/* ═══ InfoRow ═══ */
function IR({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-2 py-0.5"><span className="text-gray-500 flex items-center gap-1 shrink-0 text-sm">{icon}{label}:</span><span className={`text-gray-800 text-right break-all text-sm ${mono?"font-mono text-xs":"font-medium"}`}>{value??"—"}</span></div>;
}

/* ═══ Bill Detail Modal (2 views) ═══ */
function BillDetailModal({ bill, onClose, onOpenReceipt }: { bill: Bill; onClose: () => void; onOpenReceipt: () => void }) {
  const [pkgView, setPkgView] = useState(false);
  const bn = bill.billNumber||bill.invoice_number||bill.tracking_number;
  const due = bill.due_payment||bill.amount_due||0;
  const paidAmt = bill.paid_payment||(bill.payment_status==="paid"?due:0);
  const bal = bill.balance||(bill.payment_status==="paid"?0:due);
  const dt = bill.invoice_date||bill.last_updated||bill.createdAt;
  const p = isPaid(bill); const pd = bill.packageDetails;
  const awb = pd?.houseAwb||bill.tracking_number; const tot = pd?.freight||due; const iv = pd?.itemValue||0; const wt = pd?.weight||0;
  const fr = pd?.freight||due; const pf = pd?.processingFee||0; const sf = pd?.storageFee||0;
  const branch = pd?.branch||"Main Branch"; const merch = pd?.merchant||"UNKNOWN"; const desc = pd?.description||bill.description||"Merchandise";

  if (pkgView) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-gray-900">AWB/BL: {awb} / <span className="text-gray-500">${tot.toFixed(2)}</span></h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="font-semibold text-gray-900 text-sm">{awb}</span><Package className="h-5 w-5 text-gray-400"/></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><User className="h-4 w-4 text-gray-400"/><span>{pd?.userCode||""} {pd?.customerName||""}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Plane className="h-4 w-4 text-gray-400"/><span>Air Standard</span></div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center"><div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg w-full justify-center"><CheckCircle className="h-5 w-5"/><span className="font-semibold">No issues with package.</span></div></div>
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Sub-Total:</span><span className="font-medium">${tot.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-green-600">Discount:</span><span className="text-green-600 font-medium">$0.00</span></div>
              <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total:</span><span>${tot.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4"><h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Package Info</h3><div className="space-y-1 text-sm">
              <IR icon={<Building className="h-3.5 w-3.5"/>} label="Branch" value={branch}/>
              <IR icon={<Calendar className="h-3.5 w-3.5"/>} label="Manifest" value={pd?.manifest||"—"}/>
              <IR icon={<Package className="h-3.5 w-3.5"/>} label="Collection" value={pd?.collection||"—"}/>
              <IR icon={<Building className="h-3.5 w-3.5"/>} label="Merchant" value={merch}/>
              <IR icon={<FileText className="h-3.5 w-3.5"/>} label="Description" value={desc}/>
              <IR icon={<Hash className="h-3.5 w-3.5"/>} label="HS Code" value={pd?.hsCode||"—"}/>
              <IR icon={<Scale className="h-3.5 w-3.5"/>} label="Rate Group" value={pd?.rateGroup||"Standard Rate"}/>
              <IR icon={<FileText className="h-3.5 w-3.5"/>} label="Commercial" value={pd?.commercialInvoice||"NO"}/>
            </div></div>
            <div className="border border-gray-200 rounded-lg p-4"><h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Billing Info</h3><div className="space-y-1 text-sm">
              <IR icon={<Scale className="h-3.5 w-3.5"/>} label="Weight/Billable" value={`${wt} / ${pd?.pieces||1}`}/>
              <IR icon={<Hash className="h-3.5 w-3.5"/>} label="Duty %" value={`${pd?.dutyPercent||20}%`}/>
              <IR icon={<Hash className="h-3.5 w-3.5"/>} label="GCT %" value={`${pd?.gctPercent||15}%`}/>
              <IR icon={<DollarSign className="h-3.5 w-3.5"/>} label="USD Value" value={`$${iv.toFixed(2)}`}/>
            </div><h4 className="font-semibold text-gray-800 mt-4 mb-2 text-sm">Our Charges</h4><div className="space-y-1 text-sm">
              <IR label="Freight" value={`$${fr.toFixed(2)}`}/><IR label="Processing Fee" value={`$${pf.toFixed(2)}`}/><IR label="Bad Address Fee" value="$0.00"/><IR label="Storage Fee" value={`$${sf.toFixed(2)}`}/>
            </div></div>
            <div className="border border-gray-200 rounded-lg p-4"><h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Tracking Info</h3>
              <div className="mb-3"><span className="inline-block px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">Collected</span></div>
              <div className="space-y-1 text-sm"><IR icon={<Hash className="h-3.5 w-3.5"/>} label="House AWB" value={awb} mono/><IR icon={<MapPin className="h-3.5 w-3.5"/>} label="Tracking #" value={pd?.trackingNum||bill.tracking_number} mono/></div>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100"><button onClick={()=>setPkgView(false)} className="flex items-center gap-2 px-5 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><X className="h-4 w-4"/>CANCEL</button></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div><h2 className="text-2xl font-bold text-gray-900">{bn}</h2><div className="flex items-center gap-3 mt-1"><span className="text-sm text-gray-500 font-medium">Package</span>{p?<div className="flex items-center gap-1.5"><Lock className="h-5 w-5 text-green-600"/><span className="bg-red-600 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full transform rotate-[-8deg]">PAID</span></div>:<Unlock className="h-5 w-5 text-orange-500"/>}<span className="text-sm text-gray-400">{fmtDate(dt)} {dt&&`(${relDate(dt)})`}</span></div></div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex justify-end gap-8 mt-3 text-sm"><div><span className="text-gray-500">Package Amt:</span><span className="ml-2 font-semibold">${due.toFixed(2)}</span></div><div><span className="text-gray-500">Sub-Total:</span><span className="ml-2 font-semibold">${due.toFixed(2)}</span></div><div><span className="text-gray-500">Total Due:</span><span className="ml-2 font-bold">${due.toFixed(2)}</span></div></div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400"/><span className="font-semibold text-gray-900">{pd?.userCode||""} {pd?.customerName||"Customer"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Building className="h-4 w-4 text-gray-400"/><span className="text-gray-700">{branch}</span></div>
              <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-gray-400"/><span className="text-gray-700 capitalize">{bill.payment_method||"Cash"}</span></div>
              <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-gray-400"/><span className="font-bold text-red-600">Balance ${bal.toFixed(2)}</span><button onClick={()=>navigator.clipboard?.writeText(`$${bal.toFixed(2)}`)} className="p-1 hover:bg-gray-100 rounded"><Copy className="h-3.5 w-3.5 text-gray-400"/></button></div>
            </div>
            <div><label className="text-sm font-medium text-gray-600 mb-1 block">Description/Notes</label><div className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600 min-h-[80px] bg-gray-50">{bill.description||bill.adminNotes||"—"}</div></div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">House AWB#</th><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Description</th><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Merchant</th><th className="px-4 py-3 text-center text-gray-600 font-semibold text-xs uppercase">LBS</th><th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Value(USD)</th><th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Due({bill.currency||"USD"})</th><th className="w-10"></th></tr></thead><tbody><tr className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{pd?.houseAwb||bill.tracking_number}</td><td className="px-4 py-3 text-gray-700">{desc}</td><td className="px-4 py-3 text-gray-700">{merch}</td><td className="px-4 py-3 text-center">{wt||1}</td><td className="px-4 py-3 text-right">${iv.toFixed(2)}</td><td className="px-4 py-3 text-right font-semibold">${due.toFixed(2)}</td><td className="px-4 py-3 text-center"><button onClick={()=>setPkgView(true)} className="p-1.5 border border-blue-300 rounded text-blue-500 hover:bg-blue-50"><Eye className="h-4 w-4"/></button></td></tr></tbody></table></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={onOpenReceipt} className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Mail className="h-4 w-4"/>EMAIL INVOICE</button>
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Printer className="h-4 w-4"/>PRINT INVOICE</button>
            <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 text-sm font-semibold"><X className="h-4 w-4"/>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Receipt Modal ═══ */
function ReceiptModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const pd = bill.packageDetails; const due = bill.due_payment||bill.amount_due||0; const paidAmt = bill.paid_payment||(bill.payment_status==="paid"?due:0); const bal = bill.balance||(bill.payment_status==="paid"?0:due);
  const awb = pd?.houseAwb||bill.tracking_number; const wt = pd?.weight||1; const iv = pd?.itemValue||0; const fr = pd?.freight||due; const sf = pd?.storageFee||0; const pf = pd?.processingFee||0; const merch = pd?.merchant||"UNKNOWN"; const desc = pd?.description||bill.description||"Merchandise";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900">Receipt/Invoice</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button></div>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start"><div><p className="text-sm font-semibold text-gray-800">Customer: <span className="font-normal">[{pd?.userCode||""}] {pd?.customerName||"Customer"}</span></p></div><div className="text-right"><p className="text-sm font-semibold text-gray-800">Notes:</p><p className="text-xs text-gray-400 mt-1">{bill.adminNotes||"—"}</p></div></div>
          <table className="w-full text-xs border-collapse border border-gray-200"><thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">House AWB#</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Information</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Our Fees</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Govt Fees</th><th className="text-right px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Discount</th><th className="text-right px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Due</th></tr></thead><tbody><tr><td className="px-3 py-3 border border-gray-200 align-top"><p className="font-semibold text-gray-900">{awb}</p><p className="text-gray-500 mt-1">{merch}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Weight:</span> {wt} Lbs</p><p><span className="text-gray-500">USD Value:</span> ${iv.toFixed(2)}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Freight:</span> ${fr.toFixed(2)}</p><p><span className="text-gray-500">Storage:</span> ${sf.toFixed(2)}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Proc fee:</span> ${pf.toFixed(2)}</p><p><span className="text-gray-500">Duty:</span> $0.00</p><p><span className="text-gray-500">GCT:</span> $0.00</p></td><td className="px-3 py-3 border border-gray-200 align-top text-right">$0.00</td><td className="px-3 py-3 border border-gray-200 align-top text-right font-semibold">${due.toFixed(2)}</td></tr><tr><td className="px-3 py-2 border border-gray-200 text-gray-500">{merch}</td><td colSpan={4} className="px-3 py-2 border border-gray-200 text-gray-500">{desc}</td><td className="border border-gray-200"></td></tr></tbody></table>
          <div className="grid grid-cols-3 gap-4 pt-2"><div><p className="font-bold text-gray-900 text-sm">Thank you for your business!</p><p className="text-xs text-gray-500 mt-1">Please print or save this for your records</p></div><div><p className="font-semibold text-gray-800 text-sm mb-1">Payment Details</p><p className="text-xs text-gray-600 capitalize">{bill.payment_method||"Cash"}: ${paidAmt.toFixed(2)}</p></div><div className="text-right space-y-0.5"><p className="text-xs text-gray-600">Sub-Total: <span className="font-semibold">${due.toFixed(2)}</span></p><p className="text-xs text-gray-600">Total: <span className="font-semibold">{bill.currency||"USD"}${due.toFixed(2)}</span></p><p className="text-xs text-gray-600">Payment: <span className="font-semibold">${paidAmt.toFixed(2)}</span></p><p className="text-xs">Balance: <span className={`font-semibold ${bal>0?"text-red-500":"text-gray-900"}`}>${bal.toFixed(2)}</span></p></div></div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Mail className="h-4 w-4"/>EMAIL INVOICE</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Printer className="h-4 w-4"/>PRINT INVOICE</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Printer className="h-4 w-4"/>PRINT RECEIPT</button>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 text-sm font-semibold"><X className="h-4 w-4"/>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Cart Modal ═══ */
function CartModal({ cart, removeFromCart, onClose }: { cart: Bill[]; removeFromCart: (id: string) => void; onClose: () => void }) {
  const { formatCurrency } = useCurrency();
  const total = cart.reduce((s,i) => s+(i.due_payment||i.amount_due||0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900"><ShoppingCart className="inline h-5 w-5 mr-2"/>Cart ({cart.length})</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button></div>
        <div className="p-6 space-y-4">
          {cart.length===0 ? <div className="text-center py-8"><ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500">Your cart is empty</p></div> : <>
            <div className="space-y-2 max-h-64 overflow-y-auto">{cart.map(item => { const bn = item.billNumber||item.invoice_number||item.tracking_number; return <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">#{bn}</p><p className="text-xs text-gray-500">{formatCurrency(item.due_payment||item.amount_due||0, item.currency||"USD")}</p></div><button onClick={()=>removeFromCart(item._id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><X className="h-4 w-4"/></button></div>; })}</div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200"><span className="font-semibold text-gray-900">Total:</span><span className="font-bold text-lg">{formatCurrency(total,"USD")}</span></div>
            <Link href="/customer/checkout" onClick={()=>{try{localStorage.setItem("customer_cart",JSON.stringify(cart));}catch{}}} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg"><CreditCard className="h-5 w-5"/>Proceed to Checkout</Link>
          </>}
          <button onClick={onClose} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Filter Modal ═══ */
function FilterModal({ onClose, statusFilter, setStatusFilter }: { onClose: () => void; statusFilter: string; setStatusFilter: (f: string) => void }) {
  const [temp, setTemp] = useState(statusFilter);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900"><Filter className="inline h-5 w-5 mr-2"/>Filter Bills</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button></div>
        <div className="p-6 space-y-6">
          <div><h3 className="font-semibold text-gray-900 mb-3">Filter by Status</h3><div className="space-y-2.5">{[{v:"",l:"All Bills"},{v:"submitted",l:"Pending"},{v:"paid",l:"Paid"},{v:"overdue",l:"Overdue"}].map(o=><label key={o.v} className="flex items-center gap-3 cursor-pointer"><input type="radio" name="sf" value={o.v} checked={temp===o.v} onChange={()=>setTemp(o.v)} className="w-4 h-4 accent-[#0f4d8a]"/><span className="text-sm text-gray-700">{o.l}</span></label>)}</div></div>
          <div className="flex gap-3"><button onClick={()=>{setStatusFilter(temp);onClose();}} className="flex-1 px-4 py-2.5 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] font-medium text-sm">Apply</button><button onClick={()=>{setTemp("");setStatusFilter("");}} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Reset</button></div>
        </div>
      </div>
    </div>
  );
}
