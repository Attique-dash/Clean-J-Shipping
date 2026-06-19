"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, XCircle, Clock, MessageSquare, Plane, Ship } from "lucide-react";

function isSupportOnline(): boolean {
  const now = new Date();
  const jamaicaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Jamaica" }));
  const day = jamaicaTime.getDay();
  const hour = jamaicaTime.getHours();
  if (day >= 1 && day <= 5) return hour >= 9 && hour < 18;
  if (day === 6) return hour >= 10 && hour < 16;
  return false;
}

interface ShippingAddress {
  type: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CONTACT_INFO = {
  phones: ["(876) 210-6049", "(876) 869-4330"],
  whatsapp: "(876) 210-6049",
  email: "support@cleanjshipping.com",
};

export default function CustomerContactPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);

  useEffect(() => {
    setIsOnline(isSupportOnline());
    const interval = setInterval(() => setIsOnline(isSupportOnline()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Pre-fill name and email from session
  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...f,
        name: session.user?.name || session.user?.email?.split("@")[0] || "",
        email: session.user?.email || "",
      }));
    }
  }, [session]);

  // Fetch shipping addresses from dashboard API
  useEffect(() => {
    async function fetchAddresses() {
      try {
        const res = await fetch("/api/customer/dashboard", { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.shippingAddresses?.length > 0) {
          setAddresses(data.shippingAddresses);
        }
      } catch { /* use defaults */ }
    }
    if (session?.user) fetchAddresses();
  }, [session]);

  // Default addresses if API hasn't returned yet
  const displayAddresses = addresses.length > 0 ? addresses : [
    { type: "air", street: "700 NW 57 Place", city: "Ft. Lauderdale", state: "Florida", zipCode: "33309", country: "USA" },
    { type: "sea", street: "700 NW 57 Place", city: "Ft. Lauderdale", state: "Florida", zipCode: "33309", country: "USA" },
    { type: "china", street: "Baoshan No.2 Industrial Zone", city: "Shenzhen", state: "Guangdong Province", zipCode: "518000", country: "China" },
  ];

  function getMapEmbed(addr: ShippingAddress): string {
    const q = encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${q}`;
  }

  function getMapSearch(addr: ShippingAddress): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`)}`;
  }

  function getLocationIcon(type: string) {
    const t = (type || "").toLowerCase();
    if (t === "sea") return <Ship className="h-4 w-4 text-blue-600" />;
    if (t === "china") return <span className="text-lg">🇨🇳</span>;
    return <Plane className="h-4 w-4 text-blue-600" />;
  }

  function getLocationLabel(type: string) {
    const t = (type || "").toLowerCase();
    if (t === "sea") return "Sea Freight Address";
    if (t === "china") return "China Warehouse";
    return "Air Freight Address";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim() || "Contact Us Message",
          message: form.message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setSuccess("Your message has been sent successfully. We will get back to you shortly.");
      setForm(f => ({ ...f, subject: "", message: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Contact Us</h1>
          <p className="text-gray-500 mt-1">Drop us a message. We will get back to you shortly.</p>
        </div>

        {/* Form + Contact Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Message Form - Left (2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm"
                  placeholder="What is this about?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm resize-none"
                  placeholder="Type your message here..."
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4" />SEND MESSAGE</>
                )}
              </button>

              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <p>{success}</p>
                </div>
              )}
            </form>
          </div>

          {/* Contact Information - Right (1 column) */}
          <div className="bg-[#faf8f5] rounded-2xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Contact Information</h3>
            <div className="space-y-4">
              {CONTACT_INFO.phones.map((phone, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-lg">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-sm font-medium text-gray-800 hover:text-[#0f4d8a]">{phone}</a>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">WhatsApp</p>
                  <a href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-green-600">{CONTACT_INFO.whatsapp}</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-[#E67919] to-[#f59e42] rounded-lg">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <a href={`mailto:${CONTACT_INFO.email}`} className="text-sm font-medium text-gray-800 hover:text-[#E67919]">{CONTACT_INFO.email}</a>
              </div>

              {/* Online Status */}
              <div className={`mt-6 p-3 rounded-lg flex items-center gap-2 ${isOnline ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-gray-500'}`}>
                  {isOnline ? 'Support Online' : 'Support Offline'}
                </span>
              </div>

              {/* Business Hours */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Clock className="h-4 w-4" />Business Hours (Jamaica)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Mon – Fri</span><span className="font-medium text-gray-800">9:00 AM – 6:00 PM</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Saturday</span><span className="font-medium text-gray-800">10:00 AM – 4:00 PM</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sunday</span><span className="font-medium text-gray-400">Closed</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Addresses with Maps */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            Shipping Addresses
          </h2>
          {displayAddresses.map((addr, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Location Info */}
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${addr.type?.toLowerCase() === "sea" ? "bg-gradient-to-br from-blue-100 to-cyan-100" : addr.type?.toLowerCase() === "china" ? "bg-gradient-to-br from-red-100 to-orange-100" : "bg-gradient-to-br from-blue-100 to-cyan-100"}`}>
                      {getLocationIcon(addr.type)}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{getLocationLabel(addr.type)}</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-[#0f4d8a] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-800 font-medium">{addr.street}</p>
                        <p className="text-gray-600">{addr.city}, {addr.state} {addr.zipCode}</p>
                        <p className="text-gray-500">{addr.country}</p>
                      </div>
                    </div>
                  </div>
                  <a href={getMapSearch(addr)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[#0f4d8a] font-medium hover:underline">
                    <MapPin className="h-4 w-4" />Open in Google Maps
                  </a>
                </div>
                {/* Map */}
                <div className="h-64 md:h-full min-h-[250px] bg-gray-100">
                  <iframe
                    src={getMapEmbed(addr)}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: 250 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${addr.type} Address Map`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
