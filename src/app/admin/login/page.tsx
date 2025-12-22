"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function AdminLoginPage() {
  const params = useSearchParams();
  const redirect = params?.get("redirect") || "/admin";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrors({});
    
    // Validation
    const newErrors: { email?: string; password?: string } = {};
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password
        }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data.error || data.message || "Login failed";
        if (errorMsg.toLowerCase().includes("email") || errorMsg.toLowerCase().includes("password")) {
          setErrors({ email: errorMsg, password: errorMsg });
        } else {
          setMessage(errorMsg);
        }
        return;
      }
      
      // If the user is not admin, show message and do not redirect to /admin
      if (data?.user?.role !== "admin") {
        setMessage("This portal is for admins only. Redirecting to customer login...");
        setTimeout(() => {
          window.location.assign("/login");
        }, 2000);
        return;
      }
      
      const to = redirect || "/admin";
      // Use full page navigation so cookie is definitely present
      window.location.assign(to);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Login failed. Please check your connection and try again.";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="relative min-h-[80vh] grid place-items-center overflow-hidden bg-[radial-gradient(1200px_500px_at_50%_-10%,#172437_0%,#0d1623_60%,#0b1320_100%)]">
      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,.35)]">
          {/* Left: illustrative image */}
          <div className="relative hidden md:block">
            <div className="relative min-h-[360px] md:min-h-[480px]">
              <Image src="/images/auth.png" alt="Authentication" fill priority className="object-cover" />
            </div>
          </div>

          {/* Right form card */}
          <div className="p-8 md:p-10 text-white">
            <div className="mx-auto w-full max-w-sm">
              <h1 className="mb-6 text-center text-2xl font-semibold">Admin Login</h1>
              <div className="rounded-xl border border-[#29d3ff]/40 bg-white/5 p-5 shadow-inner">
                <form onSubmit={onSubmit} className="space-y-3">
                  <div>
                    <input
                      className={`w-full rounded-md border px-3 py-2 outline-none placeholder:text-white/70 focus:ring-2 transition-colors ${
                        errors.email 
                          ? "border-red-400 bg-red-500/20 focus:ring-red-400" 
                          : "border-white/10 bg-white/10 focus:ring-[#29d3ff]"
                      }`}
                      type="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: undefined });
                        if (message) setMessage(null);
                      }}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-300">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        className={`w-full rounded-md border px-3 py-2 pr-10 outline-none placeholder:text-white/70 focus:ring-2 transition-colors ${
                          errors.password 
                            ? "border-red-400 bg-red-500/20 focus:ring-red-400" 
                            : "border-white/10 bg-white/10 focus:ring-[#29d3ff]"
                        }`}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => {
                          setForm({ ...form, password: e.target.value });
                          if (errors.password) setErrors({ ...errors, password: undefined });
                          if (message) setMessage(null);
                        }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/70 hover:text-white"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-300">{errors.password}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-[#29d3ff] px-4 py-2 font-semibold text-black hover:bg-[#12c6f7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Signing in..." : "Log In"}
                  </button>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <a href="#" className="hover:underline">Forgot Password?</a>
                    <a href="/login" className="hover:underline">Customer Login</a>
                  </div>
                </form>
              </div>
              {message && (
                <div className="mt-3 p-3 rounded-md bg-red-500/20 border border-red-400/50">
                  <p className="text-center text-sm text-red-300">{message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
