"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Broadcast Messages</h1>
        <button onClick={load} className="rounded-md border px-3 py-1.5 text-sm">Refresh</button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="rounded border px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="rounded border px-3 py-2" type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <textarea className="w-full rounded border px-3 py-2" rows={5} placeholder="Announcement body" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={portal} onChange={(e) => setPortal(e.target.checked)} /> Portal</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email</label>
        </div>
        {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">{error}</div>}
        <div className="flex justify-end">
          <button disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitting?"Sending...":"Send Broadcast"}</button>
        </div>
      </form>

      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/50">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Channels</th>
              <th className="px-3 py-2 text-left">Recipients</th>
              <th className="px-3 py-2 text-left">Portal</th>
              <th className="px-3 py-2 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3" colSpan={6}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-3" colSpan={6}>No broadcasts</td></tr>
            ) : (
              items.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2">{b.sent_at ? new Date(b.sent_at).toLocaleString() : (b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : '-')}</td>
                  <td className="px-3 py-2 font-medium">{b.title}</td>
                  <td className="px-3 py-2">{b.channels.join(", ")}</td>
                  <td className="px-3 py-2">{b.total_recipients}</td>
                  <td className="px-3 py-2">{b.portal_delivered}</td>
                  <td className="px-3 py-2">{b.email_delivered} {b.email_failed>0?`(failed: ${b.email_failed})`:''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
