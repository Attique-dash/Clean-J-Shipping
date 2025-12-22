// my-app/src/app/admin/invoices/generator/page.tsx
"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Save, Download, Send, User, Package, DollarSign, Calendar } from "lucide-react";
import { ExportService } from "@/lib/export-service";
import toast, { Toaster } from "react-hot-toast";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  userCode: string;
  address?: string;
};

export default function InvoiceGeneratorPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    generateInvoiceNumber();
  }, []);

  async function loadCustomers() {
    try {
      const res = await fetch("/api/admin/customers", {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load customers:", data?.error);
        return;
      }
      const customerList = data.customers?.map((c: any) => ({
        id: c.customer_id,
        name: c.full_name,
        email: c.email,
        userCode: c.userCode || c.user_code,
        address: c.address ? `${c.address.street || ''}, ${c.address.city || ''}`.trim() : '',
      })) || [];
      setCustomers(customerList);
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  }

  function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setInvoiceNumber(`INV-${year}${month}-${random}`);
  }

  function addItem() {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: any) {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  }

  function removeItem(id: string) {
    setItems(items.filter(item => item.id !== id));
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  async function saveInvoice() {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }
    const hasEmptyDescription = items.some((item) => !item.description || item.description.trim().length === 0);
    if (hasEmptyDescription) {
      alert("Please fill in a description for each item");
      return;
    }

    setLoading(true);
    try {
      // Map to main Invoice model shape so records appear on /admin/invoices
      const payload = {
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          address: selectedCustomer.address || "N/A",
          city: "N/A",
          country: "N/A",
        },
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: taxRate,
          amount: 0,
          taxAmount: 0,
          total: 0,
        })),
        status: "draft",
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        paymentTerms: 30,
        currency: "USD",
        amountPaid: 0,
        notes,
      };

      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let message = "Failed to save invoice";
        try {
          const errorBody = await res.json();
          if (errorBody?.error) {
            message = typeof errorBody.error === "string" ? errorBody.error : JSON.stringify(errorBody.error);
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const result = await res.json();
      toast.success("Invoice saved successfully!", {
        duration: 4000,
        icon: "✅",
        style: {
          background: "#10b981",
          color: "#fff",
          padding: "16px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
        },
      });
      resetForm();
    } catch (error) {
      console.error("Save invoice error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save invoice";
      toast.error(errorMessage, {
        duration: 5000,
        icon: "❌",
        style: {
          background: "#ef4444",
          color: "#fff",
          padding: "16px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  function exportInvoice(format: 'pdf' | 'excel') {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    if (format === 'excel') {
      const invoiceData = {
        'Invoice Number': invoiceNumber,
        'Customer': selectedCustomer.name,
        'Email': selectedCustomer.email,
        'Issue Date': issueDate,
        'Due Date': dueDate,
        'Subtotal': subtotal.toFixed(2),
        'Discount': `${discount}% ($${discountAmount.toFixed(2)})`,
        'Tax': `${taxRate}% ($${taxAmount.toFixed(2)})`,
        'Total': total.toFixed(2),
      };

      const itemsData = items.map(item => ({
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit Price': item.unitPrice.toFixed(2),
        'Total': item.total.toFixed(2),
      }));

      ExportService.toExcelMultiSheet([
        { name: 'Invoice', data: [invoiceData] },
        { name: 'Items', data: itemsData },
      ], `invoice_${invoiceNumber}`);
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    generateInvoiceNumber();
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate("");
    setItems([]);
    setNotes("");
    setDiscount(0);
  }

  return (
    <>
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          // Success toast
          success: {
            duration: 4000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          // Error toast
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Invoice Generator
            </h1>
            <p className="text-slate-600 mt-1">Create professional invoices for customers</p>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Reset Form
          </button>
        </div>

        {/* Main Invoice Form */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </h2>
              <span className="text-white font-mono text-lg">{invoiceNumber}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer & Dates Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Select Customer *
                </label>
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  required
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.userCode})
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm">
                    <p className="text-slate-700">📧 {selectedCustomer.email}</p>
                    {selectedCustomer.address && (
                      <p className="text-slate-600 mt-1">📍 {selectedCustomer.address}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Line Items
                </h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E67919] text-white font-medium hover:bg-[#d66f15] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-3 items-start p-4 bg-slate-50 rounded-lg">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0f4d8a] text-white font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 focus:border-[#0f4d8a] focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-[#0f4d8a] focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-[#0f4d8a] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 min-w-[80px] text-right">
                        ${item.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No items added yet. Click "Add Item" to start.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-[#0f4d8a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-[#0f4d8a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-[#0f4d8a] focus:outline-none resize-none"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border-2 border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Invoice Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}%):</span>
                      <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Total:</span>
                    <span className="text-2xl font-bold text-[#0f4d8a]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={saveInvoice}
                disabled={loading || !selectedCustomer || items.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Invoice'}
              </button>
              
              <button
                onClick={() => exportInvoice('excel')}
                disabled={!selectedCustomer || items.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#0f4d8a] text-[#0f4d8a] font-medium hover:bg-[#0f4d8a] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}