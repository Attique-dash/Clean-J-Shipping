"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [tracking, setTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tracking.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      const target = `/dashboard?tracking=${encodeURIComponent(tracking.trim())}`;
      if (!data?.user) {
        router.push(`/login?redirect=${encodeURIComponent("/dashboard")}&tracking=${encodeURIComponent(tracking.trim())}`);
      } else {
        router.push(target);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* Hero + Tracking */}
      <section className="relative overflow-hidden border-b bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Your world, delivered</h1>
            <p className="mt-4 max-w-xl text-base text-gray-600 md:text-lg">
              Door-to-door shipping across our global network. Fast, reliable, and transparent.
            </p>

            <form onSubmit={onSubmit} className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Checking..." : "Track Now"}
              </button>
            </form>
          </div>

          <div className="hidden justify-center md:flex">
            {/* Decorative illustration */}
            <div className="h-56 w-full max-w-md rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-lg">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white">
                <span className="px-8 text-center text-sm text-gray-500">Global logistics, real-time tracking, secure delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">Why choose us?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              {/* Box icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="M3.3 7L12 12l8.7-5M12 22V12"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Shipment Solutions</h3>
            <p className="mt-1 text-sm text-gray-600">Door-to-door delivery with customs handling and insurance options.</p>
            <Link href="#" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">Get a free quote</Link>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              {/* Globe icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M6 6c3 2 9 2 12 0M6 18c3-2 9-2 12 0"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Global Network</h3>
            <p className="mt-1 text-sm text-gray-600">Real-time tracking across our worldwide hubs and partners.</p>
            <div className="mt-3 text-xs text-gray-500">24/7 Support</div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              {/* Rocket icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <path d="M14 4l6 6-6 6-6-6 6-6Z"/>
                <path d="M4 20l4-4"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Express Delivery</h3>
            <p className="mt-1 text-sm text-gray-600">Priority routes with competitive rates and guaranteed timelines.</p>
            <div className="mt-3 text-xs text-gray-500">Competitive Rates</div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-gray-600 md:flex-row">
          <div>© {new Date().getFullYear()} Speedy Global</div>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
