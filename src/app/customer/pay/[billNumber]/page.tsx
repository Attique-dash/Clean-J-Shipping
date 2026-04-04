"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { 
  CreditCard, 
  FileText, 
  Loader2,
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronRight,
  Truck,
  ShoppingCart,
  Plus,
  X,
  TrendingUp,
  Clock,
  RefreshCw,
  Calendar,
  XCircle,
  Eye,
  Save
} from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useCurrency } from "@/contexts/CurrencyContext";
import EnhancedCurrencySelector from "@/components/EnhancedCurrencySelector";
import Loading from "@/components/Loading";
import Link from "next/link";

interface BillPackage {
  packageId: string;
  trackingNumber: string;
  shipper: string;
  weight: number;
  itemValue: number;
  shippingFee: number;
  customsFee: number;
  total: number;
  invoiceFiles?: string[];
  itemDescription?: string;
  content?: string;
  description?: string;
  warehouseLocation?: string;
  dateReceived?: string;
}

interface BillData {
  billId: string;
  billNumber: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  itemTotal: number;
  shippingFee: number;
  customsFee: number;
  additionalFees?: Array<{label: string, amount: number}>;
  totalAmount: number;
  paidAt?: string;
  paidAmount?: number;
  createdAt: string;
  packages: BillPackage[];
  adminNotes?: string;
}

