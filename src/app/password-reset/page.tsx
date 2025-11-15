"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PasswordResetPage() {
  const params = useSearchParams();
  const token = params.get("t");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage(null);
    setError(null);
  }, [token]);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMessage("If the email exists, a reset link has been sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      setMessage("Password reset successful. You can now log in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {token ? "Set a new password" : "Forgot your password?"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {token
            ? "Enter a new password for your account."
            : "Enter your account email and we'll send you a reset link."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {!token ? (
          <form onSubmit={onRequest} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#E67919] to-[#f58a2e] py-2.5 text-sm font-bold text-white shadow hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        ) : (
          <form onSubmit={onReset} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent"
                placeholder="Enter a new password"
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#E67919] to-[#f58a2e] py-2.5 text-sm font-bold text-white shadow hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
