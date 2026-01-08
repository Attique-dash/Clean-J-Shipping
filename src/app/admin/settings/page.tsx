"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, Edit2, Trash2, DollarSign, Package, Shield } from "lucide-react";

type Service = {
  _id: string;
  name: string;
  description: string;
  serviceType: 'storage' | 'shipping' | 'customs' | 'delivery' | 'handling' | 'other';
  unitPrice: number;
  isActive: boolean;
  isDefault: boolean;
  calculationMethod: 'fixed' | 'per_kg' | 'per_day' | 'per_package';
  conditions?: {
    packageStatus?: string[];
    weightRange?: {
      min?: number;
      max?: number;
    };
    branch?: string[];
    daysInStorage?: {
      min?: number;
      max?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    serviceType: Service['serviceType'];
    unitPrice: number;
    isActive: boolean;
    isDefault: boolean;
    calculationMethod: Service['calculationMethod'];
    conditions: {
      packageStatus: string[];
      weightRange: { min: number; max: number };
      branch: string[];
      daysInStorage: { min: number; max: number };
    };
  }>({
    name: '',
    description: '',
    serviceType: 'other',
    unitPrice: 0,
    isActive: true,
    isDefault: false,
    calculationMethod: 'fixed',
    conditions: {
      packageStatus: [],
      weightRange: { min: 0, max: 0 },
      branch: [],
      daysInStorage: { min: 0, max: 0 }
    }
  });

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load services");
      }
      
      setServices(data.services || []);
    } catch (error) {
      console.error("Failed to load services:", error);
      alert('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveService() {
    if (!formData.name || !formData.description || !formData.serviceType) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload: {
        id?: string;
        name: string;
        description: string;
        serviceType: Service['serviceType'];
        unitPrice: number;
        isActive: boolean;
        isDefault: boolean;
        calculationMethod: Service['calculationMethod'];
        conditions: {
          packageStatus?: string[];
          weightRange?: { min: number; max: number };
          branch?: string[];
          daysInStorage?: { min: number; max: number };
        };
      } = {
        name: formData.name,
        description: formData.description,
        serviceType: formData.serviceType,
        unitPrice: formData.unitPrice,
        isActive: formData.isActive,
        isDefault: formData.isDefault,
        calculationMethod: formData.calculationMethod,
        conditions: {
          packageStatus: formData.conditions.packageStatus.length > 0 ? formData.conditions.packageStatus : undefined,
          weightRange: (formData.conditions.weightRange.min > 0 || formData.conditions.weightRange.max > 0) ? formData.conditions.weightRange : undefined,
          branch: formData.conditions.branch.length > 0 ? formData.conditions.branch : undefined,
          daysInStorage: {
            min: formData.conditions.daysInStorage.min,
            max: formData.conditions.daysInStorage.max
          }
        }
      };

      const url = editingService ? '/api/admin/services' : '/api/admin/services';
      const method = editingService ? 'PUT' : 'POST';
      
      if (editingService) {
        payload.id = editingService._id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save service');
      }
      
      setShowModal(false);
      resetForm();
      await loadServices();
    } catch (error) {
      console.error('Save service error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save service');
    } finally {
      setLoading(false);
    }
  }

  async function deleteService(serviceId: string) {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services?id=${serviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete service');
      }
      
      await loadServices();
    } catch (error) {
      console.error('Delete service error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete service');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      serviceType: 'other',
      unitPrice: 0,
      isActive: true,
      isDefault: false,
      calculationMethod: 'fixed',
      conditions: {
        packageStatus: [],
        weightRange: { min: 0, max: 0 },
        branch: [],
        daysInStorage: { min: 0, max: 0 }
      }
    });
    setEditingService(null);
  }

  function openModal(service?: Service) {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        serviceType: service.serviceType,
        unitPrice: service.unitPrice,
        isActive: service.isActive,
        isDefault: service.isDefault,
        calculationMethod: service.calculationMethod,
        conditions: {
          packageStatus: service.conditions?.packageStatus || [],
          weightRange: {
            min: service.conditions?.weightRange?.min ?? 0,
            max: service.conditions?.weightRange?.max ?? 0
          },
          branch: service.conditions?.branch || [],
          daysInStorage: {
            min: service.conditions?.daysInStorage?.min ?? 0,
            max: service.conditions?.daysInStorage?.max ?? 0
          }
        }
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  }

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'storage': return <Package className="w-4 h-4" />;
      case 'shipping': return <Package className="w-4 h-4" />;
      case 'customs': return <Shield className="w-4 h-4" />;
      case 'delivery': return <Package className="w-4 h-4" />;
      case 'handling': return <Package className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'storage': return 'bg-blue-100 text-blue-700';
      case 'shipping': return 'bg-green-100 text-green-700';
      case 'customs': return 'bg-purple-100 text-purple-700';
      case 'delivery': return 'bg-orange-100 text-orange-700';
      case 'handling': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section - Matching Rate Calculator Style */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                  Service Settings
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Configure available services for invoice generation
                </p>
              </div>

              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/25 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Add Service
              </button>
            </div>
          </div>
        </header>

        {/* Services List - Matching Rate Calculator Table Style */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Available Services</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No services configured</p>
              <p className="text-sm text-gray-400 mt-1">Add services to enable them in invoice generation</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {services.map((service) => (
                    <tr key={service._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{service.name}</span>
                          {service.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getServiceColor(service.serviceType)}`}>
                          {getServiceIcon(service.serviceType)}
                          <span>{service.serviceType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                        {service.description}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        ${service.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                        {service.calculationMethod.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openModal(service)}
                          className="inline-flex items-center px-3 py-1 rounded-lg border border-[#0f4d8a] text-[#0f4d8a] hover:bg-[#0f4d8a] hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteService(service._id)}
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
          )}
        </div>
      </div>

      {/* Service Modal - Updated to match style */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6 text-slate-800">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                      placeholder="e.g., Package Storage"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service Type *
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({...formData, serviceType: e.target.value as Service['serviceType']})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    >
                      <option value="storage">Storage</option>
                      <option value="shipping">Shipping</option>
                      <option value="customs">Customs</option>
                      <option value="delivery">Delivery</option>
                      <option value="handling">Handling</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    placeholder="Describe what this service includes..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Unit Price (USD) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unitPrice}
                        onChange={(e) => setFormData({...formData, unitPrice: parseFloat(e.target.value) || 0})}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Calculation Method *
                    </label>
                    <select
                      value={formData.calculationMethod}
                      onChange={(e) => setFormData({...formData, calculationMethod: e.target.value as Service['calculationMethod']})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="per_kg">Per Kilogram</option>
                      <option value="per_day">Per Day</option>
                      <option value="per_package">Per Package</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="h-4 w-4 text-[#0f4d8a] focus:ring-[#0f4d8a] border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                      className="h-4 w-4 text-[#0f4d8a] focus:ring-[#0f4d8a] border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-700">Set as Default</span>
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveService}
                  disabled={loading}
                  className="px-4 py-2 bg-[#0f4d8a] text-white rounded-lg hover:bg-[#0e447d] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingService ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}