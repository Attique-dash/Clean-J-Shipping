"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNo: "",
    password: "",
    confirmPassword: "",
    adress: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validate(): string | null {
    if (!/^\d{11}$/.test(form.phoneNo)) return "Phone number must be exactly 11 digits";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.agree) return "You must agree to Terms & Privacy";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) {
      setLoading(false);
      setError(v);
      return;
    }
    try {
      // Send alternative schema that backend supports
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNo: form.phoneNo.trim(),
        password: form.password,
        adress: form.adress.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim(),
        country: form.country.trim(),
      };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Registration failed");
      setSuccess("Registration successful. You can now login.");
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
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Create your account</h1>
          </div>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address"
              value={form.adress}
              onChange={(e) => setForm({ ...form, adress: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Phone Number"
              value={form.phoneNo}
              onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="State / Province"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Zip / Postal Code"
              value={form.zip_code}
              onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
            <input
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />

            <label className="col-span-1 md:col-span-2 mt-2 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => setForm({ ...form, agree: e.target.checked })}
              />
              I agree to the Terms & Conditions and Privacy Policy
            </label>

            {error && (
              <div className="col-span-1 md:col-span-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="col-span-1 md:col-span-2 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>
            )}

            <button
              disabled={loading}
              className="col-span-1 md:col-span-2 mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Register"}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
