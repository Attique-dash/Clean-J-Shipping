// src/app/customer/shipping-addresses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Plane, Ship, Package } from "lucide-react";
import { toast } from "react-toastify";

interface ShippingAddress {
  air: string;
  sea: string;
  china: string;
}

interface Warehouse {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  airAddress?: string;
  seaAddress?: string;
  chinaAddress?: string;
}

export default function ShippingAddressesPage() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<ShippingAddress | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchShippingAddresses();
    }
  }, [session]);

  const fetchShippingAddresses = async () => {
    try {
      const res = await fetch("/api/customer/shipping-addresses", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses);
        setWarehouses(data.warehouses);
      } else {
        toast.error("Failed to load shipping addresses");
      }
    } catch (error) {
      toast.error("Error loading shipping addresses");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view shipping addresses</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f4d8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shipping addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <MapPin className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight md:text-3xl">Shipping Addresses</h1>
                <p className="text-blue-100 mt-1">View addresses for different shipping methods</p>
              </div>
            </div>
          </div>
        </header>

        {/* Shipping Method Addresses */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Air Address */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <div className="flex items-center gap-3 text-white">
                <Plane className="h-6 w-6" />
                <h2 className="text-lg font-semibold">Air Shipments</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600 mt-1">{addresses?.air || 'Address not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sea Address */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-4">
              <div className="flex items-center gap-3 text-white">
                <Ship className="h-6 w-6" />
                <h2 className="text-lg font-semibold">Sea Shipments</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600 mt-1">{addresses?.sea || 'Address not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* China Address */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
              <div className="flex items-center gap-3 text-white">
                <Package className="h-6 w-6" />
                <h2 className="text-lg font-semibold">China Shipments</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600 mt-1">{addresses?.china || 'Address not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warehouse Information */}
        {warehouses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] p-4">
              <h2 className="text-xl font-semibold text-white">Warehouse Locations</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {warehouses.map((warehouse, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{warehouse.name}</h3>
                    <p className="text-sm text-gray-600">{warehouse.address}</p>
                    <p className="text-sm text-gray-500">{warehouse.city}, {warehouse.country}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
