"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { CurrencyService } from '@/lib/currency-service';
import {
  Upload, FileText, X, Loader2, CheckCircle, AlertCircle, RefreshCw,
  Package, DollarSign, Plane, Ship, Truck, Check, Eye, Download, Search,
  ChevronLeft, ChevronRight, Clock, Tag, Scale, MapPin, Building, User,
  Trash2,
} from "lucide-react";
import Loading from "@/components/Loading";

interface InvoiceFile { url: string; publicId: string; filename: string; size: number; uploadedAt: string; }
interface PackageData {
  id: string; trackingNumber: string; tracking_number: string; shipper: string;
  weight: number; serviceMode: 'air' | 'ocean' | 'local'; dateReceived?: string;
  received_date?: string; invoiceStatus: 'pending' | 'submitted' | 'approved' | 'rejected' | 'billed';
  invoiceUploaded: boolean; pricePaid: number; pricePaidCurrency: string;
  invoiceFiles: InvoiceFile[] | string[]; invoiceSubmittedAt?: string; hasInvoice: boolean;
  description?: string; itemDescription?: string; warehouseLocation?: string; merchant?: string;
  branch?: string; houseAwb?: string; trackingNum?: string; userCode?: string;
  pieces?: number; freight?: number; totalAmount?: number; total_amount?: number;
}

const PAGE_SIZE = 9;

function statusLabel(s: string) {
  const m: Record<string,string> = { submitted: "Submitted", approved: "Approved", rejected: "Rejected", billed: "Billed", pending: "Pending" };
  return m[s] || s;
}
function statusClasses(s: string) {
  switch(s) {
    case 'submitted': return "bg-blue-100 text-blue-800";
    case 'approved': return "bg-green-100 text-green-800";
    case 'rejected': return "bg-red-100 text-red-800";
    case 'billed': return "bg-purple-100 text-purple-800";
    default: return "bg-yellow-100 text-yellow-800";
  }
}
function statusIcon(s: string) {
  switch(s) {
    case 'submitted': return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
    case 'approved': return <Check className="w-3.5 h-3.5 mr-1" />;
    case 'rejected': return <X className="w-3.5 h-3.5 mr-1" />;
    case 'billed': return <DollarSign className="w-3.5 h-3.5 mr-1" />;
    default: return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
  }
}
function serviceIcon(mode?: string) {
  switch ((mode||"").toLowerCase()) {
    case 'air': return <Plane className="h-5 w-5" />;
    case 'ocean': case 'sea': return <Ship className="h-5 w-5" />;
    case 'local': return <Truck className="h-5 w-5" />;
    default: return <Package className="h-5 w-5" />;
  }
}
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}) : "N/A"; }
function relDate(d: string) { const diff=Date.now()-new Date(d).getTime(); const days=Math.floor(diff/86400000); if(days===0) return "today"; if(days<7) return `${days}d ago`; const w=Math.floor(days/7); if(w<5) return `${w}w ago`; const m=Math.floor(days/30); return m<2?"a month ago":`${m}mo ago`; }
function getTrack(p: PackageData) { return p.trackingNumber || p.tracking_number || p.houseAwb || p.trackingNum || "UNKNOWN"; }
function canSubmit(p: PackageData) { return p.invoiceStatus !== 'submitted' && p.invoiceStatus !== 'billed' && p.invoiceStatus !== 'approved'; }
function fileIcon(fn: string) { return fn.endsWith('.pdf') ? <FileText className="h-4 w-4 text-red-500"/> : <FileText className="h-4 w-4 text-blue-500"/>; }

