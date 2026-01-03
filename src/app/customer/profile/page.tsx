"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, Shield, Calendar, Clock, Edit2, Lock, Check, X, Building, Globe, CreditCard } from "lucide-react";

type Address = { street?: string; city?: string; state?: string; zip_code?: string; country?: string };

type Profile = {
  user_code: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: Address;
  accountStatus?: "active" | "inactive";
  lastLogin?: string;
  createdAt?: string;
};

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile", { cache: "no-store" });
      if (res.status === 404) {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (!meRes.ok || !meData?.user) throw new Error(meData?.error || "Failed to load profile");
        type MeUser = {
          userCode?: string;
          user_code?: string;
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
          lastLogin?: string;
          createdAt?: string;
        };
        const u: MeUser = meData.user as MeUser;
        const mapped: Profile = {
          user_code: u.userCode || u.user_code || "",
          full_name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "",
          email: u.email || "",
          phone: u.phone,
          address: u.address
            ? { street: u.address.street, city: u.address.city, state: u.address.state, zip_code: u.address.zipCode, country: u.address.country }
            : undefined,
          lastLogin: u.lastLogin,
          createdAt: u.createdAt,
        };
        setProfile(mapped);
      } else {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load profile");
        setProfile(data as Profile);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setProfile(data as Profile);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#0f4d8a]"></div>
          <span className="text-lg text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="rounded-xl border-l-4 border-red-500 bg-white p-6 shadow-xl">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header Banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4d8a] via-[#1565a8] to-[#0891b2] p-8 shadow-xl">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 h-64 w-64 rounded-full bg-[#E67919]/20 blur-3xl"></div>
          <div className="relative flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
              <User className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{profile.full_name}</h1>
              <p className="mt-2 flex items-center gap-2 text-blue-100">
                <Mail className="h-4 w-4" />
                {profile.email}
              </p>
            </div>
            <div className="ml-auto">
              {profile.accountStatus === 'inactive' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-2 ring-red-400/30">
                  <X className="h-4 w-4" />
                  Inactive
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-2 ring-emerald-400/30">
                  <Check className="h-4 w-4" />
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-md">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-500" />
              <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Profile Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Personal Information Card */}
            <div className="overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a] to-[#1565a8] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <User className="h-5 w-5" />
                    Personal Information
                  </h2>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {editing ? (
                <form onSubmit={onSave} className="p-6">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <User className="h-4 w-4 text-[#0891b2]" />
                          Full Name
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#0891b2] focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Mail className="h-4 w-4 text-[#0891b2]" />
                          Email Address
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#0891b2] focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20"
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Phone className="h-4 w-4 text-[#0891b2]" />
                          Phone Number
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#0891b2] focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Shield className="h-4 w-4 text-[#0891b2]" />
                          User Code
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500"
                          value={profile.user_code}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                        <MapPin className="h-5 w-5 text-[#E67919]" />
                        Shipping Address
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Building className="h-4 w-4 text-[#E67919]" />
                            Street Address
                          </label>
                          <input
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                            value={profile.address?.street || ""}
                            onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), street: e.target.value } })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                            <input
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                              value={profile.address?.city || ""}
                              onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), city: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">State</label>
                            <input
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                              value={profile.address?.state || ""}
                              onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), state: e.target.value } })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">ZIP Code</label>
                            <input
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                              value={profile.address?.zip_code || ""}
                              onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), zip_code: e.target.value } })}
                            />
                          </div>
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Globe className="h-4 w-4 text-[#E67919]" />
                              Country
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                              value={profile.address?.country || ""}
                              onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), country: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#1565a8] px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Full Name</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{profile.full_name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">User Code</p>
                          <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{profile.user_code}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Email Address</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Phone Number</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{profile.phone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6">
                      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                        <MapPin className="h-5 w-5 text-[#E67919]" />
                        Shipping Address
                      </h3>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#E67919]" />
                          {profile.address?.street || 'No street address'}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#E67919]" />
                          {[profile.address?.city, profile.address?.state, profile.address?.zip_code].filter(Boolean).join(', ') || 'No city/state'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-[#E67919]" />
                          {profile.address?.country || 'No country'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="border-b border-gray-200 bg-gradient-to-r from-[#E67919] to-[#f59e0b] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Lock className="h-5 w-5" />
                    Security Settings
                  </h2>
                  <button
                    onClick={() => setPwdOpen(!pwdOpen)}
                    className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30"
                  >
                    {pwdOpen ? 'Close' : 'Change Password'}
                  </button>
                </div>
              </div>

              {pwdOpen && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPwdSaving(true);
                    setPwdError(null);
                    setPwdOk(false);
                    try {
                      const res = await fetch("/api/customer/profile/password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(pwdForm),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data?.error || "Failed to change password");
                      setPwdOk(true);
                      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
                    } catch (err) {
                      setPwdError(err instanceof Error ? err.message : "Failed");
                    } finally {
                      setPwdSaving(false);
                    }
                  }}
                  className="p-6"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Current Password</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                        type="password"
                        placeholder="Enter current password"
                        value={pwdForm.current_password}
                        onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">New Password</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                          type="password"
                          placeholder="Enter new password"
                          value={pwdForm.new_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-[#E67919] focus:outline-none focus:ring-2 focus:ring-[#E67919]/20"
                          type="password"
                          placeholder="Confirm new password"
                          value={pwdForm.confirm_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {pwdError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        <X className="h-4 w-4" />
                        {pwdError}
                      </div>
                    )}

                    {pwdOk && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                        <Check className="h-4 w-4" />
                        Password updated successfully!
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={pwdSaving}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#E67919] to-[#f59e0b] px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                      >
                        {pwdSaving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Update Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column - Account Stats */}
          <div className="space-y-6">
            {/* Account Status Card */}
            <div className="overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Shield className="h-5 w-5" />
                  Account Status
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status</span>
                      {profile.accountStatus === 'inactive' ? (
                        <span className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          <X className="h-3 w-3" />
                          Inactive
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500">Last Login</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E67919] to-[#f59e0b]">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500">Member Since</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Quick Actions Card */}
            <div className="overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1565a8] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:border-[#0891b2] hover:bg-cyan-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0891b2] to-[#06b6d4]">
                        <Edit2 className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">Edit Profile</p>
                        <p className="text-xs text-gray-500">Update your information</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setPwdOpen(true)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:border-[#E67919] hover:bg-orange-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E67919] to-[#f59e0b]">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">Change Password</p>
                        <p className="text-xs text-gray-500">Update security credentials</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Completion Card */}
            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Profile Completion</h3>
                  <span className="text-2xl font-bold text-white">
                    {Math.round(
                      ((profile.full_name ? 1 : 0) +
                        (profile.email ? 1 : 0) +
                        (profile.phone ? 1 : 0) +
                        (profile.address?.street ? 1 : 0) +
                        (profile.address?.city ? 1 : 0)) /
                        5 *
                        100
                    )}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white shadow-lg transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        ((profile.full_name ? 1 : 0) +
                          (profile.email ? 1 : 0) +
                          (profile.phone ? 1 : 0) +
                          (profile.address?.street ? 1 : 0) +
                          (profile.address?.city ? 1 : 0)) /
                          5 *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="mt-3 text-sm text-blue-100">
                  Complete your profile to unlock all features
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}