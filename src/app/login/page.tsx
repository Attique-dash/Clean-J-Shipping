"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaPlane } from "react-icons/fa";
import Link from "next/link";

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const redirect = searchParams.get("redirect") || "/";
  const tracking = searchParams.get("tracking") || "";

  const [form, setForm] = useState<FormData>({ 
    email: "", 
    password: "", 
    rememberMe: false 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Handle redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = session.user.role as string | undefined;
      if (role === 'admin') {
        router.replace('/admin');
      } else if (role === 'warehouse') {
        router.replace('/warehouse');
      } else {
        const to = redirect && redirect !== '/' ? redirect : '/dashboard';
        const url = tracking ? `${to}?tracking=${encodeURIComponent(tracking)}` : to;
        router.replace(url);
      }
    }
  }, [status, session, redirect, tracking, router]);

  useEffect(() => {
    if (error) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Form validation
    const next: FormErrors = {};
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Please enter a valid email";
    }
    
    if (!form.password) {
      next.password = "Password is required";
    } else if (form.password.length < 6) {
      next.password = "Password must be at least 6 characters";
    }
    
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setLoading(false);
      return;
    }
    
    try {
      // Use NextAuth's signIn function
      const result = await signIn('credentials', {
        redirect: false,
        email: form.email.trim(),
        password: form.password,
        callbackUrl: redirect || '/dashboard',
      });
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      // The useSession hook will handle the redirect after successful login
      // No need to manually redirect here
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E7893] via-[#1a9bb8] to-[#E67919] flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/5 rounded-full blur-3xl"></div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed left-1/2 top-6 z-[80] -translate-x-1/2 animate-slideDown">
          <div className="rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-2xl flex items-center gap-2 border border-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className={`relative mx-auto max-w-6xl px-4 sm:px-6 py-10 w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-0 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 backdrop-blur-sm sm:max-w-3xl md:max-w-5xl md:grid-cols-2 transform hover:shadow-3xl transition-shadow duration-300">
          
          {/* Left: illustrative section with logo */}
          <div className="hidden md:flex relative bg-gradient-to-br from-[#1a9bb8] to-[#0E7893] h-full flex-col justify-between p-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <FaPlane className="text-[#E67919] text-2xl" />
              </div>
              <div>
                <h2 className="text-white font-bold text-2xl">Clean JS Shipping</h2>
                <p className="text-cyan-100 text-xs">Logistics & Delivery</p>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative h-64 my-8">
              <Image 
                src="/images/Logo.png" 
                alt="Authentication" 
                fill 
                priority 
                className="object-contain drop-shadow-2xl"
              />
            </div>

            {/* Bottom text */}
            <div className="space-y-3">
              <h3 className="text-white font-bold text-xl">Welcome to our platform</h3>
              <p className="text-cyan-100 text-sm leading-relaxed">
                Manage your shipments, track deliveries, and streamline your logistics operations all in one place.
              </p>
             
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white px-8 py-10 md:px-10 md:py-12">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0E7893] to-[#1a9bb8] rounded-xl flex items-center justify-center shadow-lg">
                <FaPlane className="text-white text-xl" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-[#E67919]">Clean JS Shipping</h2>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#0E7893] to-[#1a9bb8] bg-clip-text text-transparent">
                Welcome Back!
              </h1>
              <p className="mt-2 text-sm text-gray-600">Please enter your details to sign in and continue.</p>
              
              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                {/* Email input */}
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
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  {errors.email && (
                    <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Password input */}
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400 group-focus-within:text-[#E67919] transition-colors" />
                    </div>
                    <input
                      className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-11 pr-12 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all duration-200"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#E67919] transition-colors"
                    >
                      {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.password}
                    </div>
                  )}
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-700 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.rememberMe}
                      onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#E67919] focus:ring-[#E67919] cursor-pointer"
                    />
                    <span className="group-hover:text-[#0E7893] transition-colors">Remember me</span>
                  </label>
                  <a href="/password-reset" className="text-[#0E7893] hover:text-[#E67919] font-medium transition-colors hover:underline">
                    Forgot Password?
                  </a>
                </div>

                {/* Submit button */}
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      LOGIN
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Register link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link 
                    href="/register" 
                    className="text-[#0E7893] hover:text-[#E67919] font-semibold transition-colors hover:underline"
                  >
                    Register now
                  </Link>
                </p>
              </div>

              {/* Divider */}
              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-white text-gray-500">Secure Login</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}