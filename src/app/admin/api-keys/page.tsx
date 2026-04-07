// src/app/admin/api-keys/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Shield,
  Clock,
  Code,
  Loader2,
  Search,
  Eye,
  EyeOff,
  Filter,
  ChevronRight,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';

interface ApiKey {
  _id: string;
  key?: string;
  keyPrefix?: string;
  name: string;
  description?: string;
  active?: boolean;
  isActive?: boolean;
  usageCount: number;
  lastUsedAt?: string;
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
  courierCode?: string;
  type?: string;
  // Computed fields from API
  isExpired?: boolean;
  daysUntilExpiry?: number | null;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; key: ApiKey | null }>({ open: false, key: null });
  const [viewKey, setViewKey] = useState<ApiKey | null>(null);

  // Form states
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [revealedFullKeys, setRevealedFullKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys/v2');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApiKeys();
  };

  const createApiKey = async () => {
    try {
      const response = await fetch('/api/admin/api-keys/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, description: newKeyDescription }),
      });
      if (!response.ok) throw new Error('Failed to create API key');
      const data = await response.json();
      if (data.data?.key) setGeneratedKey(data.data.key);
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/v2/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to revoke API key');
      await fetchApiKeys();
      setDeleteConfirm({ open: false, key: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const refreshApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/v2/${id}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh API key');
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh API key');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${'•'.repeat(12)}${key.substring(key.length - 4)}`;
  };

  const filteredKeys = apiKeys.filter((key) => {
    const matchesSearch =
      !searchQuery ||
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.courierCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && key.isActive) ||
      (statusFilter === 'inactive' && !key.isActive);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Key className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">API Keys</h1>
                  <p className="text-blue-100 mt-1">
                    Total keys: <span className="font-semibold">{apiKeys.length}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg disabled:opacity-50 text-sm sm:text-base"
                >
                  <RefreshCw className={`h-4 w-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => { setShowCreateModal(true); setGeneratedKey(null); }}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-4 py-3 sm:px-6 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Create API Key</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Error Alert ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Search & Filter ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Keys
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full h-12 pl-10 pr-4 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Search by name, description or courier code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full h-12 pl-10 pr-8 text-sm border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {(searchQuery || statusFilter) && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {searchQuery && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm">
                    <Search className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">"{searchQuery}"</span>
                    <button onClick={() => setSearchQuery('')} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </div>
                )}
                {statusFilter && (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-1.5 text-sm">
                    <Filter className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Status: {statusFilter}</span>
                    <button onClick={() => setStatusFilter('')} className="ml-1 text-orange-600 hover:text-orange-800">×</button>
                  </div>
                )}
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── API Keys List ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Code className="w-5 h-5" />
                General API Keys
              </h2>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">
                  {filteredKeys.length} key{filteredKeys.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {filteredKeys.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Found</h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery || statusFilter ? 'Try adjusting your search or filters' : 'Create your first API key to get started'}
              </p>
              <button
                onClick={() => { setShowCreateModal(true); setGeneratedKey(null); }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                Create API Key
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Key Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">API Key</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Expiration</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredKeys.map((key) => (
                    <tr key={key._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#1a6db5] flex items-center justify-center">
                            <Key className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{key.name}</div>
                            {key.description && (
                              <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{key.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {revealedKeys.has(key._id) ? key.keyPrefix || key.key || '' : maskKey(key.key || key.keyPrefix || '')}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${(key.active || key.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {(key.active || key.isActive) ? 'Active' : 'Inactive'}
                          </span>
                          {key.isExpired && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-700">
                            {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                          </span>
                          {key.daysUntilExpiry !== null && key.daysUntilExpiry !== undefined && (
                            <span className={`text-xs ${key.daysUntilExpiry <= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {key.daysUntilExpiry > 0 ? `${key.daysUntilExpiry} days left` : 'Expired'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{key.usageCount || 0} uses</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => toggleReveal(key._id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-all shadow-sm"
                            title={revealedKeys.has(key._id) ? 'Hide key' : 'Reveal key'}
                          >
                            {revealedKeys.has(key._id) ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                            {revealedKeys.has(key._id) ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => copyToClipboard(key.key || '', key._id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-white rounded-md hover:bg-blue-50 transition-all shadow-sm"
                            title="Copy key"
                          >
                            {copiedKey === key._id ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copy
                          </button>
                          <button
                            onClick={() => refreshApiKey(key._id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-white rounded-md hover:bg-green-50 transition-all shadow-sm"
                            title="Refresh expiration (30 days)"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, key })}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-white rounded-md hover:bg-red-50 transition-all shadow-sm"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create API Key Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5" />
                Create New API Key
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setGeneratedKey(null); setNewKeyName(''); setNewKeyDescription(''); }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {generatedKey ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900">Key Generated Successfully</h4>
                      <p className="text-green-700 text-sm mt-1">Copy this key now — it will not be shown again.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Your API Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 px-4 py-3 rounded-xl font-mono text-sm break-all">{generatedKey}</code>
                      <button
                        onClick={() => copyToClipboard(generatedKey, 'new')}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        {copiedKey === 'new' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setShowCreateModal(false); setGeneratedKey(null); setNewKeyName(''); setNewKeyDescription(''); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Key Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="e.g., Mobile App Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
                    <textarea
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                      placeholder="Describe the purpose of this API key"
                      rows={3}
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => { setShowCreateModal(false); setNewKeyName(''); setNewKeyDescription(''); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createApiKey}
                      disabled={!newKeyName.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                      Create Key
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, key: null })}
        onConfirm={() => deleteConfirm.key && revokeApiKey(deleteConfirm.key._id)}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${deleteConfirm.key?.name}"? This action cannot be undone.`}
        itemName={deleteConfirm.key?.name}
      />
    </div>
  );
}