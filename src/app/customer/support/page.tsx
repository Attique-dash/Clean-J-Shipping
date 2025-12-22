"use client";

import { useState, useEffect } from "react";
import { Headphones, Plus, MessageSquare, Clock, CheckCircle, AlertCircle, XCircle, Send, Loader2, Search, Filter } from "lucide-react";

interface SupportTicket {
  _id: string;
  subject: string;
  message: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function CustomerSupportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    subject: "",
    message: "",
    category: "inquiry",
    priority: "normal",
  });

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/customer/support?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load tickets");

      setTickets(data.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/customer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create ticket");

      setShowForm(false);
      setForm({ subject: "", message: "", category: "inquiry", priority: "normal" });
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create ticket");
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.message.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl shadow-lg">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0f4d8a]">Support Center</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your support tickets and get help
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="text-sm text-gray-600">Total Tickets</div>
            <div className="text-2xl font-bold text-[#0f4d8a] mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="text-sm text-gray-600">Open</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.open}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="text-sm text-gray-600">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
            <span className="ml-3 text-gray-600">Loading tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500 mb-6">Create your first support ticket to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              Create Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ticket.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      <span className="capitalize">{ticket.category}</span>
                    </div>
                  </div>
                  <MessageSquare className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Ticket Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Support Ticket</h2>
                <button onClick={() => setShowForm(false)} className="text-white hover:text-gray-200">
                  ×
                </button>
              </div>
              <form onSubmit={submitTicket} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="inquiry">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing</option>
                      <option value="shipment">Shipment Issue</option>
                      <option value="complaint">Complaint</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100"
                    required
                  />
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
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedTicket(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                <button onClick={() => setSelectedTicket(null)} className="text-white hover:text-gray-200">
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.open}`}>
                    {selectedTicket.status.replace("_", " ")}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedTicket.priority] || PRIORITY_COLORS.normal}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className="text-sm text-gray-500 capitalize">{selectedTicket.category}</span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="mt-2 text-gray-900 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  <p>Last updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

