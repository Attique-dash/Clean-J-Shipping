"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Package,
  Search,
  Loader2,
  Plane,
  Ship,
  Truck,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  User,
  Scale,
  DollarSign,
  Hash,
  Building,
  Calendar,
  Percent,
  Receipt,
  Download,
  Printer,
  Mail,
  Tag,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

type UIPackage = {
  id?: string;
  _id?: string;
  tracking_number: string;
  trackingNumber?: string;
  description?: string;
  itemDescription?: string;
  status: string;
  weight?: string | number;
  weight_kg?: number;
  total_amount?: number;
  shipping_cost?: number;
  itemValueUsd?: number;
  dateReceived?: string;
  createdAt?: string;
  serviceMode?: "air" | "ocean" | "local";
  invoice_status?: string;
  paymentStatus?: string;
  shipper?: string;
  // billing info
  dutyPercent?: number;
  gctPercent?: number;
  usdValue?: number;
  freight?: number;
  processingFee?: number;
  badAddressFee?: number;
  storageFee?: number;
  // tracking info
  houseAwb?: string;
  trackingNum?: string;
  manifest?: string;
  branch?: string;
  merchant?: string;
  rateGroup?: string;
  commercialInvoice?: string;
  hsCode?: string;
  collection?: string;
};

type InvoiceRecord = {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalValue?: number;
  currency?: string;
  status?: string;
  amountPaid?: number;
  documentUrl?: string;
};

const PAGE_SIZE = 8;

/* ─── Status helpers ─── */
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    received: "Received",
    processing: "Processing",
    pending: "Pending",
    in_transit: "In Transit",
    shipped: "Shipped",
    ready_for_pickup: "Ready for Pickup",
    ready_for_delivery: "Ready for Delivery",
    collected: "Collected",
    Collected: "Collected",
    delivered: "Delivered",
    "at local sorting area": "At Local Sorting Area",
    at_local_sorting_area: "At Local Sorting Area",
  };
  return map[s] || (s ? String(s).replace(/_/g, " ") : "Unknown");
}

function getStatusClasses(s: string) {
  const key = (s || "").toLowerCase();
  if (key === "collected" || key === "delivered") return "bg-green-500 text-white";
  if (key === "at local sorting area" || key === "at_local_sorting_area")
    return "bg-orange-400 text-white";
  if (key === "in_transit" || key === "shipped") return "bg-blue-500 text-white";
  if (key === "ready_for_pickup" || key === "ready_for_delivery")
    return "bg-orange-500 text-white";
  if (key === "processing") return "bg-yellow-500 text-white";
  return "bg-gray-400 text-white";
}

