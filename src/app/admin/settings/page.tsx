"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, DollarSign, Percent, Truck, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type SettingCategory = "currency" | "tax" | "shipping" | "general";

interface Setting {
  key: string;
  value: unknown;
  description?: string;
  updatedAt?: string;
}

interface SettingsData {
  currency?: Setting[];
  tax?: Setting[];
  shipping?: Setting[];
  general?: Setting[];
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({});
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load settings");

      const grouped = data.settings || {};
      setSettings(grouped);

      // Initialize form data
      const flat: Record<string, unknown> = {};
      Object.values(grouped).forEach((categorySettings: unknown) => {
        (categorySettings as Setting[]).forEach((setting) => {
          flat[setting.key] = setting.value;
        });
      });
      setFormData(flat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert formData to settings array format
      const settingsArray = Object.entries(formData).map(([key, value]) => {
        // Find the category for this key
        let category: SettingCategory = "general";
        if (key.includes("currency") || key.includes("Currency")) category = "currency";
        else if (key.includes("tax") || key.includes("Tax") || key.includes("rate")) category = "tax";
        else if (key.includes("shipping") || key.includes("Shipping")) category = "shipping";

        return {
          key,
          value,
          category,
        };
      });

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsArray }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save settings");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  const categories: Array<{ id: SettingCategory; label: string; icon: typeof SettingsIcon; color: string }> = [
    { id: "currency", label: "Currency Settings", icon: DollarSign, color: "from-green-500 to-emerald-600" },
    { id: "tax", label: "Tax Rates", icon: Percent, color: "from-blue-500 to-cyan-600" },
    { id: "shipping", label: "Shipping Rules", icon: Truck, color: "from-orange-500 to-red-600" },
    { id: "general", label: "General Settings", icon: SettingsIcon, color: "from-purple-500 to-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  System Settings
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Configure system-wide settings, currency, tax rates, and shipping rules
                </p>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                System Settings
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Configure system-wide settings, currency, tax rates, and shipping rules
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-white hover:bg-white/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </header>

        {/* Success/Error Messages */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Settings Categories */}
        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const categorySettings = settings[category.id] || [];

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
              >
                <div className={`mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r ${category.color} p-4 text-white`}>
                  <Icon className="h-6 w-6" />
                  <h2 className="text-xl font-bold">{category.label}</h2>
                </div>

                <div className="space-y-4">
                  {categorySettings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No settings configured for this category.</p>
                      <p className="text-sm mt-2">Settings will be created when you save values.</p>
                    </div>
                  ) : (
                    categorySettings.map((setting) => (
                      <div key={setting.key} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {setting.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </label>
                        {setting.description && (
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        )}
                        <input
                          type={typeof setting.value === "number" ? "number" : "text"}
                          value={String(formData[setting.key] ?? setting.value ?? "")}
                          onChange={(e) => {
                            const value = typeof setting.value === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
                            updateSetting(setting.key, value);
                          }}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder={`Enter ${setting.key}`}
                        />
                      </div>
                    ))
                  )}

                  {/* Default settings for each category if none exist */}
                  {categorySettings.length === 0 && (
                    <div className="space-y-4">
                      {category.id === "currency" && (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                            <input
                              type="text"
                              value={String(formData["default_currency"] ?? "USD")}
                              onChange={(e) => updateSetting("default_currency", e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="USD"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                            <input
                              type="text"
                              value={String(formData["currency_symbol"] ?? "$")}
                              onChange={(e) => updateSetting("currency_symbol", e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="$"
                            />
                          </div>
                        </>
                      )}
                      {category.id === "tax" && (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={String(formData["default_tax_rate"] ?? "0")}
                              onChange={(e) => updateSetting("default_tax_rate", parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">GCT Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={String(formData["gct_rate"] ?? "15")}
                              onChange={(e) => updateSetting("gct_rate", parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="15"
                            />
                          </div>
                        </>
                      )}
                      {category.id === "shipping" && (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Default Shipping Method</label>
                            <input
                              type="text"
                              value={String(formData["default_shipping_method"] ?? "standard")}
                              onChange={(e) => updateSetting("default_shipping_method", e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="standard"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Default Shipping Cost</label>
                            <input
                              type="number"
                              step="0.01"
                              value={String(formData["default_shipping_cost"] ?? "0")}
                              onChange={(e) => updateSetting("default_shipping_cost", parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="0"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

