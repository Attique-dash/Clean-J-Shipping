"use client";

import { useEffect, useState } from "react";

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
        // Fallback to /api/auth/me
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-5xl p-6">Loading...</div>;
  if (error) return <div className="mx-auto max-w-5xl p-6 text-red-600">{error}</div>;
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-[#153e75] px-6 py-3 text-white">
          <h1 className="text-lg font-semibold">Manage Account</h1>
        </div>
        <div className="grid gap-6 bg-white p-6 md:grid-cols-3">
          {/* Left column */}
          <div className="md:col-span-2 space-y-4">
            {/* Personal Information */}
            <div className="rounded-lg border bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">Personal Information</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Verified ✔</span>
              </div>
              <div className="grid gap-2 text-sm text-gray-800 md:grid-cols-2">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{profile.full_name}</span></div>
                <div><span className="text-gray-500">User Code:</span> <span className="font-medium">{profile.user_code}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{profile.email}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{profile.phone || '-'}</span></div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-lg border bg-white p-5">
              <div className="mb-3 text-base font-semibold">Shipping Address</div>
              <div className="text-sm text-gray-800">
                <div>{profile.address?.street || '-'}</div>
                <div>{[profile.address?.city, profile.address?.state, profile.address?.zip_code].filter(Boolean).join(', ')}</div>
                <div>{profile.address?.country || '-'}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Edit Profile
                </button>
                <a
                  href="#"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Change Password
                </a>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-5">
              <div className="mb-3 text-base font-semibold">Account</div>
              <div className="space-y-2 text-sm text-gray-800">
                <div><span className="text-gray-500">Last Login:</span> <span>{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '-'}</span></div>
                <div><span className="text-gray-500">Member Since:</span> <span>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Status:</span> {profile.accountStatus === 'inactive' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Inactive</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                )}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <form onSubmit={onSave} className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs">Full name</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs">Email</label>
              <input className="w-full rounded-md border px-3 py-2" type="email" value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs">Phone</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs">User Code</label>
              <input className="w-full rounded-md border bg-gray-100 px-3 py-2" value={profile.user_code} readOnly />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs">Street</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.address?.street || ""}
                onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), street: e.target.value } })} />
            </div>
            <div>
              <label className="mb-1 block text-xs">City</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.address?.city || ""}
                onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), city: e.target.value } })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs">State</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.address?.state || ""}
                onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), state: e.target.value } })} />
            </div>
            <div>
              <label className="mb-1 block text-xs">ZIP Code</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.address?.zip_code || ""}
                onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), zip_code: e.target.value } })} />
            </div>
            <div>
              <label className="mb-1 block text-xs">Country</label>
              <input className="w-full rounded-md border px-3 py-2" value={profile.address?.country || ""}
                onChange={(e) => setProfile({ ...profile, address: { ...(profile.address || {}), country: e.target.value } })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {profile && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-semibold">Change Password</div>
            <button type="button" onClick={() => setPwdOpen((v) => !v)} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
              {pwdOpen ? "Close" : "Open"}
            </button>
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
              className="grid gap-3 md:grid-cols-3"
            >
              <input className="rounded-md border px-3 py-2" type="password" placeholder="Current password" value={pwdForm.current_password} onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })} required />
              <input className="rounded-md border px-3 py-2" type="password" placeholder="New password" value={pwdForm.new_password} onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })} required />
              <input className="rounded-md border px-3 py-2" type="password" placeholder="Confirm new password" value={pwdForm.confirm_password} onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })} required />
              <div className="md:col-span-3 flex items-center justify-end gap-2">
                {pwdError && <div className="text-sm text-red-600">{pwdError}</div>}
                {pwdOk && <div className="text-sm text-green-700">Password updated</div>}
                <button disabled={pwdSaving} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{pwdSaving ? "Updating..." : "Update Password"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
