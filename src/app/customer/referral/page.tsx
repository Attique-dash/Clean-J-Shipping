"use client";

import { useState, useEffect } from "react";
import { Users, Gift, Copy, CheckCircle, Mail, Send, Loader2, TrendingUp, DollarSign, Clock, UserPlus } from "lucide-react";

interface Referral {
  _id: string;
  referredEmail: string;
  referredName?: string;
  referralCode: string;
  status: string;
  rewardAmount?: number;
  rewardStatus?: string;
  registeredAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface ReferralData {
  referralCode: string;
  referrals: Referral[];
  stats: {
    total: number;
    pending: number;
    registered: number;
    completed: number;
    totalRewards: number;
    pendingRewards: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  registered: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rewarded: "bg-purple-100 text-purple-700",
};

export default function CustomerReferralPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReferralData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
  });

  async function loadReferrals() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/referral", { cache: "no-store" });
      const referralData: ReferralData = await res.json();
      if (!res.ok) throw new Error(referralData?.error || "Failed to load referrals");

      setData(referralData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferrals();
  }, []);

  async function submitReferral(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/customer/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Failed to create referral");

      setShowForm(false);
      setForm({ email: "", name: "" });
      await loadReferrals();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create referral");
    }
  }

  function copyReferralCode() {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareReferral() {
    const shareText = `Join Clean J Shipping using my referral code: ${data?.referralCode}\n\nGet started at: ${window.location.origin}/register?ref=${data?.referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "Join Clean J Shipping",
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Referral link copied to clipboard!");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl shadow-lg">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0f4d8a]">Referral Program</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Refer friends and earn rewards
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <UserPlus className="h-5 w-5" />
              Refer a Friend
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
            <span className="ml-3 text-gray-600">Loading referral data...</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Referral Code Card */}
            <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl shadow-xl p-8 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Your Referral Code</h2>
                  <p className="text-blue-100 mb-4">Share this code with friends to earn rewards</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-lg font-mono text-2xl font-bold">
                      {data.referralCode}
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={shareReferral}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0f4d8a] rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                  <Send className="h-5 w-5" />
                  Share
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Total Referrals</div>
                <div className="text-2xl font-bold text-[#0f4d8a] mt-1">{data.stats.total}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-gray-600 mt-1">{data.stats.pending}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Registered</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{data.stats.registered}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600 mt-1">{data.stats.completed}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Total Rewards</div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  ${data.stats.totalRewards.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="text-sm text-gray-600">Pending Rewards</div>
                <div className="text-2xl font-bold text-orange-600 mt-1">
                  ${data.stats.pendingRewards.toFixed(2)}
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-[#0f4d8a] mb-4">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Share Your Code</h3>
                    <p className="text-sm text-gray-600">Share your unique referral code with friends and family</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#E67919] to-[#f59e42] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">They Sign Up</h3>
                    <p className="text-sm text-gray-600">Your friend signs up using your referral code</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Earn Rewards</h3>
                    <p className="text-sm text-gray-600">You both earn rewards when they complete their first shipment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referrals List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                <h2 className="text-xl font-bold text-white">Your Referrals</h2>
              </div>
              {data.referrals.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No referrals yet</h3>
                  <p className="text-gray-500 mb-6">Start referring friends to earn rewards!</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all"
                  >
                    <UserPlus className="h-5 w-5" />
                    Refer a Friend
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.referrals.map((referral) => (
                    <div key={referral._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {referral.referredName || referral.referredEmail}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[referral.status] || STATUS_COLORS.pending}`}
                            >
                              {referral.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {referral.referredEmail}
                            </span>
                            {referral.registeredAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Registered: {new Date(referral.registeredAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {referral.rewardAmount && referral.rewardAmount > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-600">
                                Reward: ${referral.rewardAmount.toFixed(2)}
                              </span>
                              {referral.rewardStatus && (
                                <span className={`text-xs px-2 py-0.5 rounded ${referral.rewardStatus === "credited" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                  {referral.rewardStatus}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{new Date(referral.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Referral Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Refer a Friend</h2>
                <button onClick={() => setShowForm(false)} className="text-white hover:text-gray-200">
                  ×
                </button>
              </div>
              <form onSubmit={submitReferral} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Friend's Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    placeholder="friend@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Friend's Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    placeholder="John Doe"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">What happens next?</p>
                  <p>We'll send an invitation email to your friend with your referral code. When they sign up and complete their first shipment, you'll both earn rewards!</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all"
                  >
                    <Send className="h-4 w-4" />
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

