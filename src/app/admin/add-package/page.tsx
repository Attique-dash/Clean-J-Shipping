"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { Package, ArrowLeft, Save, Loader2, ChevronDown, AlertCircle, RefreshCw, Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
import { CurrencyService } from "@/lib/currency-service";
import {
  getCurrencySymbol,
  packageStatusToFormStatus,
} from "@/lib/package-format";

interface Customer {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

// ─── FIX 1: Extracted FormState interface for clarity and reuse ───────────────
interface FormState {
  weight: string;
  shipper: string;
  description: string;
  itemDescription: string;
  entryDate: string;
  status: string;
  serviceMode: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: string;
  };
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderState: string;
  senderZipCode: string;
  senderCountry: string;
  itemValue: string;
  totalAmount: string;
  paymentCurrency: string;
  branch: string;
  pieces: string;
  specialInstructions: string;
  regularCharge: string;
  customCharge: string;
  chargeCurrency: string;
}

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

const initialForm: FormState = {
  weight: "",
  shipper: "",
  description: "",
  itemDescription: "",
  entryDate: new Date().toISOString().slice(0, 10),
  status: "0",
  serviceMode: "air",
  dimensions: {
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  senderAddress: "",
  senderCity: "",
  senderState: "",
  senderZipCode: "",
  senderCountry: "",
  itemValue: "",
  totalAmount: "",
  paymentCurrency: "USD",
  branch: "KCD Main Warehouse",
  pieces: "1",
  specialInstructions: "",
  regularCharge: "",
  customCharge: "",
  chargeCurrency: "JMD",
};

function AdminAddPackagePageContent() {
  const searchParams = useSearchParams();

  // ─── FIX 2: editId derived from searchParams at render time (not duplicated) ──
  const editId = searchParams?.get("edit") || null;

  const [submitting, setSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // ─── FIX 3: isEditing derives from editId, no lazy-init needed ───────────────
  const isEditing = !!editId;

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers; // Show all if empty
    
    const search = customerSearch.toLowerCase();
    return customers.filter(customer => 
      customer.firstName?.toLowerCase().includes(search) ||
      customer.lastName?.toLowerCase().includes(search) ||
      customer.userCode?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [showPaymentOptions, setShowPaymentOptions] = useState(true);

  // ─── Generate tracking number ─────────────────────────────────────────────
  function generateTrackingNumber() {
    const prefix = "CJS";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const checksum = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    const newTn = `${prefix}-${timestamp}-${random}-${checksum}`;

    setTrackingNumber(newTn);
    setTrackingError(null);
    setTrackingSuccess(true);
    setTimeout(() => setTrackingSuccess(false), 2000);
  }

  async function loadCurrencies() {
    try {
      const res = await fetch("/api/currencies", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list: CurrencyOption[] = (data.currencies || []).map(
          (c: { code: string; name: string; symbol: string }) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
          })
        );
        if (list.length > 0) {
          setCurrencies(list);
          return;
        }
      }
    } catch {
      /* fallback below */
    }
    setCurrencies(
      CurrencyService.getAllCurrencies().map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
      }))
    );
  }

  const currencySymbol = getCurrencySymbol(form.paymentCurrency);
  const selectedCurrencyName =
    currencies.find((c) => c.code === form.paymentCurrency)?.name ||
    form.paymentCurrency;

  // ─── Load customers ────────────────────────────────────────────────────────
  async function loadCustomers() {
    try {
      const res = await fetch("/api/customers", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
    // ─── FIX 4: setLoading(false) moved to useEffect finally block ────────────
  }

  // ─── Handle customer selection ────────────────────────────────────────────
  const selectCustomer = async (userCode: string) => {
    if (!userCode) {
      setSelectedCustomer(null);
      return;
    }
    const customer = customers.find((c) => c.userCode === userCode);
    if (!customer) return;

    try {
      const res = await fetch(`/api/customers/${customer.userCode}`, {
        credentials: "include",
      });
      if (res.ok) {
        const fullCustomerData = await res.json();
        setSelectedCustomer(fullCustomerData);
      } else {
        setSelectedCustomer(customer);
      }
    } catch {
      setSelectedCustomer(customer);
    }
  };

  // ─── Initialize: load customers + optionally load edit data ───────────────
  useEffect(() => {
    const run = async () => {
      try {
        await loadCurrencies();

        if (editId) {
          // Load package for editing
          const res = await fetch(`/api/admin/packages/${editId}`, {
            cache: "no-store",
            credentials: "include",
          });

          if (!res.ok) {
            console.error("Failed to load package for editing");
            return;
          }

          const packageData = await res.json();

          setTrackingNumber(
            packageData.TrackingNumber || packageData.trackingNumber || ""
          );

          setForm({
            weight: String(
              packageData.weightLbs ??
                packageData.Weight ??
                packageData.weight ??
                ""
            ),
            shipper: packageData.Shipper || packageData.shipper || "",
            branch: packageData.Branch || packageData.branch || "KCD Main Warehouse",
            pieces: String(packageData.Pieces ?? packageData.pieces ?? 1),
            description:
              packageData.Description ||
              packageData.description ||
              "",
            itemDescription: packageData.itemDescription || "",
            entryDate:
              packageData.entryDate?.split("T")[0] ||
              packageData.EntryDate?.split("T")[0] ||
              packageData.dateReceived?.split("T")[0] ||
              new Date().toISOString().slice(0, 10),
            status: packageStatusToFormStatus(
              packageData.PackageStatus ?? 0,
              packageData.status
            ),
            serviceMode: packageData.serviceMode || "air",
            dimensions: {
              length: String(
                packageData.dimensions?.length ??
                  packageData.Length ??
                  packageData.length ??
                  ""
              ),
              width: String(
                packageData.dimensions?.width ??
                  packageData.Width ??
                  packageData.width ??
                  ""
              ),
              height: String(
                packageData.dimensions?.height ??
                  packageData.Height ??
                  packageData.height ??
                  ""
              ),
              unit:
                packageData.dimensions?.unit ||
                packageData.dimensionUnit ||
                "cm",
            },
            senderName:
              packageData.senderName || packageData.sender?.name || "",
            senderEmail:
              packageData.senderEmail || packageData.sender?.email || "",
            senderPhone:
              packageData.senderPhone || packageData.sender?.phone || "",
            senderAddress:
              packageData.senderAddress || packageData.sender?.address || "",
            senderCity: packageData.senderCity || "",
            senderState: packageData.senderState || "",
            senderZipCode: packageData.senderZipCode || "",
            senderCountry:
              packageData.senderCountry || packageData.sender?.country || "",
            itemValue:
              packageData.itemValueUsd?.toString() ||
              packageData.itemValue?.toString() ||
              packageData.value?.toString() ||
              "",
            totalAmount:
              packageData.totalAmount !== undefined &&
              packageData.totalAmount !== null
                ? String(packageData.totalAmount)
                : "",
            paymentCurrency:
              packageData.pricePaidCurrency ||
              packageData.paymentCurrency ||
              "USD",
            specialInstructions: packageData.specialInstructions || "",
            regularCharge:
              packageData.regularCharge?.toString() || "",
            customCharge:
              packageData.customCharge?.toString() || "",
            chargeCurrency:
              packageData.chargeCurrency || "JMD",
          });

          // Ensure mutual exclusion between total amount and manual charges
          // If manual charges are set, clear total amount
          const hasManualCharges = !!(packageData.regularCharge || packageData.customCharge);
          const hasTotalAmount = !!(packageData.totalAmount && packageData.totalAmount > 0);
          
          if (hasManualCharges && hasTotalAmount) {
            // Manual charges take precedence, clear total amount
            setForm(prev => ({ ...prev, totalAmount: "" }));
          } else if (hasTotalAmount && hasManualCharges) {
            // Total amount takes precedence, clear manual charges
            setForm(prev => ({ ...prev, regularCharge: "", customCharge: "" }));
          }

          if (
            packageData.totalAmount ||
            packageData.itemValueUsd ||
            packageData.itemValue
          ) {
            setShowPaymentOptions(true);
          }

          // Load associated customer
          const pkgUserCode = packageData.UserCode || packageData.userCode;
          if (pkgUserCode) {
            try {
              const customerRes = await fetch(
                `/api/admin/customers?userCode=${pkgUserCode}`,
                { cache: "no-store", credentials: "include" }
              );
              if (customerRes.ok) {
                const customerData = await customerRes.json();
                if (Array.isArray(customerData) && customerData.length > 0) {
                  setSelectedCustomer(customerData[0]);
                }
              }
            } catch (customerError) {
              console.error("Error fetching customer details:", customerError);
            }
          }

          await loadCustomers();
        } else {
          // New package mode
          await loadCustomers();
          generateTrackingNumber();
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      } finally {
        // ─── FIX 4 (continued): single authoritative setLoading(false) ────────
        setLoading(false);
      }
    };

    run();
    // ─── FIX 5: editId is the only real dependency; searchParams object
    //           reference changes every render — using editId avoids loops ──────
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ─── Handle form submission ───────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!trackingNumber.trim()) {
      setTrackingError("Tracking number is required");
      return;
    }

    // ─── FIX 6: Customer required for both new AND edit when no customer loaded ─
    if (!selectedCustomer && !isEditing) {
      setTrackingError("Please select a customer");
      return;
    }

    setSubmitting(true);
    setTrackingError(null);

    try {
      const customerData = selectedCustomer;

      if (!isEditing && !customerData) {
        setTrackingError("Please select a customer");
        setSubmitting(false);
        return;
      }

      // ─── FIX 7: Helper to build clean address string ──────────────────────
      const buildAddress = (addr: Customer["address"]) => {
        if (!addr) return undefined;
        return [addr.street, addr.city, addr.state, addr.zipCode]
          .filter(Boolean)
          .join(", ")
          .trim() || undefined;
      };

      const payload = {
        trackingNumber: trackingNumber.trim(),
        ...(customerData && { userCode: customerData.userCode }),
        weightLbs: form.weight ? Number(form.weight) : undefined,
        weightUnit: 'lb',
        Weight: form.weight ? Number(form.weight) : undefined,
        shipper: form.shipper.trim() || undefined,
        description: form.description.trim() || undefined,
        itemDescription: form.itemDescription.trim() || undefined,
        entryDate: form.entryDate,
        status: form.status,
        serviceMode: form.serviceMode,
        dimensions: {
          length: form.dimensions.length
            ? Number(form.dimensions.length)
            : undefined,
          width: form.dimensions.width
            ? Number(form.dimensions.width)
            : undefined,
          height: form.dimensions.height
            ? Number(form.dimensions.height)
            : undefined,
          unit: form.dimensions.unit || "cm",
        },
        ...(customerData && {
          recipient: {
            name: `${customerData.firstName} ${customerData.lastName}`,
            email: customerData.email || undefined,
            phone: customerData.phone || undefined,
            address: buildAddress(customerData.address),
            city: customerData.address?.city || undefined,
            state: customerData.address?.state || undefined,
            zipCode: customerData.address?.zipCode || undefined,
            country: customerData.address?.country || undefined,
            shippingId: customerData.userCode,
          },
        }),
        sender: {
          name: form.senderName.trim() || undefined,
          email: form.senderEmail.trim() || undefined,
          phone: form.senderPhone.trim() || undefined,
          address: form.senderAddress.trim() || undefined,
          city: form.senderCity.trim() || undefined,
          state: form.senderState.trim() || undefined,
          zipCode: form.senderZipCode.trim() || undefined,
          country: form.senderCountry.trim() || undefined,
        },
        contents: form.description.trim() || undefined,
        itemValueUSD: form.itemValue ? Number(form.itemValue) : undefined,
        value: form.itemValue ? Number(form.itemValue) : undefined,
        specialInstructions: form.specialInstructions.trim() || undefined,
        paymentCurrency: form.paymentCurrency,
        amountPaidCurrency: form.paymentCurrency,
        Branch: form.branch.trim() || "KCD Main Warehouse",
        branch: form.branch.trim() || "KCD Main Warehouse",
        Pieces: form.pieces ? Number(form.pieces) : 1,
        pieces: form.pieces ? Number(form.pieces) : 1,
        // Legacy compatibility fields
        itemValue: form.itemValue ? Number(form.itemValue) : undefined,
        senderName: form.senderName.trim() || undefined,
        senderPhone: form.senderPhone.trim() || undefined,
        senderAddress: form.senderAddress.trim() || undefined,
        receiverName: customerData
          ? `${customerData.firstName} ${customerData.lastName}`
          : undefined,
        receiverPhone: customerData?.phone || undefined,
        receiverEmail: customerData?.email || undefined,
        receiverAddress: customerData
          ? buildAddress(customerData.address)
          : undefined,
        currentLocation: undefined,
        packageType: "parcel",
        serviceType: "standard",
        deliveryType: "door_to_door",
        shippingCost: 0,
        totalAmount: form.totalAmount
          ? Number(form.totalAmount)
          : form.itemValue
          ? Number(form.itemValue)
          : 0,
        paymentMethod: "cash",
        receivedAt: new Date(),
        regularCharge: form.regularCharge ? Number(form.regularCharge) : 0,
        customCharge: form.customCharge ? Number(form.customCharge) : 0,
        chargeCurrency: form.chargeCurrency || "JMD",
      };

      const url = editId
        ? `/api/admin/packages/${editId}`
        : "/api/admin/packages";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setTrackingError("Session expired. Please refresh the page.");
        setSubmitting(false);
        return;
      }

      if (res.status === 403) {
        setTrackingError("You don't have permission to perform this action.");
        setSubmitting(false);
        return;
      }

      let responseData: { error?: string } = {};
      try {
        responseData = await res.json();
      } catch (parseError) {
        console.error("Failed to parse response JSON:", parseError);
        responseData = { error: "Invalid response from server" };
      }

      if (!res.ok) {
        const errorMsg =
          responseData.error || res.statusText || "Unknown error";

        if (
          errorMsg.toLowerCase().includes("duplicate") ||
          errorMsg.toLowerCase().includes("already exists") ||
          errorMsg.toLowerCase().includes("tracking number")
        ) {
          setTrackingError(
            "A package with this tracking number already exists. Please generate a new tracking number."
          );
        } else {
          setTrackingError(
            errorMsg || "Failed to save package. Please try again."
          );
        }
        setSubmitting(false);
        return;
      }

      alert(`Package ${editId ? "updated" : "created"} successfully!`);
      window.location.href = "/admin/packages";
    } catch (error) {
      console.error("Error with package:", error);
      setTrackingError("An error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading message="Loading customers..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                    {isEditing ? "Edit Package" : "Add New Package"}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {isEditing
                      ? "Update package information"
                      : "Create a new package entry"}
                  </p>
                </div>
              </div>
              <Link
                href="/admin/packages"
                className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-4 py-2.5 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Packages</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Package Information
            </h2>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-6">
            {/* Tracking Number */}
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tracking Number *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="block w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder={
                        isEditing
                          ? "Tracking number"
                          : "Generate tracking number"
                      }
                      value={trackingNumber}
                      onChange={(e) => {
                        setTrackingNumber(e.target.value);
                        setTrackingSuccess(false);
                        setTrackingError(null);
                      }}
                      required
                      readOnly={isEditing}
                    />
                    {trackingSuccess && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateTrackingNumber}
                      className="flex items-center gap-2 rounded-xl border-2 border-blue-500 bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:border-blue-600 active:scale-95"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Generate
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {isEditing
                    ? "Tracking number cannot be changed in edit mode"
                    : "Format: CJS-TIMESTAMP-RANDOM-CHECKSUM"}
                </p>
                {trackingError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700">{trackingError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Package Details */}
            {/* ─── FIX 8: Removed the broken unclosed <div> nesting.          ─── */}
            {/* ─── All fields are now inside one clean <div className="space-y-4"> */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Package Details
              </h3>

              {/* Customer Selection — new packages only */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *{" "}
                    {selectedCustomer && (
                      <span className="text-green-600 text-xs">
                        (Info will be auto-saved)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                      value={selectedCustomer?.userCode || ""}
                      onChange={(e) => selectCustomer(e.target.value)}
                      required
                    >
                      <option value="">Select a customer...</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer.userCode}>
                          {customer.firstName} {customer.lastName} (
                          {customer.userCode})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {selectedCustomer && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Selected Customer Information:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                        <div>
                          <span className="font-semibold">Name:</span>{" "}
                          {selectedCustomer.firstName}{" "}
                          {selectedCustomer.lastName}
                        </div>
                        <div>
                          <span className="font-semibold">Code:</span>{" "}
                          {selectedCustomer.userCode}
                        </div>
                        <div>
                          <span className="font-semibold">Email:</span>{" "}
                          {selectedCustomer.email}
                        </div>
                        {selectedCustomer.phone && (
                          <div>
                            <span className="font-semibold">Phone:</span>{" "}
                            {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 mt-2 italic">
                        ✓ This information will be automatically stored with the
                        package
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Info — edit mode only */}
              {isEditing && selectedCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Information
                  </label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Customer Details:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                      <div>
                        <span className="font-semibold">Name:</span>{" "}
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </div>
                      <div>
                        <span className="font-semibold">Code:</span>{" "}
                        {selectedCustomer.userCode}
                      </div>
                      <div>
                        <span className="font-semibold">Email:</span>{" "}
                        {selectedCustomer.email}
                      </div>
                      {selectedCustomer.phone && (
                        <div>
                          <span className="font-semibold">Phone:</span>{" "}
                          {selectedCustomer.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Weight (pounds) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (lb) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. 5.5"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({ ...form, weight: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Package weight in pounds (lb)
                </p>
              </div>

              {/* Item value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item value
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                  value={form.itemValue}
                  onChange={(e) =>
                    setForm({ ...form, itemValue: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Declared value in selected payment currency
                </p>
              </div>

              {/* Shipper */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipper
                </label>
                <input
                  type="text"
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={form.shipper}
                  onChange={(e) =>
                    setForm({ ...form, shipper: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch / Warehouse
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={form.branch}
                    onChange={(e) =>
                      setForm({ ...form, branch: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pieces
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={form.pieces}
                    onChange={(e) =>
                      setForm({ ...form, pieces: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Service Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Mode
                </label>
                <div className="relative">
                  <select
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                    value={form.serviceMode}
                    onChange={(e) =>
                      setForm({ ...form, serviceMode: e.target.value })
                    }
                  >
                    <option value="air">Air</option>
                    <option value="ocean">Ocean</option>
                    <option value="local">Local</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Total Amount - Only used when manual charges are NOT set */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total amount (Automatic Calculation)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`block w-full rounded-lg border-2 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${
                      (form.regularCharge || form.customCharge) 
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="0.00"
                    value={form.totalAmount}
                    onFocus={() => setShowPaymentOptions(true)}
                    onChange={(e) => {
                      setShowPaymentOptions(true);
                      setForm({ ...form, totalAmount: e.target.value });
                    }}
                    disabled={!!(form.regularCharge || form.customCharge)}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(form.regularCharge || form.customCharge) 
                    ? "Disabled when manual charges are set. Invoice will use manual charges only."
                    : "Total payment amount (used only if manual charges are not set)"
                  }
                </p>
              </div>

              {showPaymentOptions && (
                <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Payment currency</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select currency
                    </label>
                    <div className="relative">
                      <select
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                        value={form.paymentCurrency}
                        onChange={(e) =>
                          setForm({ ...form, paymentCurrency: e.target.value })
                        }
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code}) — {c.symbol}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Amounts use {selectedCurrencyName} ({form.paymentCurrency}) — symbol {currencySymbol}
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Charges Section */}
              <div className={`rounded-xl border-2 p-4 space-y-4 ${
                (form.regularCharge || form.customCharge) 
                  ? 'border-green-200 bg-green-50/50' 
                  : 'border-orange-100 bg-orange-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Manual Charges (Invoice Calculation)</h4>
                  {(form.regularCharge || form.customCharge) ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : form.totalAmount && parseFloat(form.totalAmount) > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                      Disabled
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-600">
                  {form.totalAmount && parseFloat(form.totalAmount) > 0
                    ? "Disabled when Total amount is set. Clear Total amount to use manual charges."
                    : "When set, invoice will use ONLY these charges (no weight/shipping cost). Total Invoice = Regular Charge + Custom Charge"
                  }
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Regular Charge
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`block w-full rounded-lg border-2 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${
                        form.totalAmount && parseFloat(form.totalAmount) > 0
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      value={form.regularCharge}
                      onChange={(e) =>
                        setForm({ ...form, regularCharge: e.target.value })
                      }
                      disabled={!!(form.totalAmount && parseFloat(form.totalAmount) > 0)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Charge
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`block w-full rounded-lg border-2 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${
                        form.totalAmount && parseFloat(form.totalAmount) > 0
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      value={form.customCharge}
                      onChange={(e) =>
                        setForm({ ...form, customCharge: e.target.value })
                      }
                      disabled={!!(form.totalAmount && parseFloat(form.totalAmount) > 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charge Currency
                  </label>
                  <div className="relative">
                    <select
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white"
                      value={form.chargeCurrency}
                      onChange={(e) =>
                        setForm({ ...form, chargeCurrency: e.target.value })
                      }
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code}) — {c.symbol}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Currency for manual charges (default: JMD)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-gray-900">
                    Total Invoice: {(Number(form.regularCharge) || 0) + (Number(form.customCharge) || 0)} {form.chargeCurrency}
                  </p>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">
                  Package Dimensions
                </h4>
                <div className="grid gap-4 md:grid-cols-4">
                  {(["length", "width", "height"] as const).map((dim) => (
                    <div key={dim}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                        {dim} (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="0.0"
                        value={form.dimensions[dim]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dimensions: {
                              ...form.dimensions,
                              [dim]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <div className="relative">
                      <select
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        value={form.dimensions.unit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dimensions: {
                              ...form.dimensions,
                              unit: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="cm">cm</option>
                        <option value="in">inches</option>
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                  placeholder="Package contents or description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              {/* Item Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Description
                </label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={2}
                  placeholder="Detailed item description (optional)"
                  value={form.itemDescription}
                  onChange={(e) =>
                    setForm({ ...form, itemDescription: e.target.value })
                  }
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Status (Warehouse Location)
                </label>
                <div className="relative">
                  <select
                    className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="0">Package Received</option>
                    <option value="1">At Warehouse</option>
                    <option value="2">Processing</option>
                    <option value="3">Ready for Shipment</option>
                    <option value="4">In Transit</option>
                    <option value="5">Arrived at Destination</option>
                    <option value="6">Customs Clearance</option>
                    <option value="7">Ready for Pickup / Delivery</option>
                    <option value="8">Out for Delivery</option>
                    <option value="9">Delivered</option>
                    <option value="10">Picked Up</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Current:{" "}
                  <span className="font-semibold text-blue-600">
                    {form.status === '0' ? 'Package Received' :
                     form.status === '1' ? 'At Warehouse' :
                     form.status === '2' ? 'Processing' :
                     form.status === '3' ? 'Ready for Shipment' :
                     form.status === '4' ? 'In Transit' :
                     form.status === '5' ? 'Arrived at Destination' :
                     form.status === '6' ? 'Customs Clearance' :
                     form.status === '7' ? 'Ready for Pickup / Delivery' :
                     form.status === '8' ? 'Out for Delivery' :
                     form.status === '9' ? 'Delivered' :
                     form.status === '10' ? 'Picked Up' : form.status}
                  </span>
                </p>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={2}
                  placeholder="Any special handling instructions (optional)"
                  value={form.specialInstructions}
                  onChange={(e) =>
                    setForm({ ...form, specialInstructions: e.target.value })
                  }
                />
              </div>

              {/* ─── FIX 9: Added missing "Sender Information" section header ─── */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-1">
                  Sender Information
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Enter details about who is sending this package
                </p>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Name
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Enter sender name"
                        value={form.senderName}
                        onChange={(e) =>
                          setForm({ ...form, senderName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Email
                      </label>
                      <input
                        type="email"
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="sender@example.com"
                        value={form.senderEmail}
                        onChange={(e) =>
                          setForm({ ...form, senderEmail: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Phone
                      </label>
                      <input
                        type="tel"
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="+1234567890"
                        value={form.senderPhone}
                        onChange={(e) =>
                          setForm({ ...form, senderPhone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Country
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Country"
                        value={form.senderCountry}
                        onChange={(e) =>
                          setForm({ ...form, senderCountry: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sender Address
                    </label>
                    <textarea
                      className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      rows={2}
                      placeholder="Enter sender address"
                      value={form.senderAddress}
                      onChange={(e) =>
                        setForm({ ...form, senderAddress: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* ── end .space-y-4 ── */}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/admin/packages"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isEditing ? "Updating Package..." : "Creating Package..."}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {isEditing ? "Update Package" : "Create Package"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminAddPackagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              Loading add package...
            </p>
          </div>
        </div>
      }
    >
      <AdminAddPackagePageContent />
    </Suspense>
  );
}