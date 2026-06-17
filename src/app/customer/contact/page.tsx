"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, XCircle, Clock, MessageSquare, Headphones } from "lucide-react";

function isSupportOnline(): boolean {
  const now = new Date();
  const jamaicaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Jamaica" }));
  const day = jamaicaTime.getDay();
  const hour = jamaicaTime.getHours();
  if (day >= 1 && day <= 5) return hour >= 9 && hour < 18;
  if (day === 6) return hour >= 10 && hour < 16;
  return false;
}

const LOCATIONS = [
  {
    name: "Main Branch / Kingston",
    address: "41C Half Way Tree RD, Kingston, Kingston 5",
    hours: "9:30am – 5:00pm",
    phone: "(876) 210-6049",
    mapQuery: "41C Half Way Tree Road, Kingston 5, Jamaica",
    mapEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.8!2d-76.7875!3d18.0035!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDAwJzEyLjYiTiA3NsKwNDcnMTUuMCJX!5e0!3m2!1sen!2sjm!4v1700000000000",
  },
  {
    name: "Linstead Branch",
    address: "Shop #16 South Parade Plaza, Linstead, St. Catherine",
    hours: "9:00am – 5:00pm",
    phone: "(876) 815-1779",
    mapQuery: "South Parade Plaza, Linstead, St. Catherine, Jamaica",
    mapEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.8!2d-76.9540!3d18.0750!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDA0JzMwLjAiTiA3NsKwNTcnMTQuNCJX!5e0!3m2!1sen!2sjm!4v1700000000001",
  },
];

const CONTACT_INFO = {
  phones: ["(876) 210-6049", "(876) 869-4330"],
  whatsapp: "(876) 210-6049",
  email: "support@cleanjshipping.com",
};

export default function CustomerContactPage() {
  const [form, setForm] = useState({ message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(isSupportOnline());
    const interval = setInterval(() => setIsOnline(isSupportOnline()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Contact Us Message", message: form.message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setSuccess("Your message has been sent successfully. We will get back to you shortly.");
      setForm({ message: "" });
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm resize-none"
                  placeholder="Type your message here..."
                  rows={8}
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

        {/* Locations with Maps */}
        <div className="space-y-6">
          {LOCATIONS.map((loc, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Location Info */}
                <div className="p-6 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{loc.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-[#0f4d8a] mt-0.5 shrink-0" />
                      <span className="text-gray-700">{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-[#E67919] shrink-0" />
                      <span className="text-gray-700">{loc.hours}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#0891b2] shrink-0" />
                      <a href={`tel:${loc.phone.replace(/\D/g, "")}`} className="text-gray-700 hover:text-[#0f4d8a]">{loc.phone}</a>
                    </div>
                  </div>
                </div>
                {/* Map */}
                <div className="h-64 md:h-full min-h-[250px] bg-gray-100">
                  <iframe
                    src={loc.mapEmbed}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: 250 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${loc.name} Map`}
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
