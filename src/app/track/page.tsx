"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

type Package = {
  trackingNumber: string;
  status: string;
  userCode: string;
  weight?: number;
  shipper?: string;
  description?: string;
  history?: { status: string; at: string; note?: string }[];
};

function TrackPageContent() {
  const params = useSearchParams();
  const [tracking, setTracking] = useState("");
  const [result, setResult] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = params?.get("q");
    if (q) setTracking(q);
  }, [params]);

  const progress = useMemo(() => {
    if (!result) return 0;
    switch (result.status) {
      case "Unknown":
        return 10;
      case "At Warehouse":
        return 35;
      case "In Transit":
        return 75;
      case "Delivered":
        return 100;
      case "Deleted":
        return 0;
      default:
        return 0;
    }
  }, [result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(tracking)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Track your shipment</h1>
        <p className="text-sm text-neutral-600">Enter your tracking number to view live status.</p>
      </div>
      <form onSubmit={onSubmit} className="flex gap-3">
        <input
          className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Enter tracking number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          required
        />
        <button className="rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
          {loading ? "Searching..." : "Track Package"}
        </button>
      </form>
      <p className="text-xs text-neutral-500">Don&apos;t have a tracking number? <a className="underline" href="#">Contact support</a>.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-0 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-6 p-6 lg:flex-row">
            {/* Left: title + timeline */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-wider text-neutral-500">SHIPMENT {result.trackingNumber}</div>
                  <div className="text-xs text-neutral-500">UserCode: {result.userCode}</div>
                </div>
                {/* Circular progress */}
                <ProgressCircle value={progress} label={result.status} />
              </div>

              <div className="rounded-xl border border-neutral-200 p-0 dark:border-neutral-800">
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {result.history?.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 p-4">
                      <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                        {/* icon dot */}
                        <svg viewBox="0 0 8 8" className="h-2 w-2 fill-current"><circle cx="4" cy="4" r="4" /></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <div className="text-sm font-medium">{h.status}</div>
                          <div className="text-xs text-neutral-500">{new Date(h.at).toLocaleString()}</div>
                        </div>
                        {h.note && <div className="text-sm text-neutral-600 dark:text-neutral-300">{h.note}</div>}
                      </div>
                      <span className="flex-none text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M9 12l2 2 4-4" /></svg>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: map placeholder + details */}
            <div className="w-full max-w-xs space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                <div className="aspect-[4/3] w-full rounded-md bg-[linear-gradient(135deg,#dbeafe,#f3f4f6)] dark:bg-[linear-gradient(135deg,#0b1220,#1f2937)] grid place-items-center text-sm text-neutral-600 dark:text-neutral-400">
                  Map preview
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <div className="mb-2 font-medium">Package Details</div>
                <dl className="space-y-1 text-neutral-600 dark:text-neutral-300">
                  <div className="flex justify-between"><dt>Shipper</dt><dd>{result.shipper ?? "-"}</dd></div>
                  <div className="flex justify-between"><dt>Weight</dt><dd>{result.weight ?? "-"}</dd></div>
                  <div className="flex justify-between"><dt>Status</dt><dd>{result.status}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressCircle({ value, label }: { value: number; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-24 w-24">
        <circle cx="50" cy="50" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#2563eb"
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="text-lg font-semibold">{clamped}%</div>
        <div className="text-[10px] text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}
