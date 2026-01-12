// src/app/warehouse/messages/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, User, Headphones, Clock, Search, RefreshCw, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";

type Conversation = {
  userCode: string;
  customerName: string;
  customerEmail: string;
  customerId: string;
  messages: Array<{
    _id: string;
    subject?: string;
    body: string;
    sender: "customer" | "support";
    read?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }>;
  unread: number;
  lastMessage?: string;
  lastAt?: Date;
  isBroadcast?: boolean;
  broadcastId?: string;
};

export default function WarehouseMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ body: "" });
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/warehouse/messages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load messages");
      const conversationsList = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(conversationsList);
      // Auto-select first conversation if none selected
      if (!activeConversation && conversationsList.length > 0) {
        setActiveConversation(conversationsList[0]);
      }
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
    }, 60000); // Increased from 30 seconds to 60 seconds to reduce frequent loading
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (activeConversation && activeConversation.unread > 0) {
      // Mark all unread messages in this conversation as read
      const unreadMessages = activeConversation.messages.filter(m => !m.read);
      if (unreadMessages.length > 0) {
        Promise.all(
          unreadMessages.map(m =>
            fetch("/api/warehouse/messages", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messageId: m._id, read: true }),
            }).catch(err => console.error("Error marking message as read:", err))
          )
        ).then(() => {
          // Update local state immediately to reflect read status
          setConversations(prev => 
            prev.map(conv => {
              if (conv.userCode === activeConversation.userCode) {
                return {
                  ...conv,
                  messages: conv.messages.map(m => ({ ...m, read: true })),
                  unread: 0
                };
              }
              return conv;
            })
          );
          // Also update active conversation
          setActiveConversation(prev => prev ? {
            ...prev,
            messages: prev.messages.map(m => ({ ...m, read: true })),
            unread: 0
          } : null);
        });
      }
    }
  }, [activeConversation?.userCode]); // Only when conversation changes

  useEffect(() => {
    // Update active conversation when conversations change
    if (activeConversation && conversations.length > 0) {
      const updated = conversations.find(c => c.userCode === activeConversation.userCode);
      if (updated) {
        setActiveConversation(updated);
      }
    }
  }, [conversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, saving]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.customerName.toLowerCase().includes(q) ||
      c.customerEmail.toLowerCase().includes(q) ||
      c.userCode.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConversation || !form.body.trim()) {
      toast.error("Please select a conversation and enter a message");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/warehouse/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCode: activeConversation.userCode,
          body: form.body,
          subject: "Support Team",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setForm({ body: "" });
      await load();
      toast.success("Message sent successfully!");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  const currentThread = activeConversation?.messages || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight md:text-3xl">Customer Messages</h1>
                  <p className="text-blue-100 mt-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Respond to customer inquiries
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

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#E67919] to-[#f59e42] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Customer Conversations
            </h2>
          </div>
          <div className="grid gap-0 md:grid-cols-12">
            {/* Conversations Sidebar */}
            <div className="md:col-span-4 border-r border-gray-200 bg-gradient-to-b from-slate-50 to-white">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
                {loading ? (
                  <Loading message="Loading conversations..." />
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-600">No conversations</p>
                    <p className="text-xs text-gray-400 mt-1 text-center">No customer messages yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredConversations.map((conv) => {
                      const isActive = activeConversation?.userCode === conv.userCode;
                      return (
                        <button
                          key={conv.userCode}
                          onClick={() => setActiveConversation(conv)}
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
                                  {conv.isBroadcast ? (
                                    <MessageSquare className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                                  ) : (
                                    <User className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                                  )}
                                </div>
                                <div className={`text-sm font-semibold truncate ${isActive ? 'text-[#0f4d8a]' : 'text-gray-900'}`}>
                                  {conv.customerName}
                                </div>
                              </div>
                              {!conv.isBroadcast && (
                                <>
                                  <p className="text-xs text-gray-500 truncate mt-1">{conv.customerEmail}</p>
                                  <p className="text-xs text-gray-400 mt-1">Code: {conv.userCode}</p>
                                </>
                              )}
                              {conv.lastMessage && (
                                <p className="text-xs text-gray-500 truncate mt-2">
                                  {conv.lastMessage}
                                </p>
                              )}
                            </div>
                            {conv.unread > 0 && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E67919] text-white text-xs font-bold">
                                {conv.unread}
                              </span>
                            )}
                            {conv.isBroadcast && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                📢 Broadcast
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
              {activeConversation ? (
                <>
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8]">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{activeConversation.customerName}</h3>
                        <p className="text-xs text-blue-100">{activeConversation.customerEmail} • {activeConversation.userCode}</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white"
                    style={{ maxHeight: "calc(100vh - 400px)", minHeight: "400px" }}
                  >
                    {currentThread.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-sm font-medium text-gray-600">No messages yet</p>
                      </div>
                    ) : (
                      <>
                        {currentThread.map((m) => {
                          const isCustomer = m.sender === "customer";
                          return (
                            <div 
                              key={m._id} 
                              className={`flex ${isCustomer ? "justify-start" : "justify-end"} animate-fade-in`}
                            >
                              <div className={`flex items-end space-x-2 max-w-[75%] ${isCustomer ? '' : 'flex-row-reverse space-x-reverse'}`}>
                                <div className={`flex-shrink-0 p-2 rounded-full ${
                                  isCustomer ? 'bg-blue-100' : 'bg-[#E67919]'
                                }`}>
                                  {isCustomer ? (
                                    <User className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <Headphones className="h-4 w-4 text-white" />
                                  )}
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${
                                  isCustomer 
                                    ? 'bg-white border border-gray-200 text-gray-900' 
                                    : 'bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                                  <p className={`text-xs mt-1 ${
                                    isCustomer ? 'text-gray-400' : 'text-blue-100'
                                  }`}>
                                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={endRef} />
                      </>
                    )}
                  </div>

                  <form onSubmit={onSubmit} className="border-t border-gray-200 p-4 bg-white">
                    {activeConversation.isBroadcast ? (
                      <div className="text-center text-gray-500 text-sm">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>Broadcast messages are announcements only.</p>
                        <p className="text-xs mt-1">Customers cannot reply to broadcast messages.</p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                          placeholder="Type your message..."
                          value={form.body}
                          onChange={(e) => setForm({ body: e.target.value })}
                          rows={3}
                          required
                        />
                        <button
                          type="submit"
                          disabled={saving || !form.body.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {saving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-sm font-medium text-gray-600">Select a conversation to start</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