/* ═══ Upload Modal ═══ */
function UploadModal({ pkg, onClose, onDone }: { pkg: PackageData; onClose: () => void; onDone: () => void }) {
  const tn = getTrack(pkg);
  const [price, setPrice] = useState(pkg.pricePaid?.toString() || "0");
  const [currency, setCurrency] = useState(pkg.pricePaidCurrency || "USD");
  const [description, setDescription] = useState(pkg.description || "");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const valid = Array.from(e.target.files).filter(f => {
      if (!['application/pdf','image/jpeg','image/jpg','image/png'].includes(f.type)) { toast.error(`Invalid type: ${f.name}`); return false; }
      if (f.size > 10*1024*1024) { toast.error(`Too large: ${f.name}`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid].slice(0, 3));
  };

  const handleSubmit = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { toast.error("Enter a valid price"); return; }
    if (files.length === 0) { toast.error("Upload at least one file"); return; }
    if (!description.trim()) { toast.error("Enter a description of goods"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files_0", f));
      fd.append("upload_0", JSON.stringify({ tracking_number: tn, price_paid: p, currency, description }));
      const res = await fetch("/api/customer/invoice-upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed");
      toast.success("Invoice submitted!");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Upload className="h-5 w-5 text-[#0f4d8a]"/>Upload Invoice</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Tracking Number</p>
            <p className="font-bold text-gray-900 font-mono break-all">{tn}</p>
            <p className="text-sm text-gray-500 mt-1">{pkg.shipper || pkg.merchant || "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Paid <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={price} onChange={e=>setPrice(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm"/>
              </div>
              <select value={currency} onChange={e=>setCurrency(e.target.value)} className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] text-sm bg-white">
                {CurrencyService.getAllCurrencies().map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description of Goods <span className="text-red-500">*</span></label>
            <textarea 
              placeholder="e.g., Electronics, Clothing, Household items" 
              value={description} 
              onChange={e=>setDescription(e.target.value)} 
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Files <span className="text-red-500">*</span></label>
            {files.length > 0 && (
              <div className="space-y-2 mb-3">{files.map((f,i)=>(
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex items-center gap-2">{fileIcon(f.name)}<span className="text-sm text-gray-700 truncate max-w-[200px]">{f.name}</span></div>
                  <button onClick={()=>setFiles(files.filter((_,j)=>j!==i))} className="text-red-500 hover:text-red-700"><X className="h-4 w-4"/></button>
                </div>
              ))}</div>
            )}
            {files.length < 3 && (
              <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#0f4d8a] hover:bg-blue-50 transition-colors">
                <Upload className="h-5 w-5 text-gray-400"/><span className="text-sm text-gray-600">{files.length===0?"Upload Files":"Add More"}</span>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden"/>
              </label>
            )}
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10MB each, up to 3 files</p>
          </div>
          {pkg.invoiceFiles && pkg.invoiceFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Previously Uploaded</p>
              <div className="space-y-1">{pkg.invoiceFiles.slice(0,3).map((f,i)=>{
                const isObj = typeof f === 'object' && (f as any).url;
                const fn = isObj ? (f as any).filename : String(f).split('/').pop()||'file';
                const url = isObj ? (f as any).url : String(f);
                return <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                  {fileIcon(fn)}<span className="truncate max-w-[150px] text-gray-700 flex-1">{fn}</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Eye className="h-4 w-4"/></a>
                  <a href={url} download={fn} className="p-1 text-green-600 hover:bg-green-100 rounded"><Download className="h-4 w-4"/></a>
                </div>;
              })}</div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 text-sm">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin"/>Submitting...</> : <><Upload className="h-4 w-4"/>Submit Invoice</>}
            </button>
            <button onClick={onClose} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function CustomerInvoiceUploadPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [uploadPkg, setUploadPkg] = useState<PackageData | null>(null);
  const [deletePkg, setDeletePkg] = useState<PackageData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Handle ?tracking= URL parameter to pre-select package
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackingParam = params.get('tracking');
    if (trackingParam) {
      setQuery(trackingParam);
    }
  }, []);

  const handleDeleteInvoice = async (pkg: PackageData) => {
    if (!confirm(`Are you sure you want to delete the invoice for ${getTrack(pkg)}? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const tn = getTrack(pkg);
      const res = await fetch("/api/customer/invoice-upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tracking_number: tn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete invoice");
      toast.success("Invoice deleted successfully!");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  async function load() {
    try {
      setLoading(true);
      // Fetch invoice-upload data
      const res = await fetch("/api/customer/invoice-upload", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      const invoicePkgs = (data.packages || []).map((p: any) => ({
        ...p,
        trackingNumber: p.trackingNumber || p.tracking_number || p.TrackingNumber || "",
        tracking_number: p.tracking_number || p.trackingNumber || p.TrackingNumber || "",
        merchant: p.Shipper || p.shipper || p.merchant || "UNKNOWN",
        shipper: p.Shipper || p.shipper || "UNKNOWN",
        weight: p.Weight || p.weight || 0,
        description: p.Description || p.description || p.itemDescription || "",
        warehouseLocation: p.Branch || p.warehouseLocation || p.branch || "",
        userCode: p.UserCode || p.userCode || "",
        pieces: p.Pieces || p.pieces || 1,
        totalAmount: p.totalAmount || p.total_amount || p.freight || 0,
        total_amount: p.totalAmount || p.total_amount || p.freight || 0,
      }));

      // Also fetch from packages API for better tracking numbers and details
      try {
        const pkgRes = await fetch("/api/customer/packages", { credentials: "include", cache: "no-store" });
        const pkgData = await pkgRes.json();
        if (pkgRes.ok) {
          const rawPkgs: any[] = Array.isArray(pkgData?.packages) ? pkgData.packages : [];
          const pkgMap = new Map<string, any>();
          rawPkgs.forEach((p: any) => {
            const tn = p.trackingNumber || p.tracking_number || "";
            if (tn) pkgMap.set(tn, p);
          });
          // Enrich invoice packages with real package data
          invoicePkgs.forEach((ip: any) => {
            const tn = ip.trackingNumber || ip.tracking_number || "";
            const realPkg = pkgMap.get(tn);
            if (realPkg) {
              ip.trackingNumber = realPkg.TrackingNumber || realPkg.trackingNumber || realPkg.tracking_number || ip.trackingNumber;
              ip.tracking_number = realPkg.TrackingNumber || realPkg.tracking_number || realPkg.trackingNumber || ip.tracking_number;
              ip.houseAwb = realPkg.houseAwb || realPkg.TrackingNumber || realPkg.trackingNumber || ip.trackingNumber;
              ip.trackingNum = realPkg.trackingNum || realPkg.TrackingNumber || realPkg.tracking_number || ip.trackingNumber;
              ip.description = realPkg.Description || realPkg.description || realPkg.itemDescription || ip.description;
              ip.itemDescription = realPkg.Description || realPkg.itemDescription || realPkg.description || ip.itemDescription;
              ip.merchant = realPkg.Shipper || realPkg.shipper || realPkg.merchant || ip.merchant;
              ip.shipper = realPkg.Shipper || realPkg.shipper || ip.shipper;
              ip.warehouseLocation = realPkg.warehouseLocation || realPkg.Branch || realPkg.branch || ip.warehouseLocation;
              ip.branch = realPkg.Branch || realPkg.branch || ip.branch;
              ip.userCode = realPkg.UserCode || realPkg.userCode || ip.userCode;
              ip.pieces = realPkg.Pieces || realPkg.pieces || ip.pieces;
              ip.weight = realPkg.Weight || realPkg.weight || ip.weight;
              ip.freight = realPkg.freight || realPkg.shipping_cost || realPkg.totalAmount || ip.freight;
              ip.totalAmount = realPkg.totalAmount || realPkg.total_amount || realPkg.freight || ip.totalAmount;
              ip.status = realPkg.status || ip.status;
            }
          });
        }
      } catch { /* continue without enrichment */ }

      setPackages(invoicePkgs);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session?.user) load(); else if (session === null) setLoading(false); }, [session]);
  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const filtered = packages.filter(p => {
    const tn = getTrack(p);
    const q = query.trim().toLowerCase();
    const matchQ = !q || tn.toLowerCase().includes(q) || (p.shipper||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q);
    const matchS = !statusFilter || p.invoiceStatus === statusFilter;
    return matchQ && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);
  const needUpload = packages.filter(p => canSubmit(p)).length;

  if (loading && session === undefined) return <Loading message="Loading packages..." />;
  if (!session && !loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center max-w-md">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-6">Please log in to upload invoices</p>
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><Upload className="h-7 w-7" /></div>
              <div><div>
            <h1 className="text-3xl font-bold text-white">
              {filtered.length} Package Invoice{filtered.length !== 1 ? "s" : ""}
            </h1>
            <p className="text-gray-300-custom mt-1">{needUpload} package{needUpload !== 1 ? "s" : ""} requiring invoice upload</p>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-blue-100 hover:bg-gray-50 shadow-sm text-sm font-medium">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh
          </button></div>
            </div>
          </div>
        </header>

        {/* Search + Filter */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm" placeholder="Search tracking number, shipper, or description…" value={query} onChange={e=>setQuery(e.target.value)}/>
            </div>
            <select className="px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:outline-none text-sm bg-white" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="billed">Billed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Package Cards */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
            <p className="text-gray-500 text-lg">No packages found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map(pkg => {
              const tn = getTrack(pkg);
              const cs = canSubmit(pkg);
              const desc = pkg.description || pkg.itemDescription || "Merchandise";
              const amt = pkg.freight || pkg.totalAmount || pkg.total_amount || 0;
              return (
                <div key={tn} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  {/* Header with tracking number and status */}
                  <div className="flex items-center gap-3 px-6 pt-6 pb-3 text-[#0f4d8a]">
                    <div className="p-2.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl shrink-0">{serviceIcon(pkg.serviceMode)}</div>
                    <span className="font-bold text-lg text-gray-900 truncate" title={tn}>{tn}</span>
                  </div>

                  {/* Date and relative time */}
                  <div className="flex items-center justify-between px-6 pb-3 text-sm text-gray-500">
                    <span className="font-medium">{fmtDate(pkg.received_date || pkg.dateReceived)}</span>
                    {(pkg.received_date || pkg.dateReceived) && <span className="text-gray-400 text-xs">({relDate(pkg.received_date || pkg.dateReceived || "")})</span>}
                  </div>

                  {/* Status badge */}
                  <div className="px-6 pb-3">
                    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${statusClasses(pkg.invoiceStatus)}`}>
                      {statusIcon(pkg.invoiceStatus)}{statusLabel(pkg.invoiceStatus)}
                    </span>
                  </div>

                  {/* Package details */}
                  <div className="px-6 pb-4 space-y-2 text-sm text-gray-700 flex-1">
                    <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-gray-400 shrink-0"/><span className="font-semibold">{pkg.shipper || pkg.merchant || "UNKNOWN"}</span></div>
                    <div className="flex items-center gap-2 text-gray-500"><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{desc}</span></div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                      {pkg.weight > 0 && <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5"/>{pkg.weight} lbs</span>}
                      {pkg.pieces && pkg.pieces > 1 && <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5"/>{pkg.pieces} pcs</span>}
                      {pkg.warehouseLocation && <span className="flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5"/>{pkg.warehouseLocation}</span>}
                    </div>
                    {pkg.userCode && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1"><Building className="h-3.5 w-3.5 shrink-0"/><span>{pkg.userCode}</span></div>
                    )}
                  </div>

                  {/* Amount */}
                  {amt > 0 && (
                    <div className="mx-6 mb-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg text-sm flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Freight:</span>
                      <span className="font-bold text-gray-900 text-base">{CurrencyService.format(amt, pkg.pricePaidCurrency || 'USD')}</span>
                    </div>
                  )}

                  {/* Price paid */}
                  {pkg.pricePaid > 0 && (
                    <div className="mx-6 mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg text-sm flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Price Paid:</span>
                      <span className="font-bold text-gray-900 text-base">{CurrencyService.format(pkg.pricePaid, pkg.pricePaidCurrency || 'USD')}</span>
                    </div>
                  )}

                  {/* Previously uploaded files */}
                  {pkg.invoiceFiles && pkg.invoiceFiles.length > 0 && (
                    <div className="px-6 pb-3">
                      <p className="text-xs text-gray-400 mb-1.5">{pkg.invoiceFiles.length} file(s) uploaded</p>
                      <div className="flex gap-1.5">{pkg.invoiceFiles.slice(0,3).map((f,i)=>{
                        const isObj = typeof f === 'object' && (f as any).url;
                        const fn = isObj ? (f as any).filename : String(f).split('/').pop()||'file';
                        const url = isObj ? (f as any).url : String(f);
                        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-gray-500 hover:text-blue-600 transition-colors" title={fn}><FileText className="h-4 w-4"/></a>;
                      })}</div>
                    </div>
                  )}

                  {/* Submitted at */}
                  {pkg.invoiceSubmittedAt && (
                    <div className="px-6 pb-2 text-xs text-gray-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/>Submitted: {fmtDate(pkg.invoiceSubmittedAt)}</div>
                  )}

                  {/* Action button */}
                  <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3 bg-gray-50 mt-auto">
                    {cs ? (
                      <>
                        <button onClick={()=>setUploadPkg(pkg)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl font-semibold hover:shadow-lg text-sm transition-all">
                          <Upload className="h-4 w-4"/>Upload Invoice
                        </button>
                        {(pkg.invoiceUploaded || pkg.invoiceFiles && pkg.invoiceFiles.length > 0) && (
                          <button 
                            onClick={() => handleDeleteInvoice(pkg)}
                            disabled={deleting}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex-1 text-center text-sm text-green-600 font-semibold flex items-center justify-center gap-2 py-2"><CheckCircle className="h-5 w-5"/>{statusLabel(pkg.invoiceStatus)}</div>
                        {(pkg.invoiceUploaded || pkg.invoiceFiles && pkg.invoiceFiles.length > 0) && (
                          <button 
                            onClick={() => handleDeleteInvoice(pkg)}
                            disabled={deleting}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        )}
                      </>
                    )}
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

      {uploadPkg && <UploadModal pkg={uploadPkg} onClose={()=>setUploadPkg(null)} onDone={()=>{setUploadPkg(null); load();}}/>}
    </div>
  );
}
