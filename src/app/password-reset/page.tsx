"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { FaEnvelope, FaLock, FaPlane, FaShieldAlt } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";

function PasswordResetPageContent() {
  const params = useSearchParams();
  const token = params?.get("t") || "";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");

  useEffect(() => {
    setMessage(null);
    setError(null);
    if (token) {
      setStep("reset");
    }
  }, [token]);

  async function onRequest(e: FormEvent) {
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
      setMessage("If the email exists, a reset OTP has been sent.");
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");
      setMessage("OTP verified successfully. Please set your new password.");
      setStep("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || otp, password, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      setMessage("Password reset successful. You can now log in.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E7893] via-[#1a9bb8] to-[#E67919] flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10 w-full transition-all duration-700">
        <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-0 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 backdrop-blur-sm sm:max-w-3xl md:max-w-5xl md:grid-cols-2 transform hover:shadow-3xl transition-shadow duration-300">
          
          {/* Left: illustrative section with logo */}
          <div className="hidden md:flex relative bg-gradient-to-br from-[#1a9bb8] to-[#0E7893] h-full flex-col justify-between p-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <FaPlane className="text-[#E67919] text-2xl" />
              </div>
              <div>
                <h2 className="text-white font-bold text-2xl">Clean J Shipping</h2>
                <p className="text-cyan-100 text-xs">Logistics & Delivery</p>
              </div>
            </div>

            <div className="relative h-64 my-8 w-full flex items-center justify-center">
              <div className="relative w-48 h-48">
                <Image 
                  src="/images/Logo.png" 
                  alt="Clean J Shipping Logo" 
                  fill
                  priority 
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain drop-shadow-2xl"
                  onError={(e) => {
                    // Fallback to a placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzBBNzY5MyIgZD0iTTEyLDIwQTgsOCAwIDAsMSA0LDEyQTgsOCAwIDAsMSAxMiw0QTgsOCAwIDAsMSAyMCwxMkE4LDggMCAwLDEgMTIsMjBNMTIsMkExMCwxMCAwIDAsMCAyLDEyQTEwLDEwIDAgMCwwIDEyLDIyQTEwLDEwIDAgMCwwIDIyLDEyQTEwLDEwIDAgMCwwIDEyLDJNMTIsMTBBMiwyIDAgMCwxIDE0LDEyQTIsMiAwIDAsMSAxMiwxNEEyLDIgMCAwLDEgMTAsMTJBMiwyIDAgMCwxIDEyLDExTTEyLDEzQTEgMSAwIDAsMCAxMywxMkExLDEgMCAwLDAgMTIsMTFBMSwxIDAgMCwwIDExLDEyQTEsMSAwIDAsMCAxMiwxM1oiIC8+PC9zdmc+';
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-bold text-xl">Password Recovery</h3>
              <p className="text-cyan-100 text-sm leading-relaxed">
                Reset your password securely and get back to managing your shipments.
              </p>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white px-8 py-8 md:px-10 md:py-10">
            <div className="flex md:hidden items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0E7893] to-[#1a9bb8] rounded-xl flex items-center justify-center shadow-lg">
                <FaPlane className="text-white text-xl" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-[#E67919]">Clean J Shipping</h2>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#0E7893] to-[#1a9bb8] bg-clip-text text-transparent">
                {step === "request" && "Forgot Password?"}
                {step === "verify" && "Verify OTP"}
                {step === "reset" && "Reset Password"}
              </h1>
              
              {/* Progress indicator */}
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className={`w-8 h-1 rounded-full ${step === "request" ? "bg-[#E67919]" : "bg-green-500"}`}></div>
                <div className={`w-8 h-1 rounded-full ${step === "verify" ? "bg-[#E67919]" : step === "reset" ? "bg-green-500" : "bg-gray-300"}`}></div>
                <div className={`w-8 h-1 rounded-full ${step === "reset" ? "bg-[#E67919]" : "bg-gray-300"}`}></div>
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
              {message && (
                <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                </div>
              )}

              {step === "request" && (
                <form onSubmit={onRequest} className="mt-6 space-y-5">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaEnvelope className="text-gray-400 group-focus-within:text-[#E67919] transition-colors" />
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all duration-200"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#E67919] to-[#f58a2e] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send OTP
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === "verify" && (
                <form onSubmit={onVerifyOtp} className="mt-6 space-y-5">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaShieldAlt className="text-gray-400 group-focus-within:text-[#E67919] transition-colors" />
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all duration-200"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#E67919] to-[#f58a2e] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify OTP
                        <FaShieldAlt className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === "reset" && (
                <form onSubmit={onReset} className="mt-6 space-y-5">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaLock className="text-gray-400 group-focus-within:text-[#E67919] transition-colors" />
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all duration-200"
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaLock className="text-gray-400 group-focus-within:text-[#E67919] transition-colors" />
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all duration-200"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#E67919] to-[#f58a2e] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <Link 
                    href="/login" 
                    className="text-[#0E7893] hover:text-[#E67919] font-semibold transition-colors hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <PasswordResetPageContent />
    </Suspense>
  );
}
