"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function DashboardPage() {
  const [me, setMe] = useState<User>(null);
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null));

    fetch("/api/customer/packages", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setPkgs(data.items || []);
      })
      .catch(() => {});
  }, []);

  const selected = useMemo(() => {
    if (!tracking) return pkgs[0];
    return pkgs.find((p) => p.trackingNumber.toLowerCase() === tracking.trim().toLowerCase()) || pkgs[0];
  }, [pkgs, tracking]);

  function stepIndex(status?: string) {
    const map: Record<string, number> = {
      processing: 0,
      "in transit": 1,
      delivered: 2,
      received: 0,
      pending: 0,
      "ready for pickup": 1,
    };
    const key = (status || "").toLowerCase();
    for (const k of Object.keys(map)) if (key.includes(k)) return map[k];
    return 0;
  }

  const activeStep = stepIndex(selected?.status);

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
          <button className="h-[44px] rounded-md bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700">Track</button>
        </div>
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
        {selected ? (
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">Tracking</dt><dd className="font-medium">{selected.trackingNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Status</dt><dd>{selected.status}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Updated</dt><dd>{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Shipper</dt><dd>{selected.shipper || "-"}</dd></div>
            </dl>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">User Code</dt><dd>{selected.userCode}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Weight</dt><dd>{selected.weight ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Description</dt><dd>{selected.description || "-"}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-600">No package selected.</div>
        )}
      </section>
    </div>
  );
}
