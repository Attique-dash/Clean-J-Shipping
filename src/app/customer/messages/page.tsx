// src/app/customer/messages/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, User, Headphones, Clock, Search, RefreshCw } from "lucide-react";

type Msg = {
  _id: string;
  subject?: string;
  body: string;
  sender: "customer" | "support";
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

  // Group messages by subject (conversation key). Fallback to "Support Team"
  const conversations = useMemo(() => {
    const map = new Map<string, { key: string; title: string; lastAt?: string; unread: number; lastMessage?: string }>();
    for (const m of items) {
      const key = (m.subject || "Support Team").trim() || "Support Team";
      const cur = map.get(key) || { key, title: key, lastAt: m.createdAt, unread: 0, lastMessage: m.body };
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
    // Sort by last activity desc
    return filtered.sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
  }, [items, searchQuery]);

  const thread = useMemo(() => {
    const key = activeKey || conversations[0]?.key || null;
    return key ? items.filter((m) => (m.subject || "Support Team").trim() === key) : [];
  }, [items, conversations, activeKey]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0f4d8a]">Messages</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Chat with our support team
                </p>
              </div>
            </div>
            <button
              onClick={() => load()}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
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
                                  <Headphones className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
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
                            {c.unread > 0 && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E67919] text-white text-xs font-bold">
                                {c.unread}
                              </span>
                            )}
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
                    <Headphones className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{currentConversationTitle}</h3>
                    <p className="text-xs text-blue-100">Support Team - Online</p>
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
                                : 'bg-gradient-to-br from-[#E67919] to-[#f59e42]'
                            }`}>
                              {isCustomer ? (
                                <User className="h-4 w-4 text-white" />
                              ) : (
                                <Headphones className="h-4 w-4 text-white" />
                              )}
                            </div>

                            {/* Message Bubble */}
                            <div>
                              <div className={`rounded-2xl px-4 py-3 shadow-md ${
                                isCustomer 
                                  ? "bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-br-none" 
                                  : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                              }`}>
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {m.body}
                                </div>
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

              {/* Input Area */}
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
            </div>
          </div>
        </div>

        {/* Help Banner */}
        <div className="bg-gradient-to-r from-[#0f4d8a] via-[#1e6bb8] to-[#E67919] rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Need immediate assistance?</h3>
                <p className="text-blue-100 text-sm">Our support team is available 24/7</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-semibold">Support Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}