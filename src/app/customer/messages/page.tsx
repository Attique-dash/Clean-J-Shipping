"use client";

import { useEffect, useState, useMemo } from "react";
import { MessageSquare, Search, ChevronLeft, ChevronRight, Mail, Clock, RefreshCw, Loader2, X } from "lucide-react";

type Msg = {
  _id: string;
  subject?: string;
  body: string;
  sender: "customer" | "support";
  broadcastId?: string;
  read?: boolean;
  createdAt?: string;
};

const PAGE_SIZE = 10;

function fmtDate(d?: string) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}
function fmtTime(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toLowerCase();
}
function relDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  const m = Math.floor(days / 30);
  return m < 2 ? "a month ago" : `${m} months ago`;
}

/* ═══ Message Detail Modal ═══ */
function MessageDetail({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{msg.subject || "Message"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{msg.createdAt ? `${fmtDate(msg.createdAt)} ${fmtTime(msg.createdAt)}` : "N/A"}</span>
            {msg.createdAt && <span className="text-gray-400">({relDate(msg.createdAt)})</span>}
            {msg.broadcastId && <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Broadcast</span>}
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {msg.body}
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function CustomerMessagesPage() {
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMsg, setSelectedMsg] = useState<Msg | null>(null);

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

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...items];
    if (q) {
      list = list.filter(m =>
        (m.subject || "").toLowerCase().includes(q) ||
        (m.body || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 admin-header p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><MessageSquare className="h-7 w-7" /></div>
              <div><div>
            <h1 className="text-3xl font-bold text-white">
              Messages
            </h1>
            <p className="text-gray-300-custom mt-1">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300-custom" />
              <input
                className="w-64 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm bg-white shadow-sm"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-blue-100 hover:bg-gray-50 shadow-sm text-sm font-medium">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div></div>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading messages...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No messages found</p>
            {searchQuery && <p className="text-gray-400 text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {paginated.map((msg, idx) => (
              <div
                key={msg._id}
                onClick={() => setSelectedMsg(msg)}
                className={`flex items-start gap-4 px-6 py-5 cursor-pointer hover:bg-blue-50/50 transition-colors ${idx > 0 ? "border-t border-gray-100" : ""}`}
              >
                <div className={`flex-shrink-0 p-3 rounded-xl ${msg.broadcastId ? "bg-gradient-to-br from-purple-100 to-purple-200" : msg.sender === "customer" ? "bg-gradient-to-br from-blue-100 to-cyan-100" : "bg-gradient-to-br from-orange-100 to-amber-100"}`}>
                  <Mail className={`h-5 w-5 ${msg.broadcastId ? "text-purple-600" : msg.sender === "customer" ? "text-blue-600" : "text-orange-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900 leading-snug">{msg.subject || "No Subject"}</h3>
                    {msg.broadcastId && (
                      <span className="shrink-0 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Broadcast</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{msg.createdAt ? `${fmtDate(msg.createdAt)} ${fmtTime(msg.createdAt)}` : "N/A"}</span>
                    {msg.createdAt && <span>({relDate(msg.createdAt)})</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} className={`h-9 w-9 rounded-lg text-sm font-medium border ${curPage === n ? "bg-[#0f4d8a] text-white border-[#0f4d8a]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {selectedMsg && <MessageDetail msg={selectedMsg} onClose={() => setSelectedMsg(null)} />}
    </div>
  );
}
