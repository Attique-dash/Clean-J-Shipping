"use client";

import { useEffect, useState, useRef } from "react";
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
  AlertCircle,
  MapPin,
  User,
  Scale,
  Tag,
  Hash,
  Building,
  Calendar,
  Percent,
  Receipt,
  Download,
  Printer,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPackageAmount } from "@/lib/package-format";
import { CurrencyService } from '@/lib/currency-service';

type UIPackage = {
  id?: string;
  _id?: string;
  tracking_number: string;
  trackingNumber?: string;
  description?: string;
  itemDescription?: string;
  status: string;
  weight?: number;
  weight_kg?: number;
  total_amount?: number;
  totalAmount?: number;
  shipping_cost?: number;
  itemValueUsd?: number;
  usdValue?: number;
  dateReceived?: string;
  createdAt?: string;
  serviceMode?: "air" | "ocean" | "local";
  invoice_status?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  amountPaid?: number;
  pricePaidCurrency?: string;
  paymentCurrency?: string;
  amountPaidCurrency?: string;
  currency?: string;
  shipper?: string;
  merchant?: string;
  dutyPercent?: number;
  gctPercent?: number;
  freight?: number;
  processingFee?: number;
  badAddressFee?: number;
  storageFee?: number;
  houseAwb?: string;
  trackingNum?: string;
  manifest?: string;
  branch?: string;
  warehouseLocation?: string;
  warehouse_location?: string;
  rateGroup?: string;
  commercialInvoice?: string;
  hsCode?: string;
  collection?: string;
  billingInvoiceId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  userCode?: string;
  pieces?: number;
  entryDate?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  regularCharge?: number;
  customCharge?: number;
  chargeCurrency?: string;
};

const PAGE_SIZE = 8;

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    // Legacy status labels (for backward compatibility)
    received: "Package Received",
    pending: "Pending",
    shipped: "In Transit",
    collected: "Collected",
    Collected: "Collected",
    "at local sorting area": "At Local Sorting Area",
    at_local_sorting_area: "At Local Sorting Area",
    // Warehouse/transit status labels from API
    "0": "Package Received",
    "1": "At Warehouse",
    "2": "Processing",
    "3": "Ready for Shipment",
    "4": "In Transit",
    "5": "Arrived at Destination",
    "6": "Customs Clearance",
    "7": "Ready for Pickup / Delivery",
    "8": "Out for Delivery",
    "9": "Delivered",
    "10": "Picked Up",
    "package_received": "Package Received",
    "at_warehouse": "At Warehouse",
    "processing": "Processing",
    "ready_for_shipment": "Ready for Shipment",
    "in_transit": "In Transit",
    "arrived_at_destination": "Arrived at Destination",
    "customs_clearance": "Customs Clearance",
    "ready_for_pickup": "Ready for Pickup / Delivery",
    "ready_for_delivery": "Ready for Pickup / Delivery",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "delivered_to_customer": "Delivered",
    "picked_up": "Picked Up",
    "picked_up_by_customer": "Picked Up",
  };
  return map[s] || (s ? String(s).replace(/_/g, " ") : "Unknown");
}

