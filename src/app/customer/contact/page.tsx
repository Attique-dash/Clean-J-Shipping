// src/app/customer/contact/page.tsx
"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, XCircle, Clock, MessageSquare, Headphones } from "lucide-react";

export default function CustomerContactPage() {
  const [form, setForm] = useState({ fullName: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          subject: form.subject, 
          message: form.message, 
          fullName: form.fullName || undefined, 
          email: form.email || undefined 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setSuccess("Your message has been sent to support.");
      setForm({ fullName: "", email: "", subject: "", message: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl shadow-lg">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f4d8a]">Contact Us</h1>
              <p className="text-sm text-gray-600 mt-1">
                We&apos;re here to help! Reach out to our support team
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Form - Left Side (2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-[#E67919] to-[#f59e42] rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#0f4d8a]">Send us a Message</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Name and Email */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    placeholder="John Doe" 
                    value={form.fullName} 
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    type="email" 
                    placeholder="john@example.com" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="How can we help you?" 
                  value={form.subject} 
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none"
                  placeholder="Please describe your issue or question in detail..." 
                  rows={6} 
                  value={form.message} 
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Submit Support Ticket</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  We typically respond within 24 hours
                </p>
              </div>

              {/* Success/Error Messages */}
              {error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-start space-x-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{success}</p>
                    <p className="text-xs text-green-600 mt-1">Our team will get back to you shortly.</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Contact Information - Right Side (1 column) */}
          <div className="space-y-6">
            {/* Contact Details Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Phone className="h-5 w-5 text-[#0f4d8a]" />
                <h3 className="text-lg font-bold text-[#0f4d8a]">Contact Information</h3>
              </div>

              <div className="space-y-5">
                {/* Address */}
                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                  <div className="flex-shrink-0 p-2 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Address</div>
                    <div className="text-sm text-gray-600">
                      123 Speedy Lane<br />
                      Metropolis, Shipville<br />
                      1245
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                  <div className="flex-shrink-0 p-2 bg-gradient-to-br from-[#E67919] to-[#f59e42] rounded-lg">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Phone</div>
                    <a href="tel:+18765785945" className="text-sm text-[#0f4d8a] hover:underline font-medium">
                      1 (876) 578-5945
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                  <div className="flex-shrink-0 p-2 bg-gradient-to-br from-[#0891b2] to-[#06b6d4] rounded-lg">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Email</div>
                    <a href="mailto:info@cleanshipping.com" className="text-sm text-[#0f4d8a] hover:underline font-medium">
                      info@cleanshipping.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Clock className="h-5 w-5 text-[#E67919]" />
                <h3 className="text-lg font-bold text-[#0f4d8a]">Business Hours</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Monday - Friday</span>
                  <span className="text-sm font-semibold text-[#0f4d8a]">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Saturday</span>
                  <span className="text-sm font-semibold text-[#0f4d8a]">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sunday</span>
                  <span className="text-sm font-semibold text-gray-500">Closed</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">Support Currently Online</span>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-[#0f4d8a]">Our Location</h3>
              </div>
              <div className="relative h-64 bg-gradient-to-br from-blue-100 to-cyan-100">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-[#0f4d8a] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">Map View</p>
                    <p className="text-xs text-gray-400">123 Speedy Lane, Metropolis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Need Immediate Assistance?</h3>
                <p className="text-blue-100">Our support team is available 24/7 via live chat</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/customer/messages"
                className="inline-flex items-center space-x-2 bg-white text-[#0f4d8a] px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Start Live Chat</span>
              </a>
              <a
                href="tel:+18765785945"
                className="inline-flex items-center space-x-2 bg-[#E67919] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#d66a15] transition-all duration-200 shadow-lg"
              >
                <Phone className="h-5 w-5" />
                <span>Call Now</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}