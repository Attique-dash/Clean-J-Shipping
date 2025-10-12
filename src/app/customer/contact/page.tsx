"use client";

import { useState } from "react";

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
        body: JSON.stringify({ subject: form.subject, message: form.message, fullName: form.fullName || undefined, email: form.email || undefined }),
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
    <div className="space-y-6">
      {/* Blue header bar */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-[#153e75] px-6 py-3 text-white">
          <h1 className="text-lg font-semibold">Contact Us</h1>
        </div>
        <div className="grid gap-6 bg-white p-6 md:grid-cols-3">
          {/* Left: Send message */}
          <div className="md:col-span-2">
            <div className="mb-3 text-base font-semibold text-gray-900">Send us a Message</div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-md border border-gray-300 px-3 py-2" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                <input className="rounded-md border border-gray-300 px-3 py-2" type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <input className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
              <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Your Message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
              <div className="flex justify-start">
                <button disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Sending..." : "Submit Support Ticket"}
                </button>
              </div>
              {(error || success) && (
                <div className="text-sm">
                  {error && <span className="text-red-600">{error}</span>}
                  {success && <span className="text-green-600">{success}</span>}
                </div>
              )}
            </form>
          </div>

          {/* Right: Contact info */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="mb-3 text-sm font-semibold">Contact Us</div>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <div className="text-gray-500">Address</div>
                  <div>123 Speedy Lane, Metropolis, Shipville, 1245</div>
                </div>
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div>+1 (555) 13-467</div>
                </div>
                <div>
                  <div className="text-gray-500">Email</div>
                  <div><a className="text-blue-600 hover:underline" href="mailto:support@speedyship.com">support@speedyship.com</a></div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="mb-2 px-2 pt-2 text-sm font-semibold">General Information</div>
              <div className="h-40 w-full rounded-md bg-[url('https://maps.gstatic.com/tactile/basepage/pegman_sherlock.png')] bg-cover bg-center opacity-70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