function getStatusClasses(s: string) {
  const key = (s || "").toLowerCase();
  // 0: Package Received - Light Gray
  if (key === "0" || key === "package_received") return "bg-gray-400 text-white";
  // 1: At Warehouse - Medium Gray
  if (key === "1" || key === "at_warehouse" || key === "at warehouse") return "bg-gray-500 text-white";
  // 2: Processing - Yellow
  if (key === "2" || key === "processing" || key === "in_processing") return "bg-yellow-500 text-white";
  // 3: Ready for Shipment - Cyan
  if (key === "3" || key === "ready_for_shipment" || key === "ready_to_ship") return "bg-cyan-500 text-white";
  // 4: In Transit - Blue
  if (key === "4" || key === "in_transit" || key === "shipped" || key === "in transit to local port" || key === "delivered to airport") return "bg-blue-500 text-white";
  // 5: Arrived at Destination - Indigo
  if (key === "5" || key === "arrived_at_destination") return "bg-indigo-500 text-white";
  // 6: Customs Clearance - Purple
  if (key === "6" || key === "customs_clearance" || key === "customs_cleared" || key === "at local port") return "bg-purple-500 text-white";
  // 7: Ready for Pickup/Delivery - Orange
  if (key === "7" || key === "ready_for_pickup" || key === "ready_for_delivery") return "bg-orange-400 text-white";
  // 8: Out for Delivery - Darker Orange
  if (key === "8" || key === "out_for_delivery") return "bg-orange-500 text-white";
  // 9: Delivered - Green
  if (key === "9" || key === "delivered" || key === "delivered_to_customer") return "bg-green-500 text-white";
  // 10: Picked Up - Emerald
  if (key === "10" || key === "picked_up" || key === "picked_up_by_customer" || key === "collected") return "bg-emerald-600 text-white";
  return "bg-gray-400 text-white";
}

function formatDisplayAmount(amount: number, currencyCode?: string) {
  return formatPackageAmount(amount, currencyCode?.toUpperCase() || "USD");
}

