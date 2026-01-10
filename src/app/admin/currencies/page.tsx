"use client";

import { useEffect, useState } from "react";
import { DollarSign, Plus, ChevronLeft, ChevronRight, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";
import Loading from "@/components/Loading";

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  format: string;
  isActive: boolean;
  lastUpdated?: string;
}

export default function CurrencyManagementPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: "",
    decimalPlaces: "2",
    format: ""
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadCurrencies() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/currencies");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load currencies");
      setCurrencies(data.currencies || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load currencies" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrencies();
  }, []);

  async function toggleCurrency(currencyCode: string, isActive: boolean) {
    setUpdating(currencyCode);
    try {
      const res = await fetch("/api/admin/currencies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update currency");
      
      setMessage({ type: "success", text: data.message });
      await loadCurrencies();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update currency" });
    } finally {
      setUpdating(null);
    }
  }

  async function addCurrency(e: React.FormEvent) {
    e.preventDefault();
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol || !newCurrency.format) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    try {
      const res = await fetch("/api/admin/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCurrency,
          exchangeRate: parseFloat(newCurrency.exchangeRate) || 1.0,
          decimalPlaces: parseInt(newCurrency.decimalPlaces) || 2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add currency");
      
      setMessage({ type: "success", text: data.message });
      setNewCurrency({ code: "", name: "", symbol: "", exchangeRate: "", decimalPlaces: "2", format: "" });
      setShowAddForm(false);
      await loadCurrencies();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to add currency" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Currency Management</h1>
                <p className="text-sm text-gray-600">Manage available currencies for your customers</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadCurrencies}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Currency</span>
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Currency Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Currency</h2>
            <form onSubmit={addCurrency} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code *</label>
                <input
                  type="text"
                  placeholder="e.g., JMD"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Jamaican Dollar"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
                <input
                  type="text"
                  placeholder="e.g., J$"
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (to USD)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 155.50"
                  value={newCurrency.exchangeRate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, exchangeRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
                <select
                  value={newCurrency.decimalPlaces}
                  onChange={(e) => setNewCurrency({ ...newCurrency, decimalPlaces: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">0</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format *</label>
                <input
                  type="text"
                  placeholder="e.g., J$1,234.56"
                  value={newCurrency.format}
                  onChange={(e) => setNewCurrency({ ...newCurrency, format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Currency
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Currencies List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Currencies</h2>
          </div>
          
          {loading ? (
            <Loading message="Loading currencies..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currencies.map((currency) => (
                    <tr key={currency._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{currency.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{currency.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{currency.symbol}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{currency.exchangeRate}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{currency.format}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          currency.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {currency.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleCurrency(currency.code, !currency.isActive)}
                          disabled={updating === currency.code}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {updating === currency.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : currency.isActive ? (
                            <ChevronRight className="h-5 w-5" />
                          ) : (
                            <ChevronLeft className="h-5 w-5" />
                          )}
                          <span>{currency.isActive ? "Deactivate" : "Activate"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Active currencies</strong> will appear in the currency selector for customers</li>
            <li>• <strong>Inactive currencies</strong> are hidden from customers but remain in the system</li>
            <li>• <strong>Jamaican Dollar (JMD)</strong> is set as the primary Caribbean currency</li>
            <li>• Exchange rates are updated automatically from external API</li>
            <li>• You can add new currencies using the &quot;Add Currency&quot; button</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
