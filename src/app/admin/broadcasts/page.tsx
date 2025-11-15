"use client";

import { useEffect, useState } from "react";
import { Send, Calendar, Mail, Globe, Users, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  channels: ("email" | "portal")[];
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  portal_delivered: number;
  email_delivered: number;
  email_failed: number;
  created_at?: string | null;
};

export default function BroadcastsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [portal, setPortal] = useState(true);
  const [email, setEmail] = useState(false);
  const [schedule, setSchedule] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Broadcast[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/broadcast-messages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load broadcasts");
      setItems(Array.isArray(data?.broadcasts) ? data.broadcasts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const channels: ("email" | "portal")[] = [];
      if (portal) channels.push("portal");
      if (email) channels.push("email");
      if (channels.length === 0) channels.push("portal");
      const payload: { title: string; body: string; channels: ("email" | "portal")[]; scheduled_at?: string } = {
        title,
        body,
        channels,
      };
      if (schedule) payload.scheduled_at = new Date(schedule).toISOString();
      const res = await fetch("/api/admin/broadcast-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send broadcast");
      setTitle("");
      setBody("");
      setPortal(true);
      setEmail(false);
      setSchedule("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const totalStats = items.reduce((acc, b) => ({
    recipients: acc.recipients + b.total_recipients,
    delivered: acc.delivered + b.portal_delivered + b.email_delivered,
    failed: acc.failed + b.email_failed
  }), { recipients: 0, delivered: 0, failed: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
              Broadcast Messages
            </h1>
            <p className="text-slate-600 mt-1">Send announcements to your users via email and portal</p>
          </div>
          <button 
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Broadcasts</p>
                <p className="text-3xl font-bold text-[#0f4d8a] mt-1">{items.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0f4d8a] to-[#0f4d8a]/70 flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Recipients</p>
                <p className="text-3xl font-bold text-[#E67919] mt-1">{totalStats.recipients}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E67919] to-[#E67919]/70 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Delivered</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{totalStats.delivered}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Create Broadcast Form */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Send className="w-5 h-5" />
              Create New Broadcast
            </h2>
          </div>
          
          <form onSubmit={onSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Broadcast Title
                </label>
                <input 
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent transition-shadow" 
                  placeholder="Enter broadcast title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule (Optional)
                </label>
                <input 
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent transition-shadow" 
                  type="datetime-local" 
                  value={schedule} 
                  onChange={(e) => setSchedule(e.target.value)} 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message Body
              </label>
              <textarea 
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent transition-shadow resize-none" 
                rows={5} 
                placeholder="Enter your announcement message here..." 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Delivery Channels
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all hover:border-[#0f4d8a] hover:bg-blue-50" 
                  style={{ borderColor: portal ? '#0f4d8a' : '#e2e8f0', backgroundColor: portal ? '#eff6ff' : 'white' }}>
                  <input 
                    type="checkbox" 
                    checked={portal} 
                    onChange={(e) => setPortal(e.target.checked)} 
                    className="w-4 h-4 text-[#0f4d8a] focus:ring-[#0f4d8a]"
                  />
                  <Globe className="w-5 h-5 text-[#0f4d8a]" />
                  <span className="font-medium text-slate-700">Portal</span>
                </label>
                
                <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all hover:border-[#E67919] hover:bg-orange-50"
                  style={{ borderColor: email ? '#E67919' : '#e2e8f0', backgroundColor: email ? '#fff7ed' : 'white' }}>
                  <input 
                    type="checkbox" 
                    checked={email} 
                    onChange={(e) => setEmail(e.target.checked)} 
                    className="w-4 h-4 text-[#E67919] focus:ring-[#E67919]"
                  />
                  <Mail className="w-5 h-5 text-[#E67919]" />
                  <span className="font-medium text-slate-700">Email</span>
                </label>
              </div>
            </div>
            
            {error && (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button 
                disabled={submitting} 
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </form>
        </div>

        {/* Broadcasts List */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Recent Broadcasts</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-[#0f4d8a] animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No broadcasts yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first broadcast above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {items.map((b) => (
                  <div key={b.id} className="hover:bg-slate-50 transition-colors">
                    <div 
                      className="p-5 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 text-lg mb-1">{b.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              {b.sent_at ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {new Date(b.sent_at).toLocaleDateString()} at {new Date(b.sent_at).toLocaleTimeString()}
                                </>
                              ) : b.scheduled_at ? (
                                <>
                                  <Clock className="w-4 h-4 text-[#E67919]" />
                                  Scheduled: {new Date(b.scheduled_at).toLocaleDateString()} at {new Date(b.scheduled_at).toLocaleTimeString()}
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  Draft
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            {b.channels.map((ch) => (
                              <span 
                                key={ch}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: ch === 'portal' ? '#eff6ff' : '#fff7ed',
                                  color: ch === 'portal' ? '#0f4d8a' : '#E67919'
                                }}
                              >
                                {ch === 'portal' ? <Globe className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                {ch}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-slate-700">{b.total_recipients}</div>
                              <div className="text-xs text-slate-500">Recipients</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-green-600">{b.portal_delivered + b.email_delivered}</div>
                              <div className="text-xs text-slate-500">Delivered</div>
                            </div>
                            {b.email_failed > 0 && (
                              <div className="text-center">
                                <div className="font-semibold text-red-600">{b.email_failed}</div>
                                <div className="text-xs text-slate-500">Failed</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {expandedId === b.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{b.body}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-xs text-slate-600 mb-1">Portal Delivered</div>
                              <div className="text-xl font-bold text-[#0f4d8a]">{b.portal_delivered}</div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3">
                              <div className="text-xs text-slate-600 mb-1">Email Delivered</div>
                              <div className="text-xl font-bold text-[#E67919]">{b.email_delivered}</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-xs text-slate-600 mb-1">Total Success</div>
                              <div className="text-xl font-bold text-green-600">{b.portal_delivered + b.email_delivered}</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="text-xs text-slate-600 mb-1">Email Failed</div>
                              <div className="text-xl font-bold text-red-600">{b.email_failed}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}