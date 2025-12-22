"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Package, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Calculator,
  Globe,
  Weight,
  AlertCircle
} from "lucide-react";

type PricingRule = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  weightMin: number;
  weightMax: number;
  baseRate: number;
  perKgRate: number;
  currency: string;
  active: boolean;
};

export default function RateCalculatorPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Calculator state
  const [calcWeight, setCalcWeight] = useState("");
  const [calcOrigin, setCalcOrigin] = useState("");
  const [calcDest, setCalcDest] = useState("");
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcDetails, setCalcDetails] = useState<{ baseRate: number; perKgRate: number; weight: number; total: number } | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      const res = await fetch("/api/admin/pricing-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function calculateRate() {
    setCalcError(null);
    setCalcDetails(null);
    
    const weight = parseFloat(calcWeight);
    
    // Validation
    if (!calcWeight.trim()) {
      setCalcError("Please enter a weight");
      setCalcResult(null);
      return;
    }
    
    if (isNaN(weight) || weight <= 0) {
      setCalcError("Weight must be a positive number");
      setCalcResult(null);
      return;
    }
    
    if (!calcOrigin.trim()) {
      setCalcError("Please enter an origin");
      setCalcResult(null);
      return;
    }
    
    if (!calcDest.trim()) {
      setCalcError("Please enter a destination");
      setCalcResult(null);
      return;
    }

    // Find matching rule
    const matchingRule = rules.find(r => 
      r.active &&
      r.origin.toLowerCase() === calcOrigin.toLowerCase().trim() &&
      r.destination.toLowerCase() === calcDest.toLowerCase().trim() &&
      weight >= r.weightMin &&
      weight <= r.weightMax
    );

    if (matchingRule) {
      const baseRate = matchingRule.baseRate;
      const perKgRate = matchingRule.perKgRate;
      const weightCost = weight * perKgRate;
      const total = baseRate + weightCost;
      
      setCalcResult(total);
      setCalcDetails({
        baseRate,
        perKgRate,
        weight,
        total
      });
      setCalcError(null);
    } else {
      // Show a more helpful error message
      const availableRules = rules.filter(r => r.active);
      if (availableRules.length === 0) {
        setCalcError("No pricing rules are configured. Please add pricing rules first.");
      } else {
        const originMatches = availableRules.filter(r => 
          r.origin.toLowerCase() === calcOrigin.toLowerCase().trim()
        );
        const destMatches = availableRules.filter(r => 
          r.destination.toLowerCase() === calcDest.toLowerCase().trim()
        );
        
        let errorMsg = "No pricing rule found for these parameters. ";
        if (originMatches.length === 0) {
          errorMsg += `No rules found for origin: ${calcOrigin}. `;
        }
        if (destMatches.length === 0) {
          errorMsg += `No rules found for destination: ${calcDest}. `;
        }
        if (originMatches.length > 0 && destMatches.length > 0) {
          errorMsg += `Weight ${weight}kg is outside the available weight ranges. `;
          const ranges = originMatches
            .filter(r => r.destination.toLowerCase() === calcDest.toLowerCase().trim())
            .map(r => `${r.weightMin}-${r.weightMax}kg`);
          if (ranges.length > 0) {
            errorMsg += `Available ranges: ${ranges.join(', ')}`;
          }
        }
        setCalcError(errorMsg);
      }
      setCalcResult(null);
      setCalcDetails(null);
    }
  }

  async function saveRule(rule: Partial<PricingRule>) {
    try {
      const res = await fetch("/api/admin/pricing-rules", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule)
      });

      if (res.ok) {
        await loadRules();
        setShowForm(false);
        setEditing(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this pricing rule?")) return;
    
    try {
      const res = await fetch(`/api/admin/pricing-rules?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await loadRules();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />

          <div className="relative flex flex-col gap-6">
            
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Rate Calculator
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Manage shipping rates and calculate costs
                </p>
              </div>

              <button 
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Add Pricing Rule
              </button>
            </div>
          </div>
        </header>

        {/* Quick Calculator */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-6 h-6 text-[#0f4d8a]" />
            <h2 className="text-xl font-semibold text-slate-800">Quick Rate Calculator</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                placeholder="5.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Origin</label>
              <input
                type="text"
                value={calcOrigin}
                onChange={(e) => setCalcOrigin(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                placeholder="USA"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
              <input
                type="text"
                value={calcDest}
                onChange={(e) => setCalcDest(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]"
                placeholder="Pakistan"
              />
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={calculateRate}
                className="w-full px-4 py-2 rounded-lg bg-[#E67919] text-white font-medium hover:bg-[#d66f15] transition-colors"
              >
                Calculate
              </button>
            </div>
          </div>
          
          {calcError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Calculation Error</p>
                  <p className="text-sm text-red-700 mt-1">{calcError}</p>
                </div>
              </div>
            </div>
          )}
          
          {calcResult !== null && calcDetails && (
            <div className="mt-4 space-y-3">
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-green-800 font-semibold text-lg">Estimated Cost:</span>
                  <span className="text-3xl font-bold text-green-700">{calcDetails.baseRate > 0 ? '$' : ''}{calcResult.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-green-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Base Rate:</span>
                    <span className="font-medium text-green-800">${calcDetails.baseRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Weight Cost ({calcDetails.weight}kg × ${calcDetails.perKgRate.toFixed(2)}/kg):</span>
                    <span className="font-medium text-green-800">${(calcDetails.weight * calcDetails.perKgRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-green-200">
                    <span className="text-green-800 font-semibold">Total:</span>
                    <span className="font-bold text-green-900">${calcResult.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Rules List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Pricing Rules</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Weight Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Base Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Per Kg</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{rule.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {rule.origin} → {rule.destination}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {rule.weightMin} - {rule.weightMax} kg
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      ${rule.baseRate}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                      ${rule.perKgRate}/kg
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditing(rule);
                          setShowForm(true);
                        }}
                        className="inline-flex items-center px-3 py-1 rounded-lg border border-[#0f4d8a] text-[#0f4d8a] hover:bg-[#0f4d8a] hover:text-white transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="inline-flex items-center px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Pricing Rule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editing ? 'Edit' : 'Add'} Pricing Rule
              </h2>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const rule = {
                  id: editing?.id,
                  name: formData.get('name') as string,
                  origin: formData.get('origin') as string,
                  destination: formData.get('destination') as string,
                  weightMin: parseFloat(formData.get('weightMin') as string),
                  weightMax: parseFloat(formData.get('weightMax') as string),
                  baseRate: parseFloat(formData.get('baseRate') as string),
                  perKgRate: parseFloat(formData.get('perKgRate') as string),
                  currency: formData.get('currency') as string,
                  active: formData.get('active') === 'on',
                };
                saveRule(rule);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editing?.name || ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      placeholder="e.g., Standard Shipping"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Origin *
                      </label>
                      <input
                        type="text"
                        name="origin"
                        required
                        defaultValue={editing?.origin || ''}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                        placeholder="e.g., USA"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Destination *
                      </label>
                      <input
                        type="text"
                        name="destination"
                        required
                        defaultValue={editing?.destination || ''}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                        placeholder="e.g., Pakistan"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Min Weight (kg) *
                      </label>
                      <input
                        type="number"
                        name="weightMin"
                        required
                        step="0.01"
                        min="0"
                        defaultValue={editing?.weightMin || '0'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                        placeholder="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Max Weight (kg) *
                      </label>
                      <input
                        type="number"
                        name="weightMax"
                        required
                        step="0.01"
                        min="0"
                        defaultValue={editing?.weightMax || '100'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Base Rate ({editing?.currency || 'USD'}) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-500">$</span>
                        </div>
                        <input
                          type="number"
                          name="baseRate"
                          required
                          step="0.01"
                          min="0"
                          defaultValue={editing?.baseRate || ''}
                          className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                          placeholder="10.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Per Kg Rate ({editing?.currency || 'USD'}) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-500">$</span>
                        </div>
                        <input
                          type="number"
                          name="perKgRate"
                          required
                          step="0.01"
                          min="0"
                          defaultValue={editing?.perKgRate || ''}
                          className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                          placeholder="2.50"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      defaultChecked={editing ? editing.active : true}
                      className="h-4 w-4 text-[#0f4d8a] focus:ring-[#0f4d8a] border-slate-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-slate-700">
                      Active
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#0e447d]"
                  >
                    {editing ? 'Update' : 'Create'} Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}