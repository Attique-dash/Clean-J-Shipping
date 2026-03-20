// src/app/customer/bills/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock,
  ExternalLink, CreditCard, RefreshCw, Loader2, TrendingUp,
  Download, X, ShoppingCart, Plus, Eye, Save, Lock, Unlock
} from "lucide-react";
import { PayPalProvider, PayPalPaymentButton } from "@/components/PayPalProvider";
import { toast } from "react-toastify";
import Link from "next/link";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";
import Loading from "@/components/Loading";

type Bill = {
  _id?: string;
  tracking_number: string;
  description?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  amount_due: number;
  payment_status: "submitted" | "reviewed" | "rejected" | "none" | "paid" | "overdue";
  document_url?: string;
  last_updated?: string;
  payment_method?: "cash" | "card" | "online" | "bank_transfer" | "other";
  payment_id?: string;
  due_payment?: number;
  paid_payment?: number;
  balance?: number;
};

export default function CustomerBillsPage() {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [processing, setProcessing] = useState(false);
  const [usePayPal, setUsePayPal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [savedCards, setSavedCards] = useState<Array<{ id: string; last4: string; brand: string; expiry: string; name: string }>>([]);
  const [selectedCard, setSelectedCard] = useState<{ id: string; last4: string; brand: string; expiry: string; name: string } | null>(null);
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency } = useCurrency();

  // Bills History State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [billCart, setBillCart] = useState<Set<string>>(new Set());
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showSavedPaymentModal, setShowSavedPaymentModal] = useState(false);

  // State for converted amounts
  const [convertedAmounts, setConvertedAmounts] = useState<Map<string, string>>(new Map());
  const [convertedTotalDue, setConvertedTotalDue] = useState<string>("");

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    firstName: "",
    lastName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    email: "",
    phone: "",
  });

  // Cart key helper
  const getBillCartKey = (bill: Bill) =>
    `${bill.tracking_number}-${bill.invoice_number || "doc"}`;

  // Add to cart function
  const handleAddToCart = (billId: string) => {
    setBillCart((prev) => new Set(prev).add(billId));
    toast.success("Bill added to cart!", { position: "top-right", autoClose: 3000 });
  };

  // Remove from cart function
  const handleRemoveFromCart = (billId: string) => {
    setBillCart((prev) => {
      const next = new Set(prev);
      next.delete(billId);
      return next;
    });
    toast.success("Bill removed from cart!", { position: "top-right", autoClose: 3000 });
  };

  // Add all unpaid bills to cart
  const handleAddAllToCart = () => {
    const unpaidBills = items.filter((b) => b.payment_status !== "paid");
    const keys = unpaidBills.map(getBillCartKey);
    setBillCart((prev) => new Set([...prev, ...keys]));
    toast.success(`${keys.length} bills added to cart!`, { position: "top-right", autoClose: 3000 });
  };

  // Get cart items
  const getCartItems = () =>
    items.filter((bill) => billCart.has(getBillCartKey(bill)));

  // Calculate cart total
  const getCartTotal = () =>
    getCartItems().reduce((total, bill) => total + (bill.balance || bill.amount_due || 0), 0);

  // Clear cart
  const handleClearCart = () => {
    setBillCart(new Set());
    toast.success("Cart cleared!", { position: "top-right", autoClose: 3000 });
  };

  // Process to payment
  const handleProcessToPayment = () => {
    if (billCart.size === 0) {
      toast.error("Your cart is empty!", { position: "top-right", autoClose: 3000 });
      return;
    }
    setShowCartModal(false);
    setShowSavedPaymentModal(true);
  };

  // Load bills
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      const list: Bill[] = Array.isArray(data?.bills) ? data.bills : [];
      const processedList = list.slice(0, 100);
      setItems(processedList);
      setCurrency("USD");
      if (list.length > 100) {
        setTimeout(() => setItems(list), 1000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Load customer profile
  useEffect(() => {
    async function loadCustomerProfile() {
      try {
        const res = await fetch("/api/customer/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.full_name) {
            const nameParts = data.full_name.trim().split(/\s+/);
            setPaymentForm((prev) => ({
              ...prev,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              email: data.email || prev.email,
              phone: data.phone || prev.phone,
            }));
          } else {
            setPaymentForm((prev) => ({
              ...prev,
              email: data.email || prev.email,
              phone: data.phone || prev.phone,
            }));
          }
        }
      } catch (err) {
        console.error("Error loading customer profile:", err);
      }
    }
    loadCustomerProfile();
  }, []);

  useEffect(() => {
    load();
    // Load saved cards mock
    setSavedCards([
      { id: "1", last4: "4242", brand: "visa", expiry: "12/25", name: "John Doe" },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert amounts when currency or items change
  useEffect(() => {
    if (items.length === 0) return;
    const convertAll = async () => {
      const map = new Map<string, string>();
      for (const item of items) {
        const key = item.tracking_number;
        try {
          const converted =
            item.currency === selectedCurrency
              ? item.amount_due
              : await convertAmount(item.amount_due, item.currency || "USD");
          map.set(key, formatCurrency(converted, selectedCurrency));
        } catch {
          map.set(key, formatCurrency(item.amount_due, selectedCurrency));
        }
      }
      setConvertedAmounts(map);
    };
    convertAll();
  }, [items, selectedCurrency, convertAmount, formatCurrency]);

  // Converted total due
  useEffect(() => {
    if (items.length === 0) { setConvertedTotalDue(""); return; }
    const calc = async () => {
      try {
        let total = 0;
        for (const item of items) {
          total += await convertAmount(item.amount_due, item.currency || "USD");
        }
        setConvertedTotalDue(formatCurrency(total, selectedCurrency));
      } catch {
        const raw = items.reduce((s, it) => s + (Number(it.amount_due) || 0), 0);
        setConvertedTotalDue(formatCurrency(raw, selectedCurrency));
      }
    };
    calc();
  }, [items, selectedCurrency, convertAmount, formatCurrency]);

  const totalDue = items.reduce((s, it) => s + (Number(it.amount_due) || 0), 0);
  const pendingBills = items.filter((b) => b.payment_status === "submitted" || b.payment_status === "none");
  const reviewedBills = items.filter((b) => b.payment_status === "reviewed");
  const rejectedBills = items.filter((b) => b.payment_status === "rejected");

  const handlePayNow = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBill || usePayPal) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/customer/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: selectedBill.tracking_number,
          amount: selectedBill.amount_due,
          currency: selectedBill.currency || "USD",
          paymentMethod: "card",
          cardDetails: paymentForm,
          usePayPal: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.details === "string"
            ? data.details
            : "Payment failed. Please try again.";
        throw new Error(msg);
      }
      setShowPaymentModal(false);
      setSelectedBill(null);
      setUsePayPal(false);
      await load();
      toast.success("Payment processed successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePayWithSavedCard = (card: { id: string; last4: string; brand: string; expiry: string; name: string }) => {
    setSelectedCard(card);
    setShowPaymentModal(true);
    setShowDetailsModal(false);
  };

  const handleSaveCard = (cardData: { name: FormDataEntryValue | null; cardNumber: FormDataEntryValue | null; expiry: FormDataEntryValue | null; cvv: FormDataEntryValue | null }) => {
    const newCard = {
      id: Date.now().toString(),
      last4: String(cardData.cardNumber || "").replace(/\s/g, "").slice(-4),
      brand: "visa",
      expiry: String(cardData.expiry || ""),
      name: String(cardData.name || ""),
    };
    setSavedCards((prev) => [...prev, newCard]);
    setShowAddCardModal(false);
    toast.success("Card saved successfully!");
  };

  function getStatusInfo(status: Bill["payment_status"]) {
    switch (status) {
      case "paid":
        return { label: "Paid", icon: CheckCircle, bgColor: "bg-emerald-100 text-emerald-800 border-emerald-200", iconColor: "text-emerald-600" };
      case "reviewed":
        return { label: "Reviewed", icon: CheckCircle, bgColor: "bg-green-100 text-green-800 border-green-200", iconColor: "text-green-600" };
      case "submitted":
        return { label: "Submitted", icon: Clock, bgColor: "bg-blue-100 text-blue-800 border-blue-200", iconColor: "text-blue-600" };
      case "rejected":
        return { label: "Rejected", icon: XCircle, bgColor: "bg-red-100 text-red-800 border-red-200", iconColor: "text-red-600" };
      default:
        return { label: "Pending", icon: Clock, bgColor: "bg-orange-100 text-orange-800 border-orange-200", iconColor: "text-orange-600" };
    }
  }

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  // Bills History Filtering and Sorting
  const filteredAndSortedBills = items
    .filter((bill) => {
      if (bill.payment_status !== "paid") return false;
      return (
        searchTerm === "" ||
        bill.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.invoice_date || 0).getTime() - new Date(a.invoice_date || 0).getTime();
      if (sortBy === "amount") return b.amount_due - a.amount_due;
      if (sortBy === "invoice") return (a.invoice_number || "").localeCompare(b.invoice_number || "");
      return 0;
    });

  const handleExportHistory = () => {
    if (filteredAndSortedBills.length === 0) return;
    const exportData = filteredAndSortedBills.map((bill) => ({
      "Invoice Number": bill.invoice_number || "N/A",
      "Tracking Number": bill.tracking_number,
      "Payment ID": bill.payment_id || "N/A",
      Amount: `${bill.currency || "USD"} ${bill.amount_due.toFixed(2)}`,
      "Payment Method": bill.payment_method || "N/A",
      "Invoice Date": bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : "N/A",
      "Due Date": bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "N/A",
      "Last Updated": bill.last_updated ? new Date(bill.last_updated).toLocaleDateString() : "N/A",
    }));
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) => headers.map((h) => `"${row[h as keyof typeof row]}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bills_history_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAndSortedBills.length} bills to CSV`);
  };

  if (loading) return <Loading message="Loading your bills..." />;

  return (
    <PayPalProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Background Pattern */}
          <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Header */}
            <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
              <div className="absolute inset-0 bg-white/10" />
              <div className="relative flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold leading-tight md:text-3xl">Bills & Payments</h1>
                      <p className="text-blue-100 mt-1 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Manage your invoices and payments
                        <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                          Data Loaded
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EnhancedCurrencySelector
                      selectedCurrency={selectedCurrency}
                      onCurrencyChange={setSelectedCurrency}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    />
                    <button
                      onClick={() => load()}
                      className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                    >
                      <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                    {billCart.size > 0 && (
                      <button
                        onClick={() => setShowCartModal(true)}
                        className="relative flex items-center space-x-2 px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span>Cart ({billCart.size})</span>
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {billCart.size}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Overview Statistics
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Balance Due */}
                  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#E67919] to-[#f59e42] shadow-lg">
                      <DollarSign className="h-7 w-7 text-white" />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-600 truncate">Balance Due</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 truncate">
                        {convertedTotalDue || formatCurrency(totalDue, selectedCurrency)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">in {selectedCurrency}</p>
                    </div>
                  </div>
                  {/* Pending */}
                  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0891b2] to-[#06b6d4] shadow-lg">
                      <Clock className="h-7 w-7 text-white" />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-600 truncate">Pending Bills</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 truncate">{pendingBills.length}</p>
                    </div>
                  </div>
                  {/* Reviewed */}
                  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-600 truncate">Reviewed Bills</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 truncate">{reviewedBills.length}</p>
                    </div>
                  </div>
                  {/* Rejected */}
                  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                      <XCircle className="h-7 w-7 text-white" />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-600 truncate">Rejected Bills</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 truncate">{rejectedBills.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            {/* Invoice List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Invoice List
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCartModal(true)}
                      className="relative inline-flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 text-sm font-medium"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View Cart
                      {billCart.size > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {billCart.size}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleAddAllToCart}
                      className="inline-flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add All to Cart
                    </button>
                    <button
                      onClick={() => load()}
                      className="inline-flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 text-sm font-medium"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      <span className="ml-2">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-2">
                  {items.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No bills found</h3>
                      <p className="text-sm text-gray-500">Your bills and invoices will appear here</p>
                    </div>
                  ) : (
                    items.map((bill) => {
                      const statusInfo = getStatusInfo(bill.payment_status);
                      const StatusIcon = statusInfo.icon;
                      const cartKey = getBillCartKey(bill);

                      return (
                        <div
                          key={cartKey}
                          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="p-2 bg-white/20 rounded-lg">
                                  {bill.payment_status === "paid" ? (
                                    <Lock className="h-5 w-5 text-white" />
                                  ) : (
                                    <Unlock className="h-5 w-5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white">
                                    Invoice #{bill.invoice_number || "N/A"}
                                  </p>
                                  <p className="text-xs text-blue-100">
                                    {bill.invoice_date
                                      ? new Date(bill.invoice_date).toLocaleDateString()
                                      : "Date not set"}
                                  </p>
                                </div>
                              </div>
                              <div className={`p-2 rounded-lg ${statusInfo.bgColor.split(" ")[0]}`}>
                                <StatusIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />
                              </div>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-8 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Payment Status</span>
                              <div className="flex items-center gap-2">
                                {bill.payment_status === "paid" ? (
                                  <Lock className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Unlock className="h-4 w-4 text-orange-600" />
                                )}
                                <span className={`text-sm font-semibold ${bill.payment_status === "paid" ? "text-green-600" : "text-orange-600"}`}>
                                  {bill.payment_status === "paid" ? "Paid" : "Unpaid"}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs text-gray-500 block mb-1">Total Amount</span>
                                <span className="text-lg font-bold text-[#E67919] block">
                                  {convertedAmounts.get(bill.tracking_number) ||
                                    formatCurrency(bill.amount_due, selectedCurrency)}
                                </span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs text-gray-500 block mb-1">Balance</span>
                                <span className={`text-lg font-bold ${(bill.balance || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                                  {formatCurrency(bill.balance || 0, selectedCurrency)}
                                </span>
                              </div>
                            </div>

                            {(bill.paid_payment || bill.due_payment) && (
                              <div className="space-y-2">
                                {bill.paid_payment && (
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">Paid Amount</span>
                                    <span className="text-sm font-semibold text-green-600">
                                      {formatCurrency(bill.paid_payment, selectedCurrency)}
                                    </span>
                                  </div>
                                )}
                                {bill.due_payment && (
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">Due Amount</span>
                                    <span className="text-sm font-semibold text-orange-600">
                                      {formatCurrency(bill.due_payment, selectedCurrency)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span className="text-sm font-medium text-gray-600 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Invoice Date
                              </span>
                              <span className="text-sm font-semibold">
                                {bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : "N/A"}
                              </span>
                            </div>

                            {bill.due_date && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Due Date
                                </span>
                                <span className={`text-sm font-semibold ${new Date(bill.due_date) < new Date() ? "text-red-600" : "text-gray-900"}`}>
                                  {new Date(bill.due_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-gray-100">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleAddToCart(cartKey)}
                                disabled={billCart.has(cartKey)}
                                className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                                  billCart.has(cartKey)
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white hover:shadow-lg"
                                }`}
                              >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                {billCart.has(cartKey) ? "In Cart" : "Add to Cart"}
                              </button>
                              <button
                                onClick={() => handleViewDetails(bill)}
                                className="w-full inline-flex items-center justify-center px-4 py-3 border-2 border-[#6366f1] text-[#6366f1] rounded-lg hover:bg-indigo-50 transition-all text-sm font-medium"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Bills History / Paid Bills Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Payment History
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportHistory}
                      disabled={filteredAndSortedBills.length === 0}
                      className="flex items-center space-x-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => load()}
                      className="flex items-center space-x-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 text-sm font-medium"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search by invoice number, tracking number, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                    />
                    <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                    <option value="invoice">Sort by Invoice</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Payment ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Payment Method</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedBills.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center">
                              <FileText className="h-12 w-12 text-gray-300 mb-3" />
                              <p className="text-gray-500">No paid bills found matching your criteria</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedBills.map((bill) => (
                          <tr
                            key={`${bill.tracking_number}-${bill.invoice_number || "doc"}`}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-gray-600">{bill.payment_id || "N/A"}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#E67919]">
                                {convertedAmounts.get(bill.tracking_number) ||
                                  formatCurrency(bill.amount_due, selectedCurrency)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-green-50 text-green-700 border-green-200">
                                {bill.payment_method || "N/A"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-600">
                                {bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : "N/A"}
                              </div>
                              {bill.last_updated && (
                                <div className="text-xs text-gray-500">
                                  Updated: {new Date(bill.last_updated).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(bill)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {bill.document_url && (
                                  <a
                                    href={bill.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="View Document"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{filteredAndSortedBills.length}</p>
                      <p className="text-sm text-gray-600">Total Bills</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {filteredAndSortedBills.filter((b) => b.payment_status === "paid").length}
                      </p>
                      <p className="text-sm text-gray-600">Paid Bills</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {filteredAndSortedBills.filter((b) => b.payment_status !== "paid").length}
                      </p>
                      <p className="text-sm text-gray-600">Unpaid Bills</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#E67919]">
                        {formatCurrency(
                          filteredAndSortedBills.reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0),
                          selectedCurrency
                        )}
                      </p>
                      <p className="text-sm text-gray-600">Total Amount</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Payment Modal ─── */}
        {showPaymentModal && selectedBill && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => { setShowPaymentModal(false); setUsePayPal(false); }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {usePayPal ? "Pay with PayPal" : "Pay With Credit/Debit Card"}
                </h3>
                <button onClick={() => { setShowPaymentModal(false); setUsePayPal(false); }} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-left">
                      <p className="text-sm text-gray-600 mb-2">Total Due</p>
                      <p className="text-2xl font-bold text-[#0f4d8a]">
                        {formatCurrency(selectedBill.amount_due || 0, currency)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2">Currency</p>
                      <EnhancedCurrencySelector
                        selectedCurrency={currency}
                        onCurrencyChange={setCurrency}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Toggle */}
                <div className="mb-6 flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUsePayPal(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!usePayPal ? "bg-white text-[#0f4d8a] shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePayPal(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${usePayPal ? "bg-white text-[#0f4d8a] shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    🅿️ PayPal
                  </button>
                </div>

                {usePayPal ? (
                  <PayPalPaymentButton
                    amount={selectedBill.amount_due}
                    currency={selectedBill.currency || currency || "USD"}
                    description={`Payment for invoice ${selectedBill.invoice_number || selectedBill.tracking_number}`}
                    trackingNumber={selectedBill.tracking_number}
                    onSuccess={async (captureData) => {
                      try {
                        const response = await fetch("/api/customer/payments/process", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invoiceNumber: selectedBill.invoice_number,
                            trackingNumber: selectedBill.tracking_number,
                            amount: selectedBill.amount_due,
                            currency: selectedBill.currency || "USD",
                            paymentMethod: "paypal",
                            paypalOrderId: captureData.orderId,
                            transactionId: captureData.transactionId,
                          }),
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data?.error || "Failed to process payment");
                        setShowPaymentModal(false);
                        setSelectedBill(null);
                        setUsePayPal(false);
                        await load();
                        toast.success("Payment processed successfully!");
                      } catch (err) {
                        toast.error("Payment was captured but failed to process. Please contact support.");
                        console.error(err);
                      }
                    }}
                    onError={(err) => { console.error("PayPal error:", err); toast.error("PayPal payment failed."); }}
                    onCancel={() => toast.info("PayPal payment cancelled")}
                    disabled={processing}
                    className="w-full"
                  />
                ) : (
                  <form onSubmit={handlePayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input type="text" required value={paymentForm.firstName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, firstName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input type="text" required value={paymentForm.lastName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, lastName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <input type="text" required maxLength={19} value={paymentForm.cardNumber} placeholder="1234 5678 9012 3456"
                        onChange={(e) => {
                          const v = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
                          setPaymentForm({ ...paymentForm, cardNumber: v.match(/.{1,4}/g)?.join(" ") || v });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                        <input type="text" required maxLength={5} value={paymentForm.expiry} placeholder="MM/YY"
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            setPaymentForm({ ...paymentForm, expiry: v.length >= 2 ? `${v.slice(0, 2)}/${v.slice(2, 4)}` : v });
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <input type="text" required maxLength={4} value={paymentForm.cvv} placeholder="123"
                          onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, "") })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" required value={paymentForm.email}
                        onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="tel" required value={paymentForm.phone}
                        onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]" />
                    </div>
                    <button type="submit" disabled={processing}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white px-6 py-3 font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {processing ? (<><Loader2 className="h-5 w-5 animate-spin" />Processing...</>) : (<><CreditCard className="h-5 w-5" />MAKE PAYMENT</>)}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── View Details Modal ─── */}
        {showDetailsModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Bill Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Info */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Invoice Information</h4>
                    <div className="space-y-3">
                      {[
                        ["Invoice Number", selectedBill.invoice_number || "N/A"],
                        ["Tracking Number", selectedBill.tracking_number],
                        ["Payment ID", selectedBill.payment_id || "N/A"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-sm text-gray-600">{label}:</span>
                          <span className="text-sm font-medium font-mono">{value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusInfo(selectedBill.payment_status).bgColor}`}>
                          {getStatusInfo(selectedBill.payment_status).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Financial Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount Due:</span>
                        <span className="text-lg font-bold text-[#E67919]">
                          {formatCurrency(selectedBill.amount_due, selectedCurrency)}
                        </span>
                      </div>
                      {selectedBill.invoice_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Invoice Date:</span>
                          <span className="text-sm font-medium">{new Date(selectedBill.invoice_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedBill.due_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Due Date:</span>
                          <span className={`text-sm font-medium ${new Date(selectedBill.due_date) < new Date() ? "text-red-600" : "text-gray-900"}`}>
                            {new Date(selectedBill.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBill.last_updated && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Updated:</span>
                          <span className="text-sm font-medium">{new Date(selectedBill.last_updated).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saved Payment Methods */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900">Saved Payment Methods</h4>
                  {savedCards.length > 0 ? (
                    savedCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-xs text-gray-500">{card.brand.toUpperCase()} •••• {card.last4}</p>
                        </div>
                        <button
                          onClick={() => { setShowDetailsModal(false); handlePayWithSavedCard(card); }}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          Use Card
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No saved payment methods</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button onClick={() => setShowDetailsModal(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Close
                  </button>
                  {selectedBill.payment_status !== "paid" && selectedBill.amount_due > 0 && (
                    <button
                      onClick={() => { setShowDetailsModal(false); handlePayNow(selectedBill); }}
                      className="px-6 py-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Add Card Modal ─── */}
        {showAddCardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddCardModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#10b981] to-[#059669] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Add Payment Method</h3>
                <button onClick={() => setShowAddCardModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleSaveCard({ name: fd.get("name"), cardNumber: fd.get("cardNumber"), expiry: fd.get("expiry"), cvv: fd.get("cvv") });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                  <input type="text" name="name" required placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input type="text" name="cardNumber" required maxLength={19} placeholder="1234 5678 9012 3456"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                    <input type="text" name="expiry" required maxLength={5} placeholder="MM/YY"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input type="text" name="cvv" required maxLength={4} placeholder="123"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddCardModal(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-lg hover:shadow-lg transition-all flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Save Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Cart Modal ─── */}
        {showCartModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCartModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart ({billCart.size} items)
                </h3>
                <button onClick={() => setShowCartModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                {getCartItems().length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {getCartItems().map((bill) => (
                        <div key={getBillCartKey(bill)} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">Invoice #{bill.invoice_number || "N/A"}</p>
                            <p className="text-sm text-gray-600">{bill.tracking_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#E67919]">
                              {formatCurrency(bill.balance || bill.amount_due || 0, selectedCurrency)}
                            </p>
                            <button onClick={() => handleRemoveFromCart(getBillCartKey(bill))} className="text-red-500 hover:text-red-700 text-sm mt-1">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-xl font-bold text-[#E67919]">{formatCurrency(getCartTotal(), selectedCurrency)}</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowCartModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                        <button onClick={handleProcessToPayment} className="flex-1 px-4 py-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process to Payment
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Pay Modal (Cart Summary) ─── */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPayModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Payment Confirmation</h3>
                  <p className="text-orange-100 text-sm">Review your cart details before proceeding</p>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">Total Amount Due</p>
                  <p className="text-3xl font-bold text-[#E67919] mb-2">{formatCurrency(getCartTotal(), selectedCurrency)}</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{billCart.size} bill(s) in cart</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => { setShowPayModal(false); setShowSavedPaymentModal(true); }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-xl hover:shadow-xl transition-all duration-200 font-semibold text-lg flex items-center justify-center"
                  >
                    <CreditCard className="h-5 w-5 mr-3" />
                    Pay Now
                  </button>
                  <button onClick={() => setShowPayModal(false)} className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Card Payment Modal ─── */}
        {showCardPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCardPaymentModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pay With Credit/Debit Card
                </h3>
                <button onClick={() => setShowCardPaymentModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-[#E67919]">{formatCurrency(getCartTotal(), selectedCurrency)}</p>
                  <p className="text-sm text-gray-500 mt-1">{billCart.size} bill(s)</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input type="text" placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                      <input type="text" placeholder="MM/YY"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                      <input type="text" placeholder="123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                    <input type="text" placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => {
                        toast.success("Payment processed successfully!", { position: "top-right", autoClose: 3000 });
                        setShowCardPaymentModal(false);
                        setBillCart(new Set());
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-xl transition-all duration-200 font-semibold text-lg flex items-center justify-center"
                    >
                      <CreditCard className="h-5 w-5 mr-3" />
                      Process Payment
                    </button>
                    <button onClick={() => setShowCardPaymentModal(false)} className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Saved Payment Methods Modal ─── */}
        {showSavedPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSavedPaymentModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Choose Payment Method
                </h3>
                <button onClick={() => setShowSavedPaymentModal(false)} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                  <p className="text-3xl font-bold text-[#E67919]">{formatCurrency(getCartTotal(), selectedCurrency)}</p>
                  <p className="text-sm text-gray-500 mt-2">{billCart.size} bill(s) to pay</p>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Saved Payment Methods</h4>
                  {savedCards.length > 0 ? (
                    <div className="space-y-3">
                      {savedCards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <p className="text-xs text-gray-500">{card.brand.toUpperCase()} •••• {card.last4}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCard(card);
                              handlePayWithSavedCard(card);
                              setShowSavedPaymentModal(false);
                            }}
                            className="px-3 py-1 text-sm bg-[#E67919] text-white rounded hover:bg-[#d56916] transition-colors"
                          >
                            Pay
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No saved payment methods</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => { setShowSavedPaymentModal(false); setShowCardPaymentModal(true); }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-xl transition-all font-semibold flex items-center justify-center"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay with New Card
                  </button>
                  <button onClick={() => setShowSavedPaymentModal(false)} className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PayPalProvider>
  );
}