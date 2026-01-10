"use client";

import { useState, useEffect } from "react";
import { Calculator, DollarSign, Package, Settings, HelpCircle } from "lucide-react";
import Loading from "@/components/Loading";

interface ShippingSettings {
  baseRate: number; // JMD per first lb
  additionalRate: number; // JMD per additional lb
  customsDutyRate: number; // Percentage (e.g., 15 for 15%)
  customsThreshold: number; // USD value threshold for customs duty
  storageFreeDays: number; // Free storage days
  storageDailyRate: number; // JMD per day after free period
  exchangeRate: number; // USD to JMD conversion rate
}

export default function ShippingChargesSettings() {
  const [settings, setSettings] = useState<ShippingSettings>({
    baseRate: 700,
    additionalRate: 350,
    customsDutyRate: 15,
    customsThreshold: 100,
    storageFreeDays: 7,
    storageDailyRate: 50,
    exchangeRate: 155,
  });

  const [loading, setLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculation, setCalculation] = useState({
    itemValue: 0,
    weight: 0,
    shippingCost: 0,
    customsDuty: 0,
    total: 0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/shipping-charges");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load shipping settings:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/shipping-charges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Shipping charges settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const calculateShippingCost = () => {
    const { itemValue, weight } = calculation;
    
    // Convert item value from USD to JMD
    const itemValueJmd = itemValue * settings.exchangeRate;
    
    // Calculate shipping cost based on weight
    const weightLbs = weight * 2.20462;
    const shippingCostJmd = weightLbs <= 0 ? 0 : 
      settings.baseRate + Math.max(0, Math.ceil(weightLbs) - 1) * settings.additionalRate;
    
    // Calculate customs duty
    const customsDutyJmd = itemValue > settings.customsThreshold ? 
      itemValueJmd * (settings.customsDutyRate / 100) : 0;
    
    // Calculate storage (if applicable)
    const storageCost = 0; // Would need days in storage info
    
    setCalculation({
      ...calculation,
      shippingCost: shippingCostJmd,
      customsDuty: customsDutyJmd,
      total: itemValueJmd + shippingCostJmd + customsDutyJmd + storageCost,
    });
  };

  const formatCurrency = (amount: number, currency = "JMD") => {
    return new Intl.NumberFormat("en-JM", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return <Loading message="Loading shipping charges settings..." />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Shipping Charges Settings</h1>
        </div>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Calculator className="w-4 h-4" />
          {showCalculator ? "Hide" : "Show"} Calculator
        </button>
      </div>

      {showCalculator && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Shipping Cost Calculator
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Value (USD)
              </label>
              <input
                type="number"
                value={calculation.itemValue}
                onChange={(e) => setCalculation({...calculation, itemValue: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={calculation.weight}
                onChange={(e) => setCalculation({...calculation, weight: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            onClick={calculateShippingCost}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
          >
            Calculate Total Cost
          </button>

          {(calculation.shippingCost > 0 || calculation.customsDuty > 0) && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold mb-3">Cost Breakdown:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Item Value (JMD):</span>
                  <span className="font-medium">{formatCurrency(calculation.itemValue * settings.exchangeRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Cost:</span>
                  <span className="font-medium">{formatCurrency(calculation.shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customs Duty ({settings.customsDutyRate}%):</span>
                  <span className="font-medium">{formatCurrency(calculation.customsDuty)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Cost:</span>
                  <span className="text-blue-600">{formatCurrency(calculation.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Shipping Rate Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Rate (JMD)
              <span className="ml-1 text-xs text-gray-500">First pound</span>
            </label>
            <input
              type="number"
              value={settings.baseRate}
              onChange={(e) => setSettings({...settings, baseRate: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Rate (JMD)
              <span className="ml-1 text-xs text-gray-500">Per additional pound</span>
            </label>
            <input
              type="number"
              value={settings.additionalRate}
              onChange={(e) => setSettings({...settings, additionalRate: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customs Duty Rate (%)
            </label>
            <input
              type="number"
              value={settings.customsDutyRate}
              onChange={(e) => setSettings({...settings, customsDutyRate: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customs Threshold (USD)
            </label>
            <input
              type="number"
              value={settings.customsThreshold}
              onChange={(e) => setSettings({...settings, customsThreshold: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Storage Days
            </label>
            <input
              type="number"
              value={settings.storageFreeDays}
              onChange={(e) => setSettings({...settings, storageFreeDays: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Daily Rate (JMD)
            </label>
            <input
              type="number"
              value={settings.storageDailyRate}
              onChange={(e) => setSettings({...settings, storageDailyRate: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exchange Rate (USD to JMD)
            </label>
            <input
              type="number"
              value={settings.exchangeRate}
              onChange={(e) => setSettings({...settings, exchangeRate: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">How shipping costs are calculated:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Base rate applies to the first pound of weight</li>
                <li>Additional rate applies to each subsequent pound</li>
                <li>Customs duty applies if item value exceeds threshold</li>
                <li>Storage fees apply after free storage period</li>
                <li>All amounts are calculated in JMD using current exchange rate</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