// Additional bill type for bills list
type BillListItem = {
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

export default function PaymentPage() {
  const { data: session } = useSession();
  const params = useParams();
  const billNumber = params?.billNumber as string;
  const { selectedCurrency, setSelectedCurrency, convertAmount, formatCurrency } = useCurrency();
  
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Card form state with proper formatting
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Cart functionality
  const [billCart, setBillCart] = useState<Set<string>>(new Set());
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showSavedPaymentModal, setShowSavedPaymentModal] = useState(false);

  // Bills history - REMOVED per user request
  // const [allBills, setAllBills] = useState<BillListItem[]>([]);
  // const [searchTerm, setSearchTerm] = useState("");
  // const [sortBy, setSortBy] = useState("date");

  // Saved cards
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  // PayPal state
  const [usePayPal, setUsePayPal] = useState(false);

  useEffect(() => {
    if (session?.user && billNumber) {
      loadBill();
      // loadAllBills(); // REMOVED - no longer loading bills history
      loadSavedCards();
      loadCustomerProfile();
    }
  }, [session, billNumber]);

  // Load customer profile to auto-fill payment form
  async function loadCustomerProfile() {
    try {
      const res = await fetch("/api/customer/profile", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.full_name) {
          setCardName(data.full_name);
        }
        setEmail(data.email || "");
        setPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Error loading customer profile:", error);
    }
  }

  async function loadBill() {
    try {
      setLoading(true);
      const res = await fetch(`/api/customer/bills/${billNumber}`, {
        credentials: "include",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bill");
      
      setBill(data.data);
      if (data.data.status === 'paid') {
        setPaymentComplete(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  // Bills history loading - REMOVED per user request
  /*
  async function loadAllBills() {
    try {
      const res = await fetch("/api/customer/bills", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bills");
      const list: BillListItem[] = Array.isArray(data?.bills) ? data.bills : [];
      setAllBills(list);
    } catch (error) {
      console.error("Error loading all bills:", error);
    }
  }
  */

  // Load saved cards
  async function loadSavedCards() {
    try {
      // Mock saved cards with 4242 test card
      const mockCards = [
        {
          id: "1",
          last4: "4242",
          brand: "visa",
          expiry: "12/25",
          name: "Test Card"
        }
      ];
      setSavedCards(mockCards);
    } catch (error) {
      console.error("Failed to load saved cards:", error);
    }
  }

  // Cart functions
  const handleAddToCart = (billId: string) => {
    setBillCart(prev => new Set(prev).add(billId));
    toast.success(`Bill added to cart!`, { position: "top-right", autoClose: 3000 });
  };

  const handleRemoveFromCart = (billId: string) => {
    setBillCart(prev => {
      const newCart = new Set(prev);
      newCart.delete(billId);
      return newCart;
    });
    toast.success(`Bill removed from cart!`, { position: "top-right", autoClose: 3000 });
  };

  const handleAddAllToCart = () => {
    if (!bill) return;
    const billId = `${bill.billNumber}`;
    setBillCart(prev => new Set(prev).add(billId));
    toast.success(`Bill added to cart!`, { position: "top-right", autoClose: 3000 });
  };

  const getCartItems = () => {
    if (!bill) return [];
    return billCart.has(bill.billNumber) ? [bill] : [];
  };

  const getCartTotal = () => {
    return getCartItems().reduce((total, item) => total + (item?.totalAmount || 0), 0);
  };

  const handleProcessToPayment = () => {
    if (billCart.size === 0) {
      toast.error('Your cart is empty!', { position: "top-right", autoClose: 3000 });
      return;
    }
    setShowCartModal(false);
    setShowSavedPaymentModal(true);
  };

  const handlePayWithSavedCard = (card: any) => {
    setSelectedCard(card);
    setShowSavedPaymentModal(false);
    setShowCardPaymentModal(true);
  };

  // Payment handlers
  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!bill) return;

    setProcessing(true);
    try {
      // Process card payment via API
      const res = await fetch("/api/customer/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: bill.packages[0]?.trackingNumber,
          amount: bill.totalAmount,
          currency: "USD",
          paymentMethod: "card",
          cardDetails: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiry: cardExpiry,
            cvv: cardCvc,
            firstName: cardName.split(' ')[0] || '',
            lastName: cardName.split(' ').slice(1).join(' ') || '',
            email,
            phone
          },
          usePayPal: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.details || "Payment failed. Please try again.");
      }

      // Also update bill status
      await fetch(`/api/customer/bills/${billNumber}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: 'credit_card',
          paymentId: data.paymentId || `PAY-${Date.now()}`,
          paidAmount: bill.totalAmount,
          gatewayResponse: { status: 'success' }
        })
      });

      toast.success("Payment successful! Your packages are now ready for delivery.");
      setPaymentComplete(true);
      setShowCardPaymentModal(false);
      await loadBill();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  async function handlePayPalCreateOrder() {
    if (!bill) return "";

    try {
      const res = await fetch("/api/customer/payments/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bill.totalAmount,
          currency: "USD",
          description: `Payment for bill ${bill.billNumber}`,
          trackingNumber: bill.packages[0]?.trackingNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create PayPal order");
      setPaypalOrderId(data.orderId);
      return data.orderId;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PayPal order creation failed");
      throw error;
    }
  }

  async function handlePayPalApprove(data: { orderID: string }) {
    if (!bill) return;

    try {
      setProcessing(true);

      // Capture the PayPal order
      const captureRes = await fetch("/api/customer/payments/capture-paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        throw new Error(captureData?.error || "Failed to capture PayPal payment");
      }

      // Process payment
      const res = await fetch("/api/customer/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: bill.packages[0]?.trackingNumber,
          amount: bill.totalAmount,
          currency: "USD",
          paymentMethod: "paypal",
          paypalOrderId: data.orderID,
        }),
      });

      const paymentData = await res.json();
      if (!res.ok) {
        throw new Error(paymentData?.error || "Failed to process payment");
      }

      // Also update bill status
      await fetch(`/api/customer/bills/${billNumber}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: 'paypal',
          paymentId: data.orderID,
          paidAmount: bill.totalAmount,
          gatewayResponse: { status: 'success' }
        })
      });

      setPaymentComplete(true);
      setUsePayPal(false);
      setPaypalOrderId(null);
      await loadBill();
      toast.success("Payment processed successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  // Bills history filtering - REMOVED per user request
  /*
  const filteredAndSortedBills = allBills
    .filter(billItem => {
      // Only show paid bills in history
      if (billItem.payment_status !== "paid") {
        return false;
      }
      
      // Search filter
      const matchesSearch = searchTerm === "" || 
        billItem.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billItem.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billItem.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.invoice_date || 0).getTime() - new Date(a.invoice_date || 0).getTime();
        case "amount":
          return b.amount_due - a.amount_due;
        case "invoice":
          return (a.invoice_number || "").localeCompare(b.invoice_number || "");
        default:
          return 0;
      }
    });
  */

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  function getStatusInfo(status: BillListItem["payment_status"]) {
    switch (status) {
      case "paid":
        return {
          label: "Paid",
          bgColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
          iconColor: "text-emerald-600",
        };
      case "reviewed":
        return {
          label: "Reviewed",
          bgColor: "bg-green-100 text-green-800 border-green-200",
          iconColor: "text-green-600",
        };
      case "submitted":
        return {
          label: "Submitted",
          bgColor: "bg-blue-100 text-blue-800 border-blue-200",
          iconColor: "text-blue-600",
        };
      case "rejected":
        return {
          label: "Rejected",
          bgColor: "bg-red-100 text-red-800 border-red-200",
          iconColor: "text-red-600",
        };
      default:
        return {
          label: "Pending",
          bgColor: "bg-orange-100 text-orange-800 border-orange-200",
          iconColor: "text-orange-600",
        };
    }
  }

  if (loading) {
    return <Loading message="Loading bill details..." />;
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Bill Not Found</h2>
          <p className="text-gray-600">We couldn&apos;t find the bill you&apos;re looking for.</p>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. Your packages are now ready for delivery.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Number</p>
                  <p className="font-semibold text-gray-900">{bill.billNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(bill.totalAmount, selectedCurrency)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(bill.paidAt || new Date().toISOString())}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Paid
                  </span>
                </div>
              </div>
            </div>
            
            <Link
              href="/customer/pay"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f4d8a] text-white rounded-xl hover:bg-[#1e6bb8] transition-colors font-medium"
            >
              <FileText className="h-5 w-5" />
              View All Bills
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight md:text-3xl">Pay Bill #{bill.billNumber}</h1>
                  <p className="text-blue-100 mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created on {formatDate(bill.createdAt)}
                    <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                      Pending Payment
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
                  onClick={() => loadBill()}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Bill Overview
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Due */}
              <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#E67919] to-[#f59e42] shadow-lg">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 truncate">Total Amount Due</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 truncate">
                    {formatCurrency(bill.totalAmount, selectedCurrency)}
                  </p>
                </div>
              </div>

              {/* Packages Count */}
              <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0891b2] to-[#06b6d4] shadow-lg">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 truncate">Total Packages</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 truncate">{bill.packages.length}</p>
                </div>
              </div>

              {/* Shipping Fee */}
              <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Truck className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 truncate">Shipping Fee</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 truncate">{formatCurrency(bill.shippingFee, selectedCurrency)}</p>
                </div>
              </div>

              {/* Customs Fee */}
              <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 truncate">Customs/Duty</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 truncate">{formatCurrency(bill.customsFee, selectedCurrency)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bill Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#0f4d8a]" />
                  Package Details
                </h2>
              </div>

              {/* Packages */}
              <div className="space-y-4">
                {bill.packages.map((pkg) => (
                  <div key={pkg.packageId} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{pkg.trackingNumber}</div>
                        <div className="text-sm text-gray-500">{pkg.shipper}</div>
                      </div>
                    </div>
                    
                    {/* Package Content */}
                    {(pkg.itemDescription || pkg.content || pkg.description) && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Content:</span> {pkg.itemDescription || pkg.content || pkg.description}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Weight:</span> {pkg.weight} kg</div>
                      <div><span className="text-gray-500">Item Value:</span> {formatCurrency(pkg.itemValue, selectedCurrency)}</div>
                      <div><span className="text-gray-500">Shipping:</span> {formatCurrency(pkg.shippingFee, selectedCurrency)}</div>
                      <div><span className="text-gray-500">Customs:</span> {formatCurrency(pkg.customsFee, selectedCurrency)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Item Total</span>
                  <span className="font-medium">{formatCurrency(bill.itemTotal, selectedCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping Fee</span>
                  <span className="font-medium">{formatCurrency(bill.shippingFee, selectedCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customs/Duty Fee</span>
                  <span className="font-medium">{formatCurrency(bill.customsFee, selectedCurrency)}</span>
                </div>
                {bill.additionalFees && bill.additionalFees.length > 0 && (
                  bill.additionalFees.map((fee, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-500">{fee.label}</span>
                      <span className="font-medium">{formatCurrency(fee.amount, selectedCurrency)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total Due</span>
                  <span className="text-[#0f4d8a]">{formatCurrency(bill.totalAmount, selectedCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Bills History Section - REMOVED per user request */}
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            {/* Payment Form */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Secure Payment
              </h2>

              {/* Payment Method Selection */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => { setPaymentMethod('paypal'); setUsePayPal(true); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'paypal' || usePayPal
                      ? 'border-[#0f4d8a] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">PayPal</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('card'); setUsePayPal(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'card' && !usePayPal
                      ? 'border-[#0f4d8a] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Testing</span>
                </button>
              </div>

              {/* Saved Cards Section */}
              {!usePayPal && savedCards.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Saved Cards (Test: 4242)</h4>
                  <div className="space-y-2">
                    {savedCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handlePayWithSavedCard(card)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{card.brand.toUpperCase()} •••• {card.last4}</p>
                            <p className="text-xs text-gray-500">Expires {card.expiry}</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 text-sm bg-[#0f4d8a] text-white rounded hover:bg-[#1e6bb8] transition-colors">
                          Use Card
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usePayPal ? (
                <div className="space-y-4">
                  <PayPalScriptProvider
                    options={{
                      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "",
                      currency: "USD",
                      intent: "capture",
                    }}
                  >
                    <PayPalButtons
                      forceReRender={[bill, processing, paypalOrderId]}
                      createOrder={handlePayPalCreateOrder}
                      onApprove={handlePayPalApprove}
                      onError={(err) => {
                        console.error("PayPal error:", err);
                        toast.error("PayPal payment failed. Please try again.");
                      }}
                      onCancel={() => {
                        toast.error("PayPal payment cancelled");
                      }}
                      style={{
                        layout: "vertical",
                        color: "blue",
                        shape: "rect",
                        label: "paypal",
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              ) : (
                <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number (Test: 4242 4242 4242 4242)
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                          const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                          setCardNumber(formatted);
                        }}
                        maxLength={19}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">For testing, use: 4242 4242 4242 4242</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2, 4)}` : value;
                          setCardExpiry(formatted);
                        }}
                        maxLength={5}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVC
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-5 w-5" />
                        Pay {formatCurrency(bill.totalAmount, selectedCurrency)}
                      </>
                    )}
                  </button>

                  <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
                    <Lock className="h-4 w-4" />
                    Secure SSL Encrypted Transaction
                  </p>
                </form>
              )}
            </div>

            {/* Delivery Info */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Ready for Delivery</h3>
              </div>
              <p className="text-sm text-blue-800">
                Once payment is confirmed, your packages will be processed and ready for delivery within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Modal - REMOVED per user request */}

      {/* Saved Payment Methods Modal */}
      {showSavedPaymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSavedPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Choose Payment Method
              </h3>
              <button
                onClick={() => setShowSavedPaymentModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-left">
                      <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                      <p className="text-3xl font-bold text-[#E67919]">
                        {formatCurrency(bill?.totalAmount || 0, selectedCurrency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Cards Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Saved Payment Methods</h4>
                <div className="space-y-3">
                  {savedCards.length > 0 ? (
                    savedCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              {card.brand.toUpperCase()} •••• {card.last4}
                            </p>
                            <p className="text-xs text-gray-400">Expires {card.expiry}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCard(card);
                              handlePayWithSavedCard(card);
                            }}
                            className="px-3 py-1 text-sm bg-[#E67919] text-white rounded hover:bg-[#d56916] transition-colors"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No saved payment methods</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PayPal Option */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Other Payment Methods</h4>
                <button
                  onClick={() => {
                    setUsePayPal(true);
                    setShowSavedPaymentModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-[#0070ba] text-[#0070ba] rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <DollarSign className="h-5 w-5" />
                  Pay with PayPal
                </button>
              </div>

              {/* New Card Option */}
              <button
                onClick={() => {
                  setUsePayPal(false);
                  setShowSavedPaymentModal(false);
                  setShowCardPaymentModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Pay with New Card
              </button>

              <div className="space-y-3 mt-6">
                <button
                  onClick={() => setShowSavedPaymentModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Payment Modal */}
      {showCardPaymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCardPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Card Payment
              </h3>
              <button
                onClick={() => setShowCardPaymentModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                  <p className="text-3xl font-bold text-[#E67919]">
                    {formatCurrency(bill.totalAmount, selectedCurrency)}
                  </p>
                </div>
              </div>

              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number (Test: 4242 4242 4242 4242)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setCardNumber(formatted);
                      }}
                      maxLength={19}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Test card: 4242 4242 4242 4242</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2, 4)}` : value;
                        setCardExpiry(formatted);
                      }}
                      maxLength={5}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Pay {formatCurrency(bill.totalAmount, selectedCurrency)}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
