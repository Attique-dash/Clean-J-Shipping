"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import Link from "next/link";
import { CreditCard, FileText, CheckCircle, Lock, Unlock, ShoppingCart, Filter, X, Calendar, Package, User, MapPin, Printer, Mail, ChevronLeft, ChevronRight, Eye, Plane, Building, Hash, Scale, DollarSign, Copy, RefreshCw, Receipt } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/lib/package-format";
import { CurrencyService } from "@/lib/currency-service";
import Loading from "@/components/Loading";

interface PackageDetails { branch?: string; manifest?: string; merchant?: string; weight?: number; description?: string; hsCode?: string; userCode?: string; pieces?: number; dimensions?: { length: number; width: number; height: number }; entryDate?: string; serviceMode?: string; itemValue?: number; freight?: number; processingFee?: number; storageFee?: number; dutyPercent?: number; gctPercent?: number; warehouseLocation?: string; rateGroup?: string; commercialInvoice?: string; houseAwb?: string; trackingNum?: string; collection?: string; customerName?: string; customerEmail?: string; customerPhone?: string; }
interface Bill { _id: string; billNumber?: string; tracking_number: string; description?: string; invoice_number?: string; invoice_date?: string; currency?: string; amount_due: number; payment_status: "submitted"|"reviewed"|"rejected"|"none"|"paid"|"overdue"|"partially_paid"; due_payment?: number; paid_payment?: number; balance?: number; last_updated?: string; payment_id?: string; payment_method?: string; status?: string; totalAmount?: number; paidAt?: string; paidAmount?: number; createdAt?: string; adminNotes?: string; packageDetails?: PackageDetails; }

const PAGE_SIZE = 9;
const CART_KEY = "customer_bills_cart";
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A"; }
function relDate(d: string): string { const diff = Date.now() - new Date(d).getTime(); const days = Math.floor(diff / 86400000); if (days === 0) return "today"; if (days < 7) return `${days}d ago`; const w = Math.floor(days / 7); if (w < 5) return `${w}w ago`; const m = Math.floor(days / 30); return m < 2 ? "a month ago" : `${m}mo ago`; }
function isPaid(b: Bill) { return b.payment_status === "paid" || b.status === "paid"; }
function getBillNumber(b: Bill): string {
  const bn = b.billNumber || b.invoice_number || b.tracking_number;
  if (!bn || bn === "UNKNOWN") return `PKG-${b._id?.slice(-6) || "N/A"}`;
  return bn;
}

