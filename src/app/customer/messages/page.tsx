"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  }, []);

  // Group messages by subject (conversation key). Fallback to "Support Team"
  const conversations = useMemo(() => {
    const map = new Map<string, { key: string; title: string; lastAt?: string; unread: number }>();
    for (const m of items) {
      const key = (m.subject || "Support Team").trim() || "Support Team";
      const cur = map.get(key) || { key, title: key, lastAt: m.createdAt, unread: 0 };
      if (!cur.lastAt || (m.createdAt && new Date(m.createdAt) > new Date(cur.lastAt))) cur.lastAt = m.createdAt;
      map.set(key, cur);
    }
    // Sort by last activity desc
    return Array.from(map.values()).sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
  }, [items]);

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

  return (
    <div className="space-y-6">
      {/* Blue top bar */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-[#153e75] px-6 py-3 text-white">
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="grid gap-4 bg-white p-4 md:grid-cols-3">
          {/* Conversations list */}
          <div className="md:col-span-1">
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Conversations</div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-3 text-sm text-gray-600">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600">No conversations</div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setActiveKey(c.key)}
                      className={`flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 ${
                        (activeKey || conversations[0]?.key) === c.key ? "bg-gray-50" : ""
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">{c.title}</div>
                        <div className="text-xs text-gray-500">{c.lastAt ? new Date(c.lastAt).toLocaleString() : ""}</div>
                      </div>
                      {c.unread > 0 && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{c.unread}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat thread */}
          <div className="md:col-span-2">
            <div className="flex h-[520px] flex-col rounded-lg border">
              <div className="border-b px-4 py-2 text-sm font-semibold">{activeKey || conversations[0]?.title || "Support Team"}</div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
                {loading ? (
                  <div className="p-3 text-sm text-gray-600">Loading...</div>
                ) : thread.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600">No messages yet</div>
                ) : (
                  thread.map((m) => (
                    <div key={m._id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${
                        m.sender === "customer" ? "bg-blue-600 text-white" : "bg-white"
                      }`}>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className={`mt-1 text-[10px] ${m.sender === "customer" ? "text-blue-100" : "text-gray-500"}`}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-3">
                <input
                  className="hidden md:block w-52 rounded-md border px-3 py-2"
                  placeholder="Subject (optional)"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <input
                  className="flex-1 rounded-md border px-3 py-2"
                  placeholder="Type a message..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
                <button disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
                  {saving ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
