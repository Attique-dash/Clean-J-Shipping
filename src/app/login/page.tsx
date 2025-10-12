"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const tracking = params.get("tracking") || "";

  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, bounce out of login immediately
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          const role = d.user.role as string | undefined;
          if (role === "admin") window.location.replace("/admin");
          else if (role === "warehouse") window.location.replace("/warehouse");
          else window.location.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Login failed");

      // Decide where to go based on role
      const role = data?.user?.role as string | undefined;
      if (role === "admin") {
        window.location.assign("/admin");
      } else if (role === "warehouse") {
        window.location.assign("/warehouse");
      } else {
        const to = redirect && redirect !== "/" ? redirect : "/dashboard";
        const url = tracking ? `${to}?tracking=${encodeURIComponent(tracking)}` : to;
        window.location.assign(url);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">Log in</h1>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
              />
              Remember me
              <a href="#" className="ml-auto text-blue-600 hover:underline">Forgot Password?</a>
            </label>
            {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            No account? <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
