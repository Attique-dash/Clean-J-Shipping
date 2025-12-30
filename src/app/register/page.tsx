"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaPlane } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  agreeTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  agreeTerms?: string;
}


export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const [form, setForm] = useState<FormData>({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "", 
    password: "", 
    confirmPassword: "", 
    dateOfBirth: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Jamaica"
    },
    agreeTerms: false 
  });

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Form validation
    const next: FormErrors = {};
    
    if (!form.firstName.trim()) {
      next.firstName = "First name is required";
    }
    
    if (!form.lastName.trim()) {
      next.lastName = "Last name is required";
    }
    
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Please enter a valid email";
    }
    
    if (!form.phone.trim()) {
      next.phone = "Phone number is required";
    } else if (!/^[+]?[\d\s\-\(\)]+$/.test(form.phone.trim())) {
      next.phone = "Please enter a valid phone number";
    }
    
    if (!form.password) {
      next.password = "Password is required";
    } else if (form.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    
    if (!form.confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    
    if (!form.address.street.trim()) {
      next.street = "Street address is required";
    }
    
    if (!form.address.city.trim()) {
      next.city = "City is required";
    }
    
    if (!form.agreeTerms) {
      next.agreeTerms = "You must accept the terms and conditions";
    }
    
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          dateOfBirth: form.dateOfBirth || undefined,
          address: {
            street: form.address.street,
            city: form.address.city,
            parish: form.address.state, // Map state to parish for backend
            zipCode: form.address.zipCode || '00000' // Include zipCode with fallback
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?message=Registration successful! Please check your email to verify your account.");
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0E7893] via-[#1a9bb8] to-[#E67919] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">Your account has been created. Redirecting to login...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
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

      {/* Error notification */}
      {error && (
        <div className="fixed left-1/2 top-6 z-[80] -translate-x-1/2 animate-slideDown">
          <div className="rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-2xl flex items-center gap-3 border border-red-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 ml-2 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={`relative mx-auto max-w-6xl px-4 sm:px-6 py-10 w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-0 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 backdrop-blur-sm sm:max-w-3xl md:max-w-6xl md:grid-cols-2 transform hover:shadow-3xl transition-shadow duration-300">
          
          {/* Left: illustrative section */}
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

            <div className="space-y-6">
              <div className="relative h-64 w-full flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <Image 
                    src="/images/Logo.png" 
                    alt="Clean J Shipping Logo" 
                    fill
                    priority 
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain drop-shadow-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzBBNzY5MyIgZD0iTTEyLDIwQTgsOCAwIDAsMSA0LDEyQTgsOCAwIDAsMSAxMiw0QTgsOCAwIDAsMSAyMCwxMkE4LDggMCAwLDEgMTIsMjBNMTIsMkExMCwxMCAwIDAsMCAyLDEyQTEwLDEwIDAgMCwwIDEyLDIyQTEwLDEwIDAgMCwwIDIyLDEyQTEwLDEwIDAgMCwwIDEyLDJNMTIsMTBBMiwyIDAgMCwxIDE0LDEyQTIsMiAwIDAsMSAxMiwxNEEyLDIgMCAwLDEgMTAsMTJBMiwyIDAgMCwxIDEyLDExTDEyLDEzQTEgMSAwIDAsMCAxMywxMkExLDEgMCAwLDAgMTIsMTFBMSwxIDAgMCwwIDExLDEyQTEsMSAwIDAsMCAxMiwxM1oiIC8+PC9zdmc+';
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-bold text-xl">Create Your Account</h3>
                <p className="text-cyan-100 text-sm leading-relaxed">
                  Join our platform to manage your shipments, track deliveries, and streamline your logistics operations.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-cyan-100 text-sm">
                    <div className="w-2 h-2 bg-[#E67919] rounded-full"></div>
                    <span>Track packages in real-time</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-100 text-sm">
                    <div className="w-2 h-2 bg-[#E67919] rounded-full"></div>
                    <span>Manage multiple shipping addresses</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-100 text-sm">
                    <div className="w-2 h-2 bg-[#E67919] rounded-full"></div>
                    <span>Air and sea shipping options</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white px-8 py-8 md:px-10 md:py-10 overflow-y-auto max-h-screen">
            <div className="flex md:hidden items-center gap-3 justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0E7893] to-[#1a9bb8] rounded-xl flex items-center justify-center shadow-lg">
                <FaPlane className="text-white text-xl" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-[#E67919]">Clean J Shipping</h2>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#0E7893] to-[#1a9bb8] bg-clip-text text-transparent">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-gray-600">Join us to manage your shipping needs efficiently.</p>
              
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser className="text-gray-400 text-sm" />
                        </div>
                        <input
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                          type="text"
                          placeholder="John"
                          value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          required
                        />
                      </div>
                      {errors.firstName && (
                        <div className="text-xs text-red-600 mt-1">{errors.firstName}</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="Doe"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        required
                      />
                      {errors.lastName && (
                        <div className="text-xs text-red-600 mt-1">{errors.lastName}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaEnvelope className="text-gray-400 text-sm" />
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="email"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                    {errors.email && (
                      <div className="text-xs text-red-600 mt-1">{errors.email}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400 text-sm" />
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="tel"
                        placeholder="+1 876-123-4567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                    {errors.phone && (
                      <div className="text-xs text-red-600 mt-1">{errors.phone}</div>
                    )}
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Security</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="text-gray-400 text-sm" />
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-10 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#E67919] transition-colors"
                      >
                        {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="text-xs text-red-600 mt-1">{errors.password}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="text-gray-400 text-sm" />
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-10 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#E67919] transition-colors"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="text-xs text-red-600 mt-1">{errors.confirmPassword}</div>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#E67919]" />
                    Shipping Address
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaMapMarkerAlt className="text-gray-400 text-sm" />
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="123 Main Street"
                        value={form.address.street}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                        required
                      />
                    </div>
                    {errors.street && (
                      <div className="text-xs text-red-600 mt-1">{errors.street}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="Kingston"
                        value={form.address.city}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                        required
                      />
                      {errors.city && (
                        <div className="text-xs text-red-600 mt-1">{errors.city}</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State/Parish</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="St. Andrew"
                        value={form.address.state}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                        required
                      />
                      {errors.state && (
                        <div className="text-xs text-red-600 mt-1">{errors.state}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="JM12345"
                        value={form.address.zipCode}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })}
                        required
                      />
                      {errors.zipCode && (
                        <div className="text-xs text-red-600 mt-1">{errors.zipCode}</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E67919] focus:border-transparent focus:bg-white transition-all"
                        type="text"
                        placeholder="Jamaica"
                        value={form.address.country}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                        required
                      />
                      {errors.country && (
                        <div className="text-xs text-red-600 mt-1">{errors.country}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#E67919] focus:ring-[#E67919] cursor-pointer mt-0.5"
                      required
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" className="text-[#0E7893] hover:text-[#E67919] font-medium underline">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-[#0E7893] hover:text-[#E67919] font-medium underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.agreeTerms && (
                    <div className="text-xs text-red-600">{errors.agreeTerms}</div>
                  )}
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      CREATE ACCOUNT
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#0E7893] hover:text-[#E67919] font-medium transition-colors hover:underline">
                    Sign in here
                  </Link>
                </p>
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