function InfoRow({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-gray-500 flex items-center gap-1 shrink-0 text-sm">{icon}{label}:</span>
      <span className={`text-gray-800 text-right break-all text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}>{value ?? "—"}</span>
    </div>
  );
}

/* ─── Package Detail Modal ─── */
function PackageDetailModal({ pkg, onClose, onOpenInvoice }: { pkg: UIPackage; onClose: () => void; onOpenInvoice: (pkg: UIPackage) => void }) {
  const totalAmount = pkg.totalAmount || pkg.total_amount || pkg.freight || pkg.shipping_cost || 0;
  const amountPaid = pkg.amountPaid || 0;
  const itemValue = pkg.itemValueUsd || pkg.usdValue || 0;
  const balance = Math.max(0, totalAmount - amountPaid);
  const currency = pkg.pricePaidCurrency || "USD";
  const formattedTotal = formatDisplayAmount(totalAmount, currency);
  const formattedItemValue = formatDisplayAmount(itemValue, currency);
  const formattedAmountPaid = formatDisplayAmount(amountPaid, currency);
  const formattedBalance = formatDisplayAmount(balance, currency);
  const dims = pkg.dimensions || { length: 0, width: 0, height: 0, unit: "cm" };
  const dimStr = `${dims.length || 0} × ${dims.width || 0} × ${dims.height || 0} ${dims.unit || "cm"}`;
  const branchName = pkg.warehouseLocation || pkg.warehouse_location || pkg.branch || "Main Branch";
  const entryDateStr = pkg.entryDate || pkg.dateReceived
    ? new Date(pkg.entryDate || pkg.dateReceived || "").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">AWB/BL: {pkg.houseAwb || pkg.tracking_number}/<span className="text-gray-500 ml-1">{formattedTotal}</span></h2>
            <p className="text-sm text-gray-500 mt-0.5">Package tracking number: {pkg.tracking_number}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="font-semibold text-gray-900 text-sm">{pkg.houseAwb || pkg.tracking_number}</span><Package className="h-5 w-5 text-gray-400" /></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><User className="h-4 w-4 text-gray-400" /><span>{pkg.shipper || pkg.merchant || "—"}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Plane className="h-4 w-4 text-gray-400" /><span>Air Standard</span></div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              {pkg.status && (pkg.status.toLowerCase() === "collected" || pkg.status.toLowerCase() === "delivered") ? (
                <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg w-full justify-center"><CheckCircle className="h-5 w-5" /><span className="font-semibold">No issues with package.</span></div>
              ) : (
                <div className="flex items-center gap-2 bg-orange-400 text-white px-4 py-3 rounded-lg w-full justify-center"><AlertCircle className="h-5 w-5" /><span className="font-semibold">{statusLabel(pkg.status)}</span></div>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Sub-Total:</span><span className="font-medium">{formattedTotal}</span></div>
              <div className="flex justify-between text-sm"><span className="text-green-600">Discount:</span><span className="text-green-600 font-medium">{formatDisplayAmount(0, currency)}</span></div>
              <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total:</span><span>{formattedTotal}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Package Info</h3>
              <div className="space-y-0.5">
                <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Branch" value={branchName} />
                <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Entry Date" value={entryDateStr} />
                <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Collection" value={pkg.collection || "—"} />
                <InfoRow icon={<Building className="h-3.5 w-3.5" />} label="Merchant" value={pkg.merchant || pkg.shipper || "UNKNOWN"} />
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Description" value={pkg.description || pkg.itemDescription || "Merchandise"} />
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="HS Code" value={pkg.hsCode || "—"} />
                <InfoRow icon={<Scale className="h-3.5 w-3.5" />} label="Rate Group" value={pkg.rateGroup || "Standard Rate"} />
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Commercial" value={pkg.commercialInvoice || "NO"} />
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Pieces" value={String(pkg.pieces || 1)} />
                <InfoRow icon={<Scale className="h-3.5 w-3.5" />} label="Dimensions (L×W×H)" value={dimStr} />
                <InfoRow icon={<Plane className="h-3.5 w-3.5" />} label="Service mode" value={pkg.serviceMode ? pkg.serviceMode.charAt(0).toUpperCase() + pkg.serviceMode.slice(1) : "—"} />
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Customer Info</h3>
              <div className="space-y-0.5">
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Customer" value={pkg.customerName || "—"} />
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={pkg.customerEmail || "—"} />
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Phone" value={pkg.customerPhone || "—"} />
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Mailbox / User code" value={pkg.userCode || "—"} />
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Payment Info</h3>
              <div className="space-y-0.5">
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Currency" value={currency} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Item Value" value={formattedItemValue} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Total Due" value={formattedTotal} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Amount Paid" value={formattedAmountPaid} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Balance" value={formattedBalance} />
                <InfoRow icon={<Receipt className="h-3.5 w-3.5" />} label="Invoice Status" value={<span className={`capitalize font-semibold ${pkg.invoiceStatus === 'submitted' || pkg.invoiceStatus === 'approved' ? 'text-green-600' : pkg.invoiceStatus === 'rejected' ? 'text-red-600' : 'text-orange-600'}`}>{pkg.invoiceStatus || pkg.invoice_status || "Pending"}</span>} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Payment Status" value={<span className={`capitalize font-semibold ${pkg.paymentStatus === 'paid' ? 'text-green-600' : pkg.paymentStatus === 'partially_paid' ? 'text-yellow-600' : 'text-orange-600'}`}>{pkg.paymentStatus || "Pending"}</span>} />
                <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Payment Method" value={<span className="capitalize">{pkg.paymentMethod || "Cash"}</span>} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100 border-t pt-3 mt-3">Tracking Info</h3>
              <div className={`text-center py-2 rounded-lg text-sm font-semibold mb-2 ${getStatusClasses(pkg.status)}`}>{statusLabel(pkg.status)}</div>
              <div className="space-y-0.5">
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="House AWB" value={pkg.houseAwb || pkg.tracking_number} mono />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Tracking #" value={pkg.trackingNum || pkg.tracking_number} mono />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => onOpenInvoice(pkg)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"><Receipt className="h-4 w-4" />View Invoice</button>
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"><X className="h-4 w-4" />Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Invoice / Receipt Modal ─── */
function InvoiceModal({ pkg, onClose, userEmail }: { pkg: UIPackage; onClose: () => void; userEmail?: string }) {
  type InvoiceItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
    taxAmount: number;
    total: number;
  };

  type InvoicePayload = {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    currency: string;
    subtotal: number;
    taxTotal: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
    trackingNumber: string;
    customer: {
      name: string;
      email?: string;
      address?: string;
      phone?: string;
    };
    items: InvoiceItem[];
    paymentHistory?: Array<{
      amount: number;
      date: string;
      method: string;
      reference?: string;
    }>;
  };

  const [invoiceData, setInvoiceData] = useState<InvoicePayload | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const currencyCode = invoiceData?.currency || pkg.chargeCurrency || pkg.pricePaidCurrency || pkg.paymentCurrency || pkg.amountPaidCurrency || pkg.currency || 'JMD';
  const formatMoney = (value: number) => CurrencyService.format(value, currencyCode.toUpperCase());
  const invoiceNumber = invoiceData?.invoiceNumber || `INV-${new Date().getFullYear()}-XXXX`;
  const issueDate = invoiceData?.issueDate ? new Date(invoiceData.issueDate) : new Date();
  const dueDate = invoiceData?.dueDate ? new Date(invoiceData.dueDate) : new Date();
  const invoiceTotalAmount = invoiceData?.total ?? ((pkg.regularCharge || 0) + (pkg.customCharge || 0));
  const amountPaid = invoiceData?.amountPaid ?? pkg.amountPaid ?? 0;
  const balanceDue = invoiceData?.balanceDue ?? Math.max(0, invoiceTotalAmount - amountPaid);
  const displayedSubtotal = invoiceData?.subtotal ?? invoiceTotalAmount;
  const displayedTotal = invoiceData?.total ?? invoiceTotalAmount;
  const paymentMethod = invoiceData?.paymentHistory?.[0]?.method || pkg.paymentMethod || 'Cash';

  useEffect(() => {
    if (!pkg.billingInvoiceId) {
      setInvoiceData(null);
      setInvoiceError('No invoice linked to this package.');
      setInvoiceLoading(false);
      return;
    }

    let canceled = false;
    setInvoiceLoading(true);
    setInvoiceError(null);
    setInvoiceData(null);

    fetch(`/api/customer/invoices/${pkg.billingInvoiceId}/download`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((data) => {
        if (canceled) return;
        if (data?.invoice) {
          setInvoiceData(data.invoice as InvoicePayload);
        } else {
          setInvoiceError('Failed to load invoice details.');
        }
      })
      .catch((error) => {
        if (canceled) return;
        setInvoiceError(error instanceof Error ? error.message : 'Unable to load invoice');
      })
      .finally(() => {
        if (!canceled) setInvoiceLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [pkg.billingInvoiceId]);

  const handlePrint = () => {
    const el = invoiceRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Invoice ${invoiceNumber}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}h2,h3{margin:0 0 8px 0}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Invoice Request - ${pkg.houseAwb || pkg.tracking_number}`,
          message: `Please send me the invoice for package ${pkg.houseAwb || pkg.tracking_number}. Invoice amount: ${formatMoney(invoiceTotalAmount)}. Email: ${userEmail || 'N/A'}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      alert('Invoice email request sent successfully!');
    } catch {
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const feeItems = invoiceData?.items?.filter((item) => /freight|shipping|storage|duty|customs/i.test(item.description)) || [];
  const otherItems = invoiceData?.items?.filter((item) => !/freight|shipping|storage|duty|customs/i.test(item.description)) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Receipt / Invoice</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6" ref={invoiceRef}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"><Plane className="h-4 w-4 text-white" /></div>
                <span className="font-bold text-gray-900 text-sm">Clean J Shipping</span>
              </div>
              <p className="text-xs text-gray-600">700 NW 57 Place</p>
              <p className="text-xs text-gray-600">Ft. Lauderdale, FL 33309</p>
              <p className="text-xs text-gray-600">(876) 578-5945</p>
              <p className="text-xs text-blue-600">cleanjshipping.com</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-gray-900 text-base">PACKAGE INVOICE</p>
              <p className="font-semibold text-gray-800">{invoiceNumber}</p>
              <p className="text-xs text-gray-500">{issueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-xs text-gray-500">Due: {dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-xs text-gray-500">Branch: {pkg.branch || pkg.warehouseLocation || 'Main Branch'}</p>
            </div>
          </div>
          {invoiceLoading ? (
            <div className="py-12 text-center text-gray-500">Loading invoice details…</div>
          ) : invoiceError ? (
            <div className="py-6 px-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{invoiceError}</div>
          ) : (
            <>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">House AWB#</th>
                    <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">Information</th>
                    <th className="text-left px-2 py-2 text-gray-600 font-semibold border border-gray-200">Our Fees</th>
                    <th className="text-right px-2 py-2 text-gray-600 font-semibold border border-gray-200">Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-3 border border-gray-200 align-top">
                      <p className="font-semibold text-gray-900">{pkg.houseAwb || pkg.tracking_number}</p>
                      <p className="text-gray-500 mt-1">{pkg.merchant || pkg.shipper || 'UNKNOWN'}</p>
                    </td>
                    <td className="px-2 py-3 border border-gray-200 align-top">
                      <p><span className="text-gray-500">Weight:</span> {pkg.weight_kg || pkg.weight || 0} lbs</p>
                      <p><span className="text-gray-500">Value:</span> {formatMoney(invoiceData?.items?.find((item) => /item value/i.test(item.description))?.total ?? pkg.itemValueUsd ?? pkg.usdValue ?? 0)}</p>
                    </td>
                    <td className="px-2 py-3 border border-gray-200 align-top">
                      {feeItems.length > 0 ? (
                        feeItems.map((item, index) => (
                          <p key={index}><span className="text-gray-500">{item.description}:</span> {formatMoney(item.total)}</p>
                        ))
                      ) : (
                        <p className="text-gray-500">{formatMoney(displayedTotal)}</p>
                      )}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 align-top text-right font-semibold">{formatMoney(displayedTotal)}</td>
                  </tr>
                </tbody>
              </table>
              {otherItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full mt-4 text-xs border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-2 text-left text-gray-600 font-semibold border border-gray-200">Description</th>
                        <th className="px-2 py-2 text-right text-gray-600 font-semibold border border-gray-200">Qty</th>
                        <th className="px-2 py-2 text-right text-gray-600 font-semibold border border-gray-200">Unit</th>
                        <th className="px-2 py-2 text-right text-gray-600 font-semibold border border-gray-200">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherItems.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="px-2 py-2 border border-gray-200 text-gray-700">{item.description}</td>
                          <td className="px-2 py-2 border border-gray-200 text-right">{item.quantity}</td>
                          <td className="px-2 py-2 border border-gray-200 text-right">{formatMoney(item.unitPrice)}</td>
                          <td className="px-2 py-2 border border-gray-200 text-right">{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="col-span-1">
                  <p className="font-bold text-gray-900 text-sm">Thank you for your business!</p>
                  <p className="text-xs text-gray-500 mt-1">Please save this for your records</p>
                </div>
                <div className="col-span-1">
                  <p className="font-semibold text-gray-800 text-sm mb-1">Payment Details</p>
                  <p className="text-xs text-gray-600">{paymentMethod}: {formatMoney(amountPaid)}</p>
                  {invoiceData?.notes && <p className="text-xs text-gray-500 mt-1">{invoiceData.notes}</p>}
                </div>
                <div className="col-span-1 text-right">
                  <p className="text-xs text-gray-600">Sub-Total: <span className="font-semibold">{formatMoney(displayedSubtotal)}</span></p>
                  <p className="text-xs text-gray-600">Total: <span className="font-semibold">{formatMoney(displayedTotal)}</span></p>
                  <p className="text-xs text-gray-600">Paid: <span className="font-semibold">{formatMoney(amountPaid)}</span></p>
                  <p className="text-xs">Balance: <span className={`font-semibold ${balanceDue > 0 ? 'text-red-500' : 'text-gray-900'}`}>{formatMoney(balanceDue)}</span></p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={handleEmail} disabled={sendingEmail} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            <Mail className="h-4 w-4" />{sendingEmail ? "Sending..." : "Email Invoice"}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Printer className="h-4 w-4" />Print
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium">
            <X className="h-4 w-4" />Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
const CACHE_KEY = "customer_packages_cache";
const CACHE_TTL = 5 * 60 * 1000;

export default function CustomerPackagesPage() {
  const { data: session } = useSession();
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<UIPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [detailPkg, setDetailPkg] = useState<UIPackage | null>(null);
  const [invoicePkg, setInvoicePkg] = useState<UIPackage | null>(null);

  const load = async (forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) {
            setItems(data);
            setLastRefreshed(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      } catch {}
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/packages", { method: "GET", credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      const rawList: any[] = Array.isArray(data?.packages) ? data.packages : Array.isArray(data?.data?.packages) ? data.data.packages : [];
      const list: UIPackage[] = rawList.map((pkg: any) => ({
        ...pkg,
        tracking_number: pkg.tracking_number || pkg.trackingNumber || pkg._id || "",
        trackingNumber: pkg.trackingNumber || pkg.tracking_number || "",
        weight: typeof pkg.weight === "number" ? pkg.weight : parseFloat(String(pkg.weight || pkg.weight_kg || 0)),
        weight_kg: typeof pkg.weight_kg === "number" ? pkg.weight_kg : parseFloat(String(pkg.weight_kg || pkg.weight || 0)),
        totalAmount: pkg.totalAmount || pkg.total_amount || 0,
        total_amount: pkg.totalAmount || pkg.total_amount || 0,
        amountPaid: pkg.amountPaid || 0,
        itemValueUsd: pkg.itemValueUsd || pkg.usdValue || 0,
        usdValue: pkg.itemValueUsd || pkg.usdValue || 0,
        pricePaidCurrency: pkg.pricePaidCurrency || "USD",
        paymentStatus: pkg.paymentStatus || "pending",
        paymentMethod: pkg.paymentMethod || "cash",
        warehouseLocation: pkg.warehouseLocation || pkg.warehouse_location || pkg.branch || "Main Warehouse",
        branch: pkg.branch || pkg.warehouseLocation || "Main Branch",
        dateReceived: pkg.dateReceived || pkg.entryDate || pkg.createdAt,
        entryDate: pkg.entryDate || pkg.dateReceived,
        merchant: pkg.shipper || pkg.merchant || "UNKNOWN",
        houseAwb: pkg.houseAwb || pkg.tracking_number || pkg.trackingNumber,
        trackingNum: pkg.trackingNum || pkg.tracking_number || pkg.trackingNumber,
        freight: pkg.freight || pkg.shipping_cost || pkg.totalAmount || pkg.total_amount || 0,
        billingInvoiceId: pkg.billingInvoiceId,
      }));
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: list, timestamp: Date.now() })); } catch {}
      setItems(list);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session?.user) load(); else if (session === null) setLoading(false); }, [session]);
  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || (p.tracking_number || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.merchant || "").toLowerCase().includes(q) || (p.shipper || "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function getServiceIcon(mode?: string) {
    switch ((mode || "").toLowerCase()) {
      case "air": return <Plane className="h-5 w-5" />;
      case "ocean": case "sea": return <Ship className="h-5 w-5" />;
      case "local": return <Truck className="h-5 w-5" />;
      default: return <Plane className="h-5 w-5" />;
    }
  }

  function formatDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function getRelativeDate(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

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
          <Link href="/login" className="inline-block px-6 py-2 bg-[#0f4d8a] text-white rounded hover:bg-[#1e6bb8]">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><Package className="h-7 w-7" /></div>
              <div>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">{filtered.length} Package{filtered.length !== 1 ? "s" : ""}</h1>
                {lastRefreshed && <p className="text-gray-300-custom mt-1">Updated {lastRefreshed.toLocaleTimeString()}</p>}
              </div>
            </div>
            <button onClick={() => load(true)} className="group flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2.5 font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg text-sm"><RefreshCw className="h-4 w-4 transition-transform text-gray-600 group-hover:rotate-180" />Refresh</button>
          </div>
        </header>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm" placeholder="Search tracking number, merchant, or description…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:outline-none text-sm bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="in_transit">In Transit</option>
              <option value="collected">Collected</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center"><Package className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No packages found</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((pkg) => {
              const amt = pkg.totalAmount || pkg.total_amount || pkg.freight || 0;
              const currencyCode = pkg.pricePaidCurrency || pkg.paymentCurrency || pkg.amountPaidCurrency || pkg.currency || "USD";
              const trackNum = pkg.tracking_number;
              return (
                <div key={trackNum} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3 text-[#0f4d8a]">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">{getServiceIcon(pkg.serviceMode)}</div>
                    <span className="font-bold text-base text-gray-900 truncate max-w-[180px]" title={trackNum}>{trackNum}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3 text-sm text-gray-500">
                    <span className="font-medium">{formatDate(pkg.dateReceived || pkg.createdAt)}</span>
                    {(pkg.dateReceived || pkg.createdAt) && <span className="text-gray-400 text-xs">({getRelativeDate(pkg.dateReceived || pkg.createdAt || "")})</span>}
                  </div>
                  <div className="px-5 pb-4">
                    <div className={`w-full text-center py-2 rounded-lg text-sm font-semibold ${getStatusClasses(pkg.status)}`}>{statusLabel(pkg.status)}</div>
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3 text-sm text-gray-700">
                    <div className="flex items-center gap-1"><Scale className="h-4 w-4 text-gray-400" /><span className="font-semibold">{pkg.weight || pkg.weight_kg || 0} lbs</span></div>
                    <div className="font-semibold">{formatDisplayAmount(amt, currencyCode)}</div>
                  </div>
                  <div className="px-5 pb-2 text-sm text-gray-700 font-medium">{pkg.merchant || pkg.shipper || "UNKNOWN"}</div>
                  <div className="px-5 pb-4 text-sm text-gray-600">{pkg.description || pkg.itemDescription || "Merchandise"}</div>
                  <div className="border-t border-gray-100 px-5 py-4 flex items-center gap-3 bg-gray-50">
                    <button onClick={() => setDetailPkg(pkg)} title="View package details" className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors"><Package className="h-5 w-5" /></button>
                    <button onClick={() => setInvoicePkg(pkg)} title="View invoice" className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition-colors"><Tag className="h-5 w-5" /></button>
                    {pkg.status?.toLowerCase() !== "collected" && pkg.status?.toLowerCase() !== "delivered" && (
                      <Link href="/customer/bills" title="Pay bill" className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 transition-colors ml-auto"><CreditCard className="h-5 w-5" /></Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).reduce<(number | "…")[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, []).map((p, idx) => p === "…" ? (<span key={`e${idx}`} className="px-1 text-gray-400 text-sm">…</span>) : (<button key={p} onClick={() => setPage(p as number)} className={`h-9 w-9 rounded-lg text-sm font-medium border transition-colors ${currentPage === p ? "bg-[#0f4d8a] text-white border-[#0f4d8a]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      {detailPkg && <PackageDetailModal pkg={detailPkg} onClose={() => setDetailPkg(null)} onOpenInvoice={(p) => { setDetailPkg(null); setInvoicePkg(p); }} />}
      {invoicePkg && <InvoiceModal pkg={invoicePkg} onClose={() => setInvoicePkg(null)} userEmail={session?.user?.email || undefined} />}
    </div>
  );
}
