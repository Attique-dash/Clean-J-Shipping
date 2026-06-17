"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, Shield, Calendar, Clock, Edit2, Lock, Check, X, Building, Globe, LogOut, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import Loading from "@/components/Loading";

type Address = { street?: string; city?: string; state?: string; zip_code?: string; country?: string };
type Profile = {
  user_code: string; full_name: string; email: string; phone?: string;
  address?: Address; accountStatus?: "active" | "inactive"; lastLogin?: string; createdAt?: string;
};

function mapApiResponseToProfile(data: unknown): Profile | null {
  const response = data as { success?: boolean; data?: any };
  let userData = response.data;
  if (!userData) {
    const flatData = data as any;
    if (flatData && (flatData.user_code || flatData.userCode || flatData.email)) userData = flatData;
  }
  if (!userData) return null;
  const userCode = userData.userCode || userData.user_code || "";
  const fullName = userData.full_name || [userData.firstName, userData.lastName].filter(Boolean).join(" ") || userData.name || "";
  return {
    user_code: userCode, full_name: fullName, email: userData.email || "", phone: userData.phone,
    accountStatus: userData.accountStatus === "pending" ? "inactive" : userData.accountStatus || "active",
    lastLogin: userData.lastLogin, createdAt: userData.createdAt,
    address: userData.address ? { street: userData.address.street, city: userData.address.city, state: userData.address.state, zip_code: userData.address.zipCode || userData.address.zip_code, country: userData.address.country } : undefined,
  };
}

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/customer/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load profile");
      const mapped = mapApiResponseToProfile(data);
      if (mapped) setProfile(mapped); else throw new Error("Invalid profile data");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return;
    setSaving(true); setError(null);
    try {
      const payload = {
        firstName: profile.full_name.split(' ')[0] || "", lastName: profile.full_name.split(' ').slice(1).join(' ') || "",
        email: profile.email, phone: profile.phone,
        address: profile.address ? { street: profile.address.street, city: profile.address.city, state: profile.address.state, zipCode: profile.address.zip_code, country: profile.address.country } : undefined,
      };
      const res = await fetch("/api/customer/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      const updated = mapApiResponseToProfile(data);
      if (updated) setProfile(updated);
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <Loading message="Loading profile..." />;
  if (error && !profile) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="rounded-xl border-l-4 border-red-500 bg-white p-6 shadow-xl"><p className="text-red-600">{error}</p></div>
    </div>
  );
  if (!profile) return null;

  const completion = Math.round(((profile.full_name ? 1 : 0) + (profile.email ? 1 : 0) + (profile.phone ? 1 : 0) + (profile.address?.street ? 1 : 0) + (profile.address?.city ? 1 : 0)) / 5 * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-3">
            {profile.accountStatus === 'inactive' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-semibold"><X className="h-3.5 w-3.5"/>Inactive</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold"><Check className="h-3.5 w-3.5"/>Active</span>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>}

        {/* Profile Overview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-5 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] text-white shadow-lg">
                <User className="h-8 w-8"/>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5"><Mail className="h-3.5 w-3.5"/>{profile.email}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{profile.user_code}</p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm text-gray-500">Profile Completion</p>
                <p className="text-2xl font-bold text-[#0f4d8a]">{completion}%</p>
                <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] rounded-full transition-all" style={{width:`${completion}%`}}></div></div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="p-2 bg-white rounded-lg shadow-sm"><User className="h-4 w-4 text-[#0f4d8a]"/></div>
                <div><p className="text-xs text-gray-500">Full Name</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.full_name}</p></div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="p-2 bg-white rounded-lg shadow-sm"><Shield className="h-4 w-4 text-[#0f4d8a]"/></div>
                <div><p className="text-xs text-gray-500">User Code</p><p className="text-sm font-semibold font-mono text-gray-900 mt-0.5">{profile.user_code}</p></div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="p-2 bg-white rounded-lg shadow-sm"><Mail className="h-4 w-4 text-[#0f4d8a]"/></div>
                <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.email}</p></div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="p-2 bg-white rounded-lg shadow-sm"><Phone className="h-4 w-4 text-[#0f4d8a]"/></div>
                <div><p className="text-xs text-gray-500">Phone</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.phone || '—'}</p></div>
              </div>
            </div>

            {/* Address */}
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><MapPin className="h-4 w-4 text-[#E67919]"/>Address</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-gray-500">Street</p><p className="font-medium text-gray-800 mt-0.5">{profile.address?.street || '—'}</p></div>
                <div><p className="text-xs text-gray-500">City</p><p className="font-medium text-gray-800 mt-0.5">{profile.address?.city || '—'}</p></div>
                <div><p className="text-xs text-gray-500">State / ZIP</p><p className="font-medium text-gray-800 mt-0.5">{[profile.address?.state, profile.address?.zip_code].filter(Boolean).join(', ') || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Country</p><p className="font-medium text-gray-800 mt-0.5">{profile.address?.country || '—'}</p></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100">
              <button onClick={()=>setEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg text-sm"><Edit2 className="h-4 w-4"/>Edit Profile</button>
              <button onClick={()=>setPwdOpen(!pwdOpen)} className="flex items-center gap-2 px-5 py-2.5 border-2 border-[#0f4d8a] text-[#0f4d8a] rounded-lg hover:bg-blue-50 text-sm font-semibold"><Lock className="h-4 w-4"/>{pwdOpen ? 'Close' : 'Change Password'}</button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Edit2 className="h-5 w-5 text-[#0f4d8a]"/>Edit Profile</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.full_name} onChange={e=>setProfile({...profile, full_name: e.target.value})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input type="email" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.email} onChange={e=>setProfile({...profile, email: e.target.value})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.phone||""} onChange={e=>setProfile({...profile, phone: e.target.value})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">User Code</label><input className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500" value={profile.user_code} readOnly/></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Street</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.address?.street||""} onChange={e=>setProfile({...profile, address:{...(profile.address||{}), street: e.target.value}})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">City</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.address?.city||""} onChange={e=>setProfile({...profile, address:{...(profile.address||{}), city: e.target.value}})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">State</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.address?.state||""} onChange={e=>setProfile({...profile, address:{...(profile.address||{}), state: e.target.value}})}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code</label><input className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none" value={profile.address?.zip_code||""} onChange={e=>setProfile({...profile, address:{...(profile.address||{}), zip_code: e.target.value}})}/></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={()=>setEditing(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg font-semibold hover:shadow-lg text-sm disabled:opacity-50">{saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Saving...</> : <><Check className="h-4 w-4"/>Save Changes</>}</button>
              </div>
            </form>
          </div>
        )}

        {/* Change Password */}
        {pwdOpen && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Lock className="h-5 w-5 text-[#E67919]"/>Change Password</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setPwdSaving(true); setPwdError(null); setPwdOk(false);
              try {
                const res = await fetch("/api/customer/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pwdForm) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "Failed");
                setPwdOk(true); setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
              } catch (err) { setPwdError(err instanceof Error ? err.message : "Failed"); }
              finally { setPwdSaving(false); }
            }} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label><input type="password" placeholder="Enter current password" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#E67919] focus:ring-2 focus:ring-orange-100 focus:outline-none" value={pwdForm.current_password} onChange={e=>setPwdForm({...pwdForm, current_password: e.target.value})} required/></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label><input type="password" placeholder="Enter new password" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#E67919] focus:ring-2 focus:ring-orange-100 focus:outline-none" value={pwdForm.new_password} onChange={e=>setPwdForm({...pwdForm, new_password: e.target.value})} required/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label><input type="password" placeholder="Confirm new password" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#E67919] focus:ring-2 focus:ring-orange-100 focus:outline-none" value={pwdForm.confirm_password} onChange={e=>setPwdForm({...pwdForm, confirm_password: e.target.value})} required/></div>
              </div>
              {pwdError && <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg text-sm text-red-700"><X className="h-4 w-4"/>{pwdError}</div>}
              {pwdOk && <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg text-sm text-green-700"><Check className="h-4 w-4"/>Password updated successfully!</div>}
              <div className="flex justify-end"><button type="submit" disabled={pwdSaving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E67919] to-[#f59e0b] text-white rounded-lg font-semibold hover:shadow-lg text-sm disabled:opacity-50">{pwdSaving ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>Updating...</> : <><Lock className="h-4 w-4"/>Update Password</>}</button></div>
            </form>
          </div>
        )}

        {/* Account Info & Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-[#0891b2]"/>Account Info</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500 flex items-center gap-2"><Clock className="h-4 w-4"/>Last Login</span><span className="text-sm font-semibold text-gray-900">{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}</span></div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500 flex items-center gap-2"><Calendar className="h-4 w-4"/>Member Since</span><span className="text-sm font-semibold text-gray-900">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Account Actions</h2>
            <div className="space-y-3">
              <button onClick={async () => { try { const res = await fetch("/api/auth/logout", { method: "POST" }); if (res.ok) window.location.href = "/login"; } catch {} }} className="flex w-full items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><LogOut className="h-4 w-4 text-blue-600"/></div><div className="text-left"><p className="text-sm font-semibold text-gray-900">Logout</p><p className="text-xs text-gray-500">Sign out of your account</p></div></div>
                <span className="text-gray-400">→</span>
              </button>
              <button onClick={()=>setDeleteModalOpen(true)} className="flex w-full items-center justify-between p-3 border border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors">
                <div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><Trash2 className="h-4 w-4 text-red-600"/></div><div className="text-left"><p className="text-sm font-semibold text-red-600">Delete Account</p><p className="text-xs text-gray-500">Permanently remove your account</p></div></div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setDeleteModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e=>e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4"><h3 className="text-xl font-semibold text-white flex items-center gap-2"><AlertTriangle className="h-5 w-5"/>Delete Account</h3></div>
              <div className="p-6 space-y-4">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle className="h-8 w-8 text-red-600"/></div>
                  <div><h4 className="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h4>
                    <ul className="text-left text-sm text-gray-600 space-y-1"><li>• Permanently delete your profile and information</li><li>• Remove all packages and shipping history</li><li>• Cancel all pending payments</li></ul>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={()=>setDeleteModalOpen(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={async () => {
                    setDeleteLoading(true);
                    try { const res = await fetch("/api/customer/profile/delete", { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data?.error||"Failed"); localStorage.clear(); window.location.href = "/login"; }
                    catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
                    finally { setDeleteLoading(false); setDeleteModalOpen(false); }
                  }} disabled={deleteLoading} className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg flex items-center disabled:opacity-50">
                    {deleteLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"/>Deleting...</> : <><Trash2 className="h-4 w-4 mr-2"/>Delete Account</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