export default function BillsPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill|null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptBill, setReceiptBill] = useState<Bill|null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { try { const s = localStorage.getItem(CART_KEY); if (s) { const parsed = JSON.parse(s); setCart(Array.isArray(parsed) ? parsed : []); } } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { if (session?.user?.id) fetchBills(); }, [session]);

  const fetchBills = async () => {
    try { const r = await fetch("/api/customer/bills", { credentials: "include" }); const d = await r.json(); if (r.ok) setBills(d.bills||[]); else toast.error(d.error||"Failed"); } catch { toast.error("Error loading bills"); } finally { setLoading(false); }
  };

  const addToCart = (b: Bill) => {
    const tn = b.tracking_number;
    if (!cart.includes(tn)) { setCart([...cart, tn]); toast.success("Added to cart"); } else toast.info("Already in cart");
  };
  const removeFromCart = (tn: string) => setCart(cart.filter(x => x !== tn));

  const filtered = bills.filter(b => {
    if (!statusFilter) return true;
    if (statusFilter === "paid") return isPaid(b);
    if (statusFilter === "pending") return !isPaid(b);
    return b.payment_status === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);
  const totalAmt = filtered.reduce((s,b) => s+(b.amount_due||0), 0);
  const pendingCount = bills.filter(b => !isPaid(b)).length;
  const paidCount = bills.filter(b => isPaid(b)).length;

  useEffect(() => { setPage(1); }, [statusFilter]);

  if (loading) return <Loading message="Loading your bills..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><Receipt className="h-7 w-7" /></div>
              <div><div>
            <h1 className="text-3xl font-bold text-white">{filtered.length} Bills <span className="text-orange-300">{formatCurrency(totalAmt,"USD")}</span></h1>
            <p className="text-gray-300-custom mt-1">{pendingCount} pending · {paidCount} paid</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setCartOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0f4d8a] rounded-lg text-[#0f4d8a] hover:bg-blue-50 text-sm font-semibold"><ShoppingCart className="h-4 w-4" />CART{cart.length>0?` (${cart.length})`:""}</button>
            <button onClick={()=>setFilterOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0f4d8a] rounded-lg text-[#0f4d8a] hover:bg-blue-50 text-sm font-semibold"><Filter className="h-4 w-4" />FILTER</button>
            <button onClick={fetchBills} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-blue-100 hover:bg-gray-50 text-sm font-medium"><RefreshCw className="h-4 w-4" /></button>
          </div></div>
            </div>
          </div>
        </header>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          {[{v:"",l:`All (${bills.length})`},{v:"pending",l:`Pending (${pendingCount})`},{v:"paid",l:`Paid (${paidCount})`},{v:"overdue",l:"Overdue"},{v:"partially_paid",l:"Partially Paid"}].map(o => (
            <button key={o.v} onClick={()=>setStatusFilter(o.v)} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${statusFilter===o.v?"bg-[#0f4d8a] text-white shadow-md":"bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}>{o.l}</button>
          ))}
        </div>

        {/* Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No bills found</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map(bill => {
              const bn = getBillNumber(bill);
              const due = bill.due_payment||bill.amount_due||0;
              const paidAmt = bill.paid_payment||(isPaid(bill)?due:0);
              const bal = bill.balance||(isPaid(bill)?0:due);
              const dt = bill.invoice_date||bill.last_updated||bill.createdAt;
              const branch = bill.packageDetails?.warehouseLocation||bill.packageDetails?.branch||"Main Branch";
              const p = isPaid(bill);
              const inCart = cart.includes(bill.tracking_number);
              return (
                <div key={bill._id||bn} className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Package TX</p>
                        <h3 className="text-base font-bold text-gray-900 truncate" title={bn}>#{bn}</h3>
                      </div>
                      {p ? <div className="relative flex items-center justify-center w-10 h-10 shrink-0"><Lock className="h-7 w-7 text-green-600" strokeWidth={2.5}/><span className="absolute -bottom-0.5 -right-1 bg-red-600 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full border border-white transform rotate-[-12deg]">PAID</span></div> : <Unlock className="h-7 w-7 text-blue-500 shrink-0" strokeWidth={2}/>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="font-medium">{fmtDate(dt)}</span>
                      <span className="text-gray-400 truncate">{branch}</span>
                      {dt&&<span className="text-gray-400">({relDate(dt)})</span>}
                    </div>
                    <div className="space-y-1 mb-3 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">DUE:</span><span className="font-semibold text-gray-900 text-xs">{CurrencyService.format(due,bill.currency||"USD")}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">PAID:</span><span className="font-semibold text-gray-900 text-xs">{CurrencyService.format(paidAmt,bill.currency||"USD")}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">BALANCE:</span><span className={`font-bold text-xs ${bal>0?"text-red-600":"text-green-600"}`}>{CurrencyService.format(bal,bill.currency||"USD")}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setSelectedBill(bill);setDetailOpen(true);}} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-xs font-semibold"><Eye className="h-3.5 w-3.5"/>Details</button>
                      {!p && <button onClick={()=>addToCart(bill)} disabled={inCart} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${inCart ? "border-green-500 text-green-600 bg-green-50 cursor-not-allowed" : "border-[#0f4d8a] text-[#0f4d8a] hover:bg-blue-50"}`}><ShoppingCart className="h-3.5 w-3.5"/>{inCart ? "Added" : "Add"}</button>}
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
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-curPage)<=1).reduce<(number|"…")[]>((acc,p,idx,arr)=>{if(idx>0&&p-(arr[idx-1] as number)>1) acc.push("…"); acc.push(p); return acc;},[]).map((p,idx)=>p==="…" ? <span key={`e${idx}`} className="px-1 text-gray-400 text-sm">…</span> : <button key={p} onClick={()=>setPage(p as number)} className={`h-9 w-9 rounded-lg text-sm font-medium border ${curPage===p?"bg-[#0f4d8a] text-white border-[#0f4d8a]":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>)}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
          </div>
        )}
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

/* ═══ Bill Detail Modal ═══ */
function BillDetailModal({ bill, onClose, onOpenReceipt }: { bill: Bill; onClose: () => void; onOpenReceipt: () => void }) {
  const [pkgView, setPkgView] = useState(false);
  const bn = getBillNumber(bill);
  const due = bill.due_payment||bill.amount_due||0;
  const paidAmt = bill.paid_payment||(bill.payment_status==="paid"?due:0);
  const bal = bill.balance||(bill.payment_status==="paid"?0:due);
  const dt = bill.invoice_date||bill.last_updated||bill.createdAt;
  const p = isPaid(bill); const pd = bill.packageDetails;
  const awb = pd?.houseAwb||bill.tracking_number; const tot = pd?.freight||due; const iv = pd?.itemValue||0; const wt = pd?.weight||0;
  const fr = pd?.freight||due; const pf = pd?.processingFee||0; const sf = pd?.storageFee||0;
  const branch = pd?.branch||"Main Branch"; const merch = pd?.merchant||"UNKNOWN"; const desc = pd?.description||bill.description||"Merchandise";
  // FIXED: Get currency symbol from bill currency
  const currencyCode = bill.currency || "USD";
  const currencySymbol = getCurrencySymbol(currencyCode);

  if (pkgView) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-gray-900">AWB/BL: {awb} / <span className="text-gray-500">{currencySymbol}{tot.toFixed(2)}</span></h2>
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
              <div className="flex justify-between text-sm"><span className="text-gray-500">Sub-Total:</span><span className="font-medium">{currencySymbol}{tot.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-green-600">Discount:</span><span className="text-green-600 font-medium">{currencySymbol}0.00</span></div>
              <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total:</span><span>{currencySymbol}{tot.toFixed(2)}</span></div>
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
              <IR label="Freight" value={`${currencySymbol}${fr.toFixed(2)}`}/><IR label="Processing Fee" value={`${currencySymbol}${pf.toFixed(2)}`}/><IR label="Bad Address Fee" value={`${currencySymbol}0.00`}/><IR label="Storage Fee" value={`${currencySymbol}${sf.toFixed(2)}`}/>
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
          <div className="flex justify-end gap-8 mt-3 text-sm"><div><span className="text-gray-500">Package Amt:</span><span className="ml-2 font-semibold">{currencySymbol}{due.toFixed(2)}</span></div><div><span className="text-gray-500">Sub-Total:</span><span className="ml-2 font-semibold">{currencySymbol}{due.toFixed(2)}</span></div><div><span className="text-gray-500">Total Due:</span><span className="ml-2 font-bold">{currencySymbol}{due.toFixed(2)}</span></div></div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400"/><span className="font-semibold text-gray-900">{pd?.userCode||""} {pd?.customerName||"Customer"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Building className="h-4 w-4 text-gray-400"/><span className="text-gray-700">{branch}</span></div>
              <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-gray-400"/><span className="text-gray-700 capitalize">{bill.payment_method||"Cash"}</span></div>
              <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-gray-400"/><span className="font-bold text-red-600">Balance {currencySymbol}{bal.toFixed(2)}</span><button onClick={()=>navigator.clipboard?.writeText(`${currencySymbol}${bal.toFixed(2)}`)} className="p-1 hover:bg-gray-100 rounded"><Copy className="h-3.5 w-3.5 text-gray-400"/></button></div>
            </div>
            <div><label className="text-sm font-medium text-gray-600 mb-1 block">Description/Notes</label><div className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600 min-h-[80px] bg-gray-50">{bill.description||bill.adminNotes||"—"}</div></div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">House AWB#</th><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Description</th><th className="px-4 py-3 text-left text-gray-600 font-semibold text-xs uppercase">Merchant</th><th className="px-4 py-3 text-center text-gray-600 font-semibold text-xs uppercase">LBS</th><th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Value(USD)</th><th className="px-4 py-3 text-right text-gray-600 font-semibold text-xs uppercase">Due({bill.currency||"USD"})</th><th className="w-10"></th></tr></thead><tbody><tr className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{pd?.houseAwb||bill.tracking_number}</td><td className="px-4 py-3 text-gray-700">{desc}</td><td className="px-4 py-3 text-gray-700">{merch}</td><td className="px-4 py-3 text-center">{wt||1}</td><td className="px-4 py-3 text-right">${iv.toFixed(2)}</td><td className="px-4 py-3 text-right font-semibold">{currencySymbol}{due.toFixed(2)}</td><td className="px-4 py-3 text-center"><button onClick={()=>setPkgView(true)} className="p-1.5 border border-blue-300 rounded text-blue-500 hover:bg-blue-50"><Eye className="h-4 w-4"/></button></td></tr></tbody></table></div>
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
  // FIXED: Get currency symbol from bill currency
  const currencyCode = bill.currency || "USD";
  const currencySymbol = getCurrencySymbol(currencyCode);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900">Receipt/Invoice</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button></div>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start"><div><p className="text-sm font-semibold text-gray-800">Customer: <span className="font-normal">[{pd?.userCode||""}] {pd?.customerName||"Customer"}</span></p></div><div className="text-right"><p className="text-sm font-semibold text-gray-800">Notes:</p><p className="text-xs text-gray-400 mt-1">{bill.adminNotes||"—"}</p></div></div>
          <table className="w-full text-xs border-collapse border border-gray-200"><thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">House AWB#</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Information</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Our Fees</th><th className="text-left px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Govt Fees</th><th className="text-right px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Discount</th><th className="text-right px-3 py-2.5 text-gray-600 font-semibold border border-gray-200">Due</th></tr></thead><tbody><tr><td className="px-3 py-3 border border-gray-200 align-top"><p className="font-semibold text-gray-900">{awb}</p><p className="text-gray-500 mt-1">{merch}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Weight:</span> {wt} Lbs</p><p><span className="text-gray-500">USD Value:</span> ${iv.toFixed(2)}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Freight:</span> {currencySymbol}{fr.toFixed(2)}</p><p><span className="text-gray-500">Storage:</span> {currencySymbol}{sf.toFixed(2)}</p></td><td className="px-3 py-3 border border-gray-200 align-top"><p><span className="text-gray-500">Proc fee:</span> {currencySymbol}{pf.toFixed(2)}</p><p><span className="text-gray-500">Duty:</span> {currencySymbol}0.00</p><p><span className="text-gray-500">GCT:</span> {currencySymbol}0.00</p></td><td className="px-3 py-3 border border-gray-200 align-top text-right">{currencySymbol}0.00</td><td className="px-3 py-3 border border-gray-200 align-top text-right font-semibold">{currencySymbol}{due.toFixed(2)}</td></tr><tr><td className="px-3 py-2 border border-gray-200 text-gray-500">{merch}</td><td colSpan={4} className="px-3 py-2 border border-gray-200 text-gray-500">{desc}</td><td className="border border-gray-200"></td></tr></tbody></table>
          <div className="grid grid-cols-3 gap-4 pt-2"><div><p className="font-bold text-gray-900 text-sm">Thank you for your business!</p><p className="text-xs text-gray-500 mt-1">Please print or save this for your records</p></div><div><p className="font-semibold text-gray-800 text-sm mb-1">Payment Details</p><p className="text-xs text-gray-600 capitalize">{bill.payment_method||"Cash"}: {currencySymbol}{paidAmt.toFixed(2)}</p></div><div className="text-right space-y-0.5"><p className="text-xs text-gray-600">Sub-Total: <span className="font-semibold">{currencySymbol}{due.toFixed(2)}</span></p><p className="text-xs text-gray-600">Total: <span className="font-semibold">{currencySymbol}{due.toFixed(2)}</span></p><p className="text-xs text-gray-600">Payment: <span className="font-semibold">{currencySymbol}{paidAmt.toFixed(2)}</span></p><p className="text-xs">Balance: <span className={`font-semibold ${bal>0?"text-red-500":"text-gray-900"}`}>{currencySymbol}{bal.toFixed(2)}</span></p></div></div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={()=>{navigator.clipboard?.writeText(`Invoice for ${awb}: ${currencySymbol}${due.toFixed(2)}`); toast.success("Copied invoice details");}} className="flex items-center gap-2 px-4 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Mail className="h-4 w-4"/>EMAIL INVOICE</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Printer className="h-4 w-4"/>PRINT</button>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 text-sm font-semibold"><X className="h-4 w-4"/>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Cart Modal ═══ */
function CartModal({ cart, removeFromCart, onClose }: { cart: string[]; removeFromCart: (tn: string) => void; onClose: () => void }) {
  const { formatCurrency } = useCurrency();
  const [cartBills, setCartBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  useEffect(() => {
    async function loadCartBills() {
      if (cart.length === 0) { setLoadingBills(false); return; }
      try {
        const r = await fetch("/api/customer/bills", { credentials: "include" });
        const d = await r.json();
        if (r.ok) {
          const all: Bill[] = d.bills || [];
          const matched = all.filter((b: Bill) => cart.includes(b.tracking_number) && !isPaid(b));
          setCartBills(matched);
        }
      } catch {}
      finally { setLoadingBills(false); }
    }
    loadCartBills();
  }, [cart]);

  const total = cartBills.reduce((s,i) => s+(i.due_payment||i.amount_due||0), 0);

  const handleCheckout = () => {
    try { localStorage.setItem("customer_cart", JSON.stringify(cart)); } catch {}
    window.location.href = "/customer/checkout";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-900"><ShoppingCart className="inline h-5 w-5 mr-2"/>Cart ({cart.length})</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button></div>
        <div className="p-6 space-y-4">
          {loadingBills ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f4d8a] mx-auto mb-2"></div><p className="text-gray-500 text-sm">Loading cart...</p></div>
          ) : cart.length===0 ? (
            <div className="text-center py-8"><ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3"/><p className="text-gray-500">Your cart is empty</p></div>
          ) : <>
            <div className="space-y-2 max-h-64 overflow-y-auto">{cartBills.map(bill => { const bn = getBillNumber(bill); return <div key={bill._id||bill.tracking_number} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">#{bn}</p><p className="text-xs text-gray-500">{formatCurrency(bill.due_payment||bill.amount_due||0, bill.currency||"USD")}</p></div><button onClick={()=>removeFromCart(bill.tracking_number)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><X className="h-4 w-4"/></button></div>; })}</div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200"><span className="font-semibold text-gray-900">Total:</span><span className="font-bold text-lg">{formatCurrency(total,"USD")}</span></div>
            <button onClick={handleCheckout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg text-sm"><CreditCard className="h-5 w-5"/>Proceed to Checkout</button>
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
          <div><h3 className="font-semibold text-gray-900 mb-3">Filter by Status</h3><div className="space-y-2.5">{[{v:"",l:"All Bills"},{v:"pending",l:"Pending"},{v:"paid",l:"Paid"},{v:"overdue",l:"Overdue"},{v:"partially_paid",l:"Partially Paid"}].map(o=><label key={o.v} className="flex items-center gap-3 cursor-pointer"><input type="radio" name="sf" value={o.v} checked={temp===o.v} onChange={()=>setTemp(o.v)} className="w-4 h-4 accent-[#0f4d8a]"/><span className="text-sm text-gray-700">{o.l}</span></label>)}</div></div>
          <div className="flex gap-3"><button onClick={()=>{setStatusFilter(temp);onClose();}} className="flex-1 px-4 py-2.5 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#1e6bb8] font-medium text-sm">Apply</button><button onClick={()=>{setTemp("");setStatusFilter("");}} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Reset</button></div>
        </div>
      </div>
    </div>
  );
}
