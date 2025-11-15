"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type User = { firstName: string; lastName: string; email: string; role: string; userCode: string } | null;
type Package = {
  trackingNumber: string;
  status: string;
  userCode: string;
  description?: string;
  weight?: number;
  shipper?: string;
  updatedAt?: string;
};

type TrackHistory = { status: string; at: string; note?: string };
type TrackResult = {
  trackingNumber: string;
  status: string;
  userCode: string;
  weight?: number;
  shipper?: string;
  description?: string;
  currentLocation?: string;
  dimensions?: { length?: number; width?: number; height?: number };
  entryDate?: string;
  updatedAt?: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  externalStatusLabel?: string;
  history?: TrackHistory[];
} | null;

export default function DashboardPage() {
  const params = useSearchParams();
  const [me, setMe] = useState<User>(null);
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [tracking, setTracking] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<TrackResult>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null));

    fetch("/api/customer/packages", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          const list = Array.isArray(data?.packages) ? data.packages : [];
          const mapped: Package[] = list.map((p: any) => ({
            trackingNumber: String(p.tracking_number || p.trackingNumber || ""),
            status: String(p.status || ""),
            userCode: String(p.userCode || ""),
            description: p.description,
            weight: typeof p.weight_kg === "number" ? p.weight_kg : (typeof p.weight === "number" ? p.weight : undefined),
            shipper: p.shipper,
            updatedAt: p.updated_at || p.updatedAt,
          }));
          setPkgs(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize tracking from query parameter if present
  useEffect(() => {
    const q = params.get("tracking");
    if (q) setTracking(q);
  }, [params]);

  const selected = useMemo(() => {
    if (!tracking) return pkgs[0];
    return pkgs.find((p) => p.trackingNumber.toLowerCase() === tracking.trim().toLowerCase()) || pkgs[0];
  }, [pkgs, tracking]);

  function stepIndex(status?: string) {
    if (!status) return 0;
    const key = status.replace(/_/g, " ").trim().toLowerCase();
    // Normalize common labels from APIs/UI
    if (key.includes("delivered")) return 2;
    if (key.includes("in transit")) return 1;
    if (key.includes("ready for pickup") || key.includes("local port")) return 1;
    if (key.includes("at warehouse") || key.includes("processing") || key.includes("received") || key.includes("pending") || key.includes("unknown")) return 0;
    // Fallbacks
    if (key.includes("ready")) return 1;
    return 0;
  }

  const activeStep = stepIndex((trackResult?.status || selected?.status));

  async function doTrackLookup() {
    const t = tracking.trim();
    if (!t) return;
    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(t)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Not found");
      setTrackResult(data as TrackResult);
    } catch (e) {
      setTrackError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setTrackLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {me && (
        <div className="rounded-xl border bg-white px-6 py-4 shadow-sm">
          <div className="text-sm text-gray-600">Welcome back,</div>
          <div className="text-lg font-semibold">{me.firstName} {me.lastName}</div>
        </div>
      )}
      {/* Track Box */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Track Your Package</h2>
        </div>
        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1fr_auto]">
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Enter Tracking Number"
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="h-[44px] rounded-md bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={doTrackLookup}
            disabled={trackLoading}
          >
            {trackLoading ? "Searching..." : "Track"}
          </button>
        </div>
        {trackError && <div className="px-6 pb-4 text-sm text-red-600">{trackError}</div>}
        {/* Step Indicator */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between">
            {["Processing", "In Transit", "Delivered"].map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= activeStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>{i + 1}</div>
                {i < 2 && <div className={`mx-2 h-1 flex-1 rounded ${i < activeStep ? "bg-blue-600" : "bg-gray-200"}`} />}
                <span className="ml-2 hidden text-xs text-gray-600 md:block">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Details */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="font-medium">Package Details</h3>
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">View Full History</button>
            <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">Report an Issue</button>
          </div>
        </div>
        {(trackResult || selected) ? (
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">Tracking</dt><dd className="font-medium">{(trackResult?.trackingNumber) || selected?.trackingNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Status</dt><dd>{(trackResult?.status) || selected?.status}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Updated</dt><dd>{(trackResult?.updatedAt ? new Date(trackResult.updatedAt).toLocaleString() : (selected?.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-"))}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Shipper</dt><dd>{(trackResult?.shipper) || selected?.shipper || "-"}</dd></div>
            </dl>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">User Code</dt><dd>{(trackResult?.userCode) || selected?.userCode}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Weight</dt><dd>{(typeof trackResult?.weight === "number" ? trackResult?.weight : selected?.weight) ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Description</dt><dd>{(trackResult?.description) || selected?.description || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Location</dt><dd>{trackResult?.currentLocation ?? "-"}</dd></div>
              {trackResult?.dimensions && (
                <div className="flex justify-between"><dt className="text-gray-600">Dimensions</dt><dd>{[trackResult.dimensions.length, trackResult.dimensions.width, trackResult.dimensions.height].filter((v) => typeof v === "number").join(" x ") || "-"}</dd></div>
              )}
            </dl>
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-600">No package selected.</div>
        )}
      </section>
    </div>
  );
}