/* ─── Package Detail Modal ─── */
function PackageDetailModal({
  pkg,
  onClose,
  onOpenInvoice,
}: {
  pkg: UIPackage;
  onClose: () => void;
  onOpenInvoice: (pkg: UIPackage) => void;
}) {
  const totalAmount =
    pkg.total_amount ||
    pkg.shipping_cost ||
    pkg.freight ||
    0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              AWB/BL: {pkg.houseAwb || pkg.tracking_number}/{" "}
              <span className="text-gray-700">${totalAmount.toFixed(2)}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top row: identity + status + totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Identity card */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">
                  {pkg.houseAwb || pkg.tracking_number}
                </span>
                <Package className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400" />
                <span>{pkg.shipper || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Plane className="h-4 w-4 text-gray-400" />
                <span>Air Standard</span>
              </div>
            </div>

            {/* Status card */}
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              {pkg.status &&
              (pkg.status.toLowerCase() === "collected" ||
                pkg.status.toLowerCase() === "delivered") ? (
                <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg w-full justify-center">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">No issues with package.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-orange-400 text-white px-4 py-3 rounded-lg w-full justify-center">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">{statusLabel(pkg.status)}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sub-Total:</span>
                <span className="font-medium">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount:</span>
                <span className="text-green-600 font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Package Info + Billing Info + Tracking Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Package Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Package Info
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Branch" value={pkg.branch || "Main Branch"} />
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Manifest" value={pkg.manifest || pkg.dateReceived ? new Date(pkg.manifest || pkg.dateReceived || "").toLocaleDateString() : "—"} />
                <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Collection" value={pkg.collection || "—"} />
                <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Merchant" value={pkg.merchant || pkg.shipper || "UNKNOWN"} />
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Description" value={pkg.description || pkg.itemDescription || "Merchandise"} />
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="HS Code" value={pkg.hsCode || "—"} />
                <InfoRow icon={<Scale className="h-3.5 w-3.5" />} label="Rate Group" value={pkg.rateGroup || "Standard Rate"} />
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Commercial" value={pkg.commercialInvoice || "NO"} />
              </div>
            </div>

            {/* Billing Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Billing Info
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow
                  icon={<Scale className="h-3.5 w-3.5" />}
                  label="Weight/Billable"
                  value={`${pkg.weight_kg || pkg.weight || 0} / 1`}
                />
                <InfoRow
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label="Duty %"
                  value={`${pkg.dutyPercent ?? 20}%`}
                />
                <InfoRow
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label="GCT %"
                  value={`${pkg.gctPercent ?? 15}%`}
                />
                <InfoRow
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  label="USD Value"
                  value={`$${pkg.usdValue || pkg.itemValueUsd || 25}.00`}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Our Charges</p>
                <div className="space-y-1.5 text-sm">
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Freight" value={`$${(pkg.freight || pkg.shipping_cost || totalAmount).toFixed(2)}`} />
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Processing Fee" value={`$${(pkg.processingFee || 0).toFixed(2)}`} />
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Bad Address Fee" value={`$${(pkg.badAddressFee || 0).toFixed(2)}`} />
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Storage Fee" value={`$${(pkg.storageFee || 0).toFixed(2)}`} />
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                Tracking Info
              </h3>
              {/* Collected status bar */}
              <div
                className={`text-center py-2 rounded-lg text-sm font-semibold mb-3 ${getStatusClasses(pkg.status)}`}
              >
                {statusLabel(pkg.status)}
              </div>
              <div className="space-y-2 text-sm">
                <InfoRow
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="House AWB"
                  value={pkg.houseAwb || pkg.tracking_number}
                />
                <InfoRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Tracking #"
                  value={pkg.trackingNum || pkg.tracking_number}
                  mono
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => onOpenInvoice(pkg)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Receipt className="h-4 w-4" />
              View Invoice
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Invoice / Receipt Modal ─── */
function InvoiceModal({
  pkg,
  onClose,
}: {
  pkg: UIPackage;
  onClose: () => void;
}) {
  const totalAmount = pkg.total_amount || pkg.shipping_cost || pkg.freight || 0;
  const invoiceNumber = Math.floor(400000 + Math.random() * 99999); // fallback display number
  const today = new Date();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Receipt / Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <Plane className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm">Clean J Shipping</span>
              </div>
              <p className="text-xs text-gray-600">700 NW 57 Place</p>
              <p className="text-xs text-gray-600">Ft. Lauderdale, FL 33309</p>
              <p className="text-xs text-gray-600">(876) 578-5945</p>
              <p className="text-xs text-gray-600">info@cleanshipping.com</p>
              <p className="text-xs text-blue-600">cleanshipping.com</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-gray-900 text-base">PACKAGE INVOICE</p>
              <p className="font-semibold text-gray-800">{invoiceNumber}</p>
              <p className="text-xs text-gray-500">
                {today.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                , {today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
              <p className="text-xs text-gray-500">Branch: Main Branch</p>
              <p className="text-xs text-gray-500">Staff: Support Team</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Customer:</p>
              <p className="text-sm text-gray-800">{pkg.shipper || "Customer"}</p>
              <p className="text-xs text-gray-500 mt-1">Main Branch</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
            </div>
          </div>

          {/* Invoice table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">House AWB#</th>
                <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">Information</th>
                <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">Our Fees</th>
                <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">Govt Fees</th>
                <th className="text-right px-2 py-2 text-gray-600 font-semibold border border-gray-200">Discount</th>
                <th className="text-right px-2 py-2 text-gray-600 font-semibold border border-gray-200">Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-3 border border-gray-200 align-top">
                  <p className="font-semibold text-gray-900">{pkg.houseAwb || pkg.tracking_number}</p>
                  <p className="text-gray-500 mt-1">{pkg.merchant || pkg.shipper || "UNKNOWN"}</p>
                </td>
                <td className="px-2 py-3 border border-gray-200 align-top">
                  <p><span className="text-gray-500">Weight:</span> {pkg.weight_kg || pkg.weight || 1} Lbs</p>
                  <p><span className="text-gray-500">USD Value:</span> ${pkg.usdValue || pkg.itemValueUsd || 25}.00</p>
                </td>
                <td className="px-2 py-3 border border-gray-200 align-top">
                  <p><span className="text-gray-500">Freight:</span> ${totalAmount.toFixed(2)}</p>
                  <p><span className="text-gray-500">Storage:</span> $0.00</p>
                </td>
                <td className="px-2 py-3 border border-gray-200 align-top text-gray-600">
                  <p>Proc fee: <span>$0.00</span></p>
                  <p>Bad Address: <span>$0.00</span></p>
                  <p>Duty: <span>$0.00</span></p>
                  <p>SCF: <span>$0.00</span></p>
                  <p>ENVL: <span>$0.00</span></p>
                  <p>CAF: <span>$0.00</span></p>
                  <p>Stamp: <span>$0.00</span></p>
                  <p>GCT: <span>$0.00</span></p>
                  <p>Other: <span>$0.00</span></p>
                  <p className="mt-1 text-gray-700">{pkg.description || pkg.itemDescription || "Merchandise"}</p>
                </td>
                <td className="px-2 py-3 border border-gray-200 align-top text-right">$0.00</td>
                <td className="px-2 py-3 border border-gray-200 align-top text-right font-semibold">${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer: thank you + payment details + totals */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="col-span-1">
              <p className="font-bold text-gray-900 text-sm">Thank you for your business!</p>
              <p className="text-xs text-gray-500 mt-1">Please print or save this for your records</p>
            </div>
            <div className="col-span-1">
              <p className="font-semibold text-gray-800 text-sm mb-1">Payment Details</p>
              <p className="text-xs text-gray-600">Cash: ${totalAmount.toFixed(2)}</p>
            </div>
            <div className="col-span-1 text-right">
              <p className="text-xs text-gray-600">Sub-Total: <span className="font-semibold">${totalAmount.toFixed(2)}</span></p>
              <p className="text-xs text-gray-600">Total: JMD<span className="font-semibold">${totalAmount.toFixed(2)}</span></p>
              <p className="text-xs text-gray-600">Payment: <span className="font-semibold">${totalAmount.toFixed(2)}</span></p>
              <p className="text-xs text-gray-600">Balance: <span className="font-semibold text-red-500">$0.00</span></p>
            </div>
          </div>
        </div>

        {/* Modal action buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Mail className="h-4 w-4" />
            Email Invoice
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
            <Printer className="h-4 w-4" />
            Print Invoice
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <Download className="h-4 w-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Small helper row ─── */
function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-500 flex items-center gap-1 shrink-0">
        {icon}
        {label}:
      </span>
      <span
        className={`text-gray-800 text-right break-all ${
          mono ? "font-mono text-xs" : "font-medium"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CustomerPackagesPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();

  const [items, setItems] = useState<UIPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modal state
  const [detailPkg, setDetailPkg] = useState<UIPackage | null>(null);
  const [invoicePkg, setInvoicePkg] = useState<UIPackage | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/packages", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");

      const rawList: any[] =
        Array.isArray(data?.data?.packages)
          ? data.data.packages
          : Array.isArray(data?.packages)
          ? data.packages
          : [];

      const list: UIPackage[] = rawList.map((pkg: any) => ({
        ...pkg,
        tracking_number: pkg.trackingNumber || pkg.tracking_number || pkg._id,
        weight: pkg.weight || pkg.weight_kg,
        weight_kg:
          typeof pkg.weight_kg === "number"
            ? pkg.weight_kg
            : typeof pkg.weight === "number"
            ? pkg.weight
            : parseFloat(pkg.weight) || 0,
        total_amount: pkg.totalAmount || pkg.total_amount,
        shipping_cost: pkg.shippingCost || pkg.shipping_cost,
        dateReceived: pkg.dateReceived || pkg.createdAt,
        merchant: pkg.shipper || pkg.merchant || "UNKNOWN",
        houseAwb: pkg.trackingNumber || pkg.tracking_number,
        trackingNum: pkg.trackingNumber || pkg.tracking_number,
        branch: pkg.warehouseLocation || pkg.branch || "Main Branch",
        usdValue: pkg.itemValueUsd || pkg.pricePaid || 25,
        freight: pkg.shippingCost || pkg.shipping_cost || pkg.totalAmount || 0,
      }));

      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) load();
    else if (session === null) setLoading(false);
  }, [session]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      p.tracking_number.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.itemDescription || "").toLowerCase().includes(q) ||
      (p.merchant || "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function getServiceIcon(mode?: string) {
    switch ((mode || "").toLowerCase()) {
      case "air": return <Plane className="h-5 w-5" />;
      case "ocean":
      case "sea": return <Ship className="h-5 w-5" />;
      case "local": return <Truck className="h-5 w-5" />;
      default: return <Plane className="h-5 w-5" />;
    }
  }

  function formatDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const totalAmount = (p: UIPackage) =>
    p.total_amount || p.shipping_cost || p.freight || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading packages…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your packages</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-[#0f4d8a] text-white rounded hover:bg-[#1e6bb8]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {filtered.length} Package{filtered.length !== 1 ? "s" : ""}
            </h1>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
                placeholder="Search tracking number, merchant, or description…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:outline-none text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="in_transit">In Transit</option>
              <option value="collected">Collected</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Pagination top */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white disabled:opacity-40"
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-sm border rounded ${
                  currentPage === p
                    ? "bg-[#0f4d8a] text-white border-[#0f4d8a]"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white disabled:opacity-40"
            >
              »
            </button>
            {/* Filter icon button placeholder */}
            <button className="ml-auto p-2 border border-gray-300 rounded bg-white">
              <Search className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Package Cards — reference grid: 4 columns desktop */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No packages found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginated.map((pkg) => {
              const amt = totalAmount(pkg);
              const trackNum = pkg.tracking_number;

              return (
                <div
                  key={trackNum}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card header row: icon + tracking + amount */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2 text-[#0f4d8a]">
                      {getServiceIcon(pkg.serviceMode)}
                      <span className="font-bold text-sm text-gray-900">
                        {trackNum}
                      </span>
                    </div>
                    {amt > 0 && (
                      <span className="font-bold text-gray-900 text-sm">
                        ${amt.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-500">
                    <span>{formatDate(pkg.dateReceived || pkg.createdAt)}</span>
                    {pkg.dateReceived && (
                      <span className="text-gray-400">
                        ({getRelativeDate(pkg.dateReceived)})
                      </span>
                    )}
                  </div>

                  {/* Status badge — full width green/orange pill */}
                  <div className="px-4 pb-3">
                    <div
                      className={`w-full text-center py-1.5 rounded text-xs font-semibold ${getStatusClasses(
                        pkg.status
                      )}`}
                    >
                      {statusLabel(pkg.status)}
                    </div>
                  </div>

                  {/* LBS / VAL row */}
                  <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-700">
                    <span>
                      <span className="font-semibold">LBS:</span>{" "}
                      {typeof pkg.weight_kg === "number"
                        ? Math.round(pkg.weight_kg)
                        : pkg.weight || 1}
                    </span>
                    <span>
                      <span className="font-semibold">VAL:</span> $
                      {(pkg.usdValue || pkg.itemValueUsd || 25).toFixed(2)}
                    </span>
                  </div>

                  {/* Merchant + tracking detail */}
                  <div className="px-4 pb-1 text-xs text-gray-700 font-medium">
                    {pkg.merchant || pkg.shipper || "UNKNOWN"}
                  </div>
                  {pkg.trackingNum && pkg.trackingNum !== trackNum && (
                    <div className="px-4 pb-1 text-xs text-gray-500">
                      TRK#: {pkg.trackingNum.length > 20
                        ? pkg.trackingNum.slice(0, 20) + "…"
                        : pkg.trackingNum}
                    </div>
                  )}
                  <div className="px-4 pb-3 text-xs text-gray-600">
                    {pkg.description || pkg.itemDescription || "Merchandise"}
                  </div>

                  {/* Action icon buttons */}
                  <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
                    {/* Box icon → package detail popup */}
                    <button
                      onClick={() => setDetailPkg(pkg)}
                      title="View package details"
                      className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <Package className="h-4 w-4" />
                    </button>

                    {/* Tag / receipt icon → invoice popup */}
                    <button
                      onClick={() => setInvoicePkg(pkg)}
                      title="View invoice / receipt"
                      className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                    </button>

                    {/* Pay button if not collected */}
                    {pkg.status?.toLowerCase() !== "collected" &&
                      pkg.status?.toLowerCase() !== "delivered" && (
                        <Link
                          href={`/customer/bills`}
                          title="Pay bill"
                          className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-lg text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 transition-colors ml-auto"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Link>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`e${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium border transition-colors ${
                      currentPage === p
                        ? "bg-[#0f4d8a] text-white border-[#0f4d8a]"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Package Detail Modal */}
      {detailPkg && (
        <PackageDetailModal
          pkg={detailPkg}
          onClose={() => setDetailPkg(null)}
          onOpenInvoice={(p) => {
            setDetailPkg(null);
            setInvoicePkg(p);
          }}
        />
      )}

      {/* Invoice Modal */}
      {invoicePkg && (
        <InvoiceModal
          pkg={invoicePkg}
          onClose={() => setInvoicePkg(null)}
        />
      )}
    </div>
  );
}

/* ─── Relative date helper ─── */
function getRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}