// src/app/customer/messages/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, User, Headphones, Clock, Search, RefreshCw, XCircle } from "lucide-react";

type Msg = {
  _id: string;
  subject?: string;
  body: string;
  sender: "customer" | "support";
  broadcastId?: string;
  read?: boolean;
  createdAt?: string;
};

export default function CustomerMessagesPage() {
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/messages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load messages");
      setItems(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Group messages by subject (conversation key). Handle broadcasts separately
  const conversations = useMemo(() => {
    const map = new Map<string, { key: string; title: string; lastAt?: string; unread: number; lastMessage?: string; isBroadcast?: boolean; broadcastId?: string }>();
    
    // Separate broadcast messages and regular messages
    const broadcastMessages = items.filter(m => m.broadcastId);
    const regularMessages = items.filter(m => !m.broadcastId);
    
    // Handle broadcast messages
    if (broadcastMessages.length > 0) {
      const latestBroadcast = broadcastMessages[0]; // Most recent broadcast
      map.set("📢 Broadcasts", {
        key: "📢 Broadcasts",
        title: "📢 Broadcasts",
        lastAt: latestBroadcast.createdAt,
        unread: broadcastMessages.filter(m => !m.read && !dismissedBroadcasts.has(m.broadcastId || "")).length,
        lastMessage: latestBroadcast.body,
        isBroadcast: true,
        broadcastId: latestBroadcast.broadcastId
      });
    }
    
    // Handle regular messages
    for (const m of regularMessages) {
      const key = (m.subject || "Support Team").trim() || "Support Team";
      const cur = map.get(key) || { key, title: key, lastAt: m.createdAt, unread: 0, lastMessage: m.body, isBroadcast: false };
      if (!cur.lastAt || (m.createdAt && new Date(m.createdAt) > new Date(cur.lastAt))) {
        cur.lastAt = m.createdAt;
        cur.lastMessage = m.body;
      }
      map.set(key, cur);
    }
    
    // Filter by search query
    let filtered = Array.from(map.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(q) || 
        (c.lastMessage?.toLowerCase().includes(q))
      );
    }
    // Sort by last activity desc, but keep broadcasts at top
    return filtered.sort((a, b) => {
      if (a.isBroadcast && !b.isBroadcast) return -1;
      if (!a.isBroadcast && b.isBroadcast) return 1;
      return new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime();
    });
  }, [items, searchQuery, dismissedBroadcasts]);

  const thread = useMemo(() => {
    const key = activeKey || conversations[0]?.key || null;
    if (!key) return [];
    
    // Handle broadcast thread
    if (key === "📢 Broadcasts") {
      return items.filter(m => m.broadcastId);
    }
    
    // Handle regular threads
    return items.filter((m) => !m.broadcastId && (m.subject || "Support Team").trim() === key);
  }, [items, conversations, activeKey]);

  function dismissBroadcast(broadcastId: string) {
    setDismissedBroadcasts(prev => new Set([...prev, broadcastId]));
    
    // Also mark as read in the database
    fetch("/api/customer/messages/dismiss-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcastId })
    }).catch(console.error);
  }

  useEffect(() => {
    // Scroll to bottom when thread changes
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, saving]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject || undefined,
          body: form.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setForm({ subject: "", body: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const currentConversationTitle = activeKey || conversations[0]?.title || "Support Team";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Animated Background Pattern */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Section */}
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">Messages</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat with our support team
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">
                        Support Online
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => load()}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </header>

          {/* Stats Cards Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversation Overview
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Conversations */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] shadow-lg">
                      <MessageSquare className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{conversations.length}</p>
                  </div>
                </div>

                {/* Active Thread */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#E67919] to-[#f59e42] shadow-lg">
                      <Headphones className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Active Thread</p>
                    <p className="mt-1 text-xl font-bold text-gray-900 truncate">{currentConversationTitle}</p>
                  </div>
                </div>

                {/* Messages in Thread */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0891b2] to-[#06b6d4] shadow-lg">
                      <Send className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Messages</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{thread.length}</p>
                  </div>
                </div>

                {/* Support Status */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 transition-all hover:shadow-2xl hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">Support Status</p>
                    <p className="mt-1 text-3xl font-bold text-green-600">Online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Main Chat Container */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Chat
              </h2>
            </div>
            <div className="grid gap-0 md:grid-cols-12">
              {/* Conversations Sidebar */}
              <div className="md:col-span-4 border-r border-gray-200 bg-gradient-to-b from-slate-50 to-white">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Conversations List */}
                <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin mb-3" />
                      <p className="text-sm text-gray-600">Loading conversations...</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-600">No conversations</p>
                      <p className="text-xs text-gray-400 mt-1 text-center">Start a new conversation below</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {conversations.map((c) => {
                        const isActive = (activeKey || conversations[0]?.key) === c.key;
                        return (
                          <button
                            key={c.key}
                            onClick={() => setActiveKey(c.key)}
                            className={`w-full p-4 text-left transition-all duration-200 ${
                              isActive 
                                ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-[#0f4d8a]" 
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`p-1.5 rounded-full ${isActive ? 'bg-[#0f4d8a]' : 'bg-gray-200'}`}>
                                    {c.isBroadcast ? (
                                      <MessageSquare className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                                    ) : (
                                      <Headphones className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                                    )}
                                  </div>
                                  <div className={`text-sm font-semibold truncate ${isActive ? 'text-[#0f4d8a]' : 'text-gray-900'}`}>
                                    {c.title}
                                  </div>
                                </div>
                                {c.lastMessage && (
                                  <p className="text-xs text-gray-500 truncate mt-1">
                                    {c.lastMessage}
                                  </p>
                                )}
                                <div className="flex items-center space-x-1 text-xs text-gray-400 mt-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{c.lastAt ? new Date(c.lastAt).toLocaleString() : ""}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {c.isBroadcast && c.unread > 0 && !dismissedBroadcasts.has(c.broadcastId || "") && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dismissBroadcast(c.broadcastId || "");
                                    }}
                                    className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                                    title="Dismiss broadcast notification"
                                  >
                                    1
                                  </button>
                                )}
                                {!c.isBroadcast && c.unread > 0 && (
                                  <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E67919] text-white text-xs font-bold">
                                    {c.unread}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="md:col-span-8 flex flex-col">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {currentConversationTitle === "📢 Broadcasts" ? (
                        <MessageSquare className="h-5 w-5 text-white" />
                      ) : (
                        <Headphones className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{currentConversationTitle}</h3>
                      <p className="text-xs text-blue-100">
                        {currentConversationTitle === "📢 Broadcasts" ? "Admin Announcements" : "Support Team - Online"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white"
                  style={{ maxHeight: "calc(100vh - 400px)", minHeight: "400px" }}
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin mb-3" />
                      <p className="text-sm text-gray-600">Loading messages...</p>
                    </div>
                  ) : thread.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-sm font-medium text-gray-600">No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1">Start the conversation below</p>
                    </div>
                  ) : (
                    <>
                      {thread.map((m) => {
                        const isCustomer = m.sender === "customer";
                        const isBroadcast = !!m.broadcastId;
                        return (
                          <div 
                            key={m._id} 
                            className={`flex ${isCustomer ? "justify-end" : "justify-start"} animate-fade-in`}
                          >
                            <div className={`flex items-end space-x-2 max-w-[75%] ${isCustomer ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              {/* Avatar */}
                              <div className={`flex-shrink-0 p-2 rounded-full ${
                                isCustomer 
                                  ? 'bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8]' 
                                  : isBroadcast
                                  ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                                  : 'bg-gradient-to-br from-[#E67919] to-[#f59e42]'
                              }`}>
                                {isCustomer ? (
                                  <User className="h-4 w-4 text-white" />
                                ) : isBroadcast ? (
                                  <MessageSquare className="h-4 w-4 text-white" />
                                ) : (
                                  <Headphones className="h-4 w-4 text-white" />
                                )}
                              </div>

                              {/* Message Bubble */}
                              <div>
                                <div className={`rounded-2xl px-4 py-3 shadow-md ${
                                  isCustomer 
                                    ? "bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-br-none" 
                                    : isBroadcast
                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-bl-none border-2 border-purple-300"
                                    : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                                }`}>
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {m.body}
                                  </div>
                                  {isBroadcast && (
                                    <div className="mt-2 pt-2 border-t border-purple-300">
                                      <p className="text-xs text-purple-100 italic">📢 Official Broadcast from Admin</p>
                                    </div>
                                  )}
                                </div>
                                <div className={`flex items-center space-x-1 mt-1 text-[10px] ${
                                  isCustomer ? 'justify-end text-gray-500' : 'text-gray-400'
                                }`}>
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endRef} />
                    </>
                  )}
                </div>

                {/* Input Area - Only show for non-broadcast conversations */}
                {currentConversationTitle !== "📢 Broadcasts" && (
                  <form onSubmit={onSubmit} className="border-t border-gray-200 bg-white p-4">
                    <div className="space-y-3">
                      {/* Subject Input (optional, hidden on mobile) */}
                      <input
                        className="hidden md:block w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        placeholder="Subject (optional)"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      />

                      {/* Message Input */}
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <textarea
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none"
                            placeholder="Type your message..."
                            rows={2}
                            value={form.body}
                            onChange={(e) => setForm({ ...form, body: e.target.value })}
                            required
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit(e as any);
                              }
                            }}
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={saving || !form.body.trim()}
                          className="flex-shrink-0 p-4 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Hint Text */}
                      <p className="text-xs text-gray-400 text-center">
                        Press Enter to send • Shift + Enter for new line
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </form>
                )}

                {/* Broadcast Notice */}
                {currentConversationTitle === "📢 Broadcasts" && (
                  <div className="border-t border-gray-200 bg-purple-50 p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-purple-600">
                      <MessageSquare className="h-4 w-4" />
                      <p className="text-sm font-medium">Broadcast messages are read-only announcements from admin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Help Banner */}
          <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Headphones className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Need immediate assistance?</h3>
                </div>
                <p className="text-blue-100 mb-4">
                  Our support team is available 24/7 to help you with any questions or concerns.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className="px-6 py-3 bg-white text-[#0f4d8a] rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200">
                    Contact Support
                  </button>
                  <button className="px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-lg font-semibold hover:bg-white/30 transition-all duration-200">
                    View FAQ
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-semibold">24/7 Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}