// src/app/customer/shipping-addresses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Plane, Ship, Package, Copy, Check } from "lucide-react";
import { toast } from "react-toastify";

interface ShippingAddress {
  _id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: "air" | "sea" | "china";
  isDefault: boolean;
  fullName: string;
  mailboxCode: string;
  addressLine2?: string;
  displayName?: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userCode: string;
  mailboxNumber: string;
  shippingAddresses: ShippingAddress[];
}

export default function ShippingAddressesPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/customer/profile", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        }
      } else {
        toast.error("Failed to load profile data");
      }
    } catch (error) {
      toast.error("Error loading profile data");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  const getFormattedAddress = (address: ShippingAddress, profile: UserProfile): string => {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const mailboxCode = profile.mailboxNumber || address.mailboxCode || profile.userCode;

    if (address.type === "air") {
      return `✈️ Standard Air Address:\n${fullName}\n${address.street}\n${address.addressLine2 || `KCDE-${mailboxCode}`}\n${address.city},\n${address.state}\n${address.zipCode}`;
    }

    if (address.type === "sea") {
      return `🚢 Standard Sea Address:\n${fullName}\n${address.street}\n${address.addressLine2 || `KCDX-${mailboxCode}`}\n${address.city},\n${address.state}\n${address.zipCode}`;
    }

    if (address.type === "china") {
      return `🇨🇳 China Warehouse Address:\n${fullName} / ${mailboxCode}\n${address.country}\n${address.state}\n${address.city}\n${address.street}`;
    }

    return "";
  };

  const getAddressByType = (type: "air" | "sea" | "china"): ShippingAddress | undefined => {
    return profile?.shippingAddresses?.find(addr => addr.type === type);
  };

  const airAddress = getAddressByType("air");
  const seaAddress = getAddressByType("sea");
  const chinaAddress = getAddressByType("china");

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
                <p className="text-blue-100 mt-1">Use these addresses when ordering online</p>
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
              {airAddress && profile ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                      {getFormattedAddress(airAddress, profile)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getFormattedAddress(airAddress, profile), "air")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
                  >
                    {copiedId === "air" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Air address not configured</p>
              )}
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
              {seaAddress && profile ? (
                <div className="space-y-4">
                  <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                      {getFormattedAddress(seaAddress, profile)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getFormattedAddress(seaAddress, profile), "sea")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg transition-colors font-medium"
                  >
                    {copiedId === "sea" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Sea address not configured</p>
              )}
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
              {chinaAddress && profile ? (
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                      {getFormattedAddress(chinaAddress, profile)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getFormattedAddress(chinaAddress, profile), "china")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
                  >
                    {copiedId === "china" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">China address not configured</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
