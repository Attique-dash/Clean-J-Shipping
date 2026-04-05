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
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AddButton from '@/components/admin/AddButton';
import SharedModal from '@/components/admin/SharedModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';

interface ApiKey {
  _id: string;
  key: string;
  name: string;
  description?: string;
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
  courierCode?: string;
}

interface KcdKeyInfo {
  apiKey: string;
  courierCode: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  usageCount: number;
  lastUsed?: string;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [kcdKeyInfo, setKcdKeyInfo] = useState<KcdKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKcdModal, setShowKcdModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; key: ApiKey | null }>({ open: false, key: null });
  
  // Form states
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [courierCode, setCourierCode] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
    fetchKcdKey();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    }
  };

  const fetchKcdKey = async () => {
    try {
      const response = await fetch('/api/admin/kcd-key');
      if (response.ok) {
        const data = await response.json();
        setKcdKeyInfo(data.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch KCD key:', err);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newKeyName, 
          description: newKeyDescription 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create API key');
      
      await fetchApiKeys();
      setShowCreateModal(false);
      setNewKeyName('');
      setNewKeyDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const generateKcdKey = async () => {
    try {
      const response = await fetch('/api/admin/kcd-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierCode }),
      });
      
      if (!response.ok) throw new Error('Failed to generate KCD key');
      
      const data = await response.json();
      if (data.data?.apiKey) {
        setGeneratedKey(data.data.apiKey);
      }
      
      await fetchKcdKey();
      setCourierCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate KCD key');
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to revoke API key');
      
      await fetchApiKeys();
      setDeleteConfirm({ open: false, key: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  const filteredKeys = apiKeys.filter(key => 
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.courierCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="h-6 w-6 text-[#0f4d8a]" />
            API Keys Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage API keys for third-party integrations and KCD Logistics
          </p>
        </div>
        <AddButton onClick={() => setShowCreateModal(true)} label="Create API Key" />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KCD API Key Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1a6db5] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">KCD Logistics Integration</h2>
                <p className="text-blue-100 text-sm">Primary API key for KCD Logistics webhook integration</p>
              </div>
            </div>
            <Button
              onClick={() => setShowKcdModal(true)}
              className="bg-white text-[#0f4d8a] hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {kcdKeyInfo ? 'Regenerate Key' : 'Generate Key'}
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          {kcdKeyInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm">
                    {maskKey(kcdKeyInfo.apiKey)}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(kcdKeyInfo.apiKey, 'kcd')}
                  >
                    {copiedKey === 'kcd' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div>
                  <Badge className={kcdKeyInfo.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {kcdKeyInfo.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Courier Code</label>
                <p className="text-gray-900 font-medium">{kcdKeyInfo.courierCode}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Usage</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{kcdKeyInfo.usageCount || 0} uses</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No KCD API Key</h3>
              <p className="text-gray-500 mb-4">Generate a key to enable KCD Logistics integration</p>
              <Button onClick={() => setShowKcdModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* General API Keys Section */}
      <Card>
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Code className="h-5 w-5 text-[#0f4d8a]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">General API Keys</h2>
                <p className="text-gray-500 text-sm">{filteredKeys.length} key{filteredKeys.length !== 1 ? 's' : ''} total</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search keys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No API Keys</h3>
              <p className="text-gray-500">
                {searchQuery ? 'No keys match your search' : 'Create your first API key to get started'}
              </p>
            </div>
          ) : (
            filteredKeys.map((key) => (
              <div key={key._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <Badge className={key.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {key.description && (
                      <p className="text-gray-500 text-sm mb-3">{key.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Code className="h-4 w-4" />
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {maskKey(key.key)}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{key.usageCount || 0} uses</span>
                      </div>
                      <div>
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(key.key, key._id)}
                      title="Copy key"
                    >
                      {copiedKey === key._id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteConfirm({ open: true, key })}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Revoke key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create API Key Modal */}
      <SharedModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewKeyName('');
          setNewKeyDescription('');
        }}
        title="Create New API Key"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Key Generated Successfully</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Copy this key now. It will not be shown again.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm break-all">
                  {generatedKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(generatedKey!, 'new')}
                  variant="outline"
                  size="icon"
                >
                  {copiedKey === 'new' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => {
                setShowCreateModal(false);
                setNewKeyName('');
                setNewKeyDescription('');
              }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Mobile App Integration"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="Describe the purpose of this API key"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-[#0f4d8a]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createApiKey}
                disabled={!newKeyName.trim()}
              >
                Create Key
              </Button>
            </div>
          </div>
        )}
      </SharedModal>

      {/* Generate KCD Key Modal */}
      <SharedModal
        open={showKcdModal}
        onClose={() => {
          setShowKcdModal(false);
          setGeneratedKey(null);
          setCourierCode('');
        }}
        title="Regenerate KCD API Key"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">KCD Key Generated</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Copy this key and configure it in the KCD portal.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">KCD API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm break-all">
                  {generatedKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(generatedKey!, 'kcd-new')}
                  variant="outline"
                  size="icon"
                >
                  {copiedKey === 'kcd-new' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-900 mb-2">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Copy the API key above</li>
                <li>Go to KCD portal → Admin → Couriers</li>
                <li>Paste the key in the API Access Token field</li>
                <li>Save and test the connection</li>
              </ol>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => {
                setShowKcdModal(false);
                setGeneratedKey(null);
                setCourierCode('');
              }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={courierCode}
                onChange={(e) => setCourierCode(e.target.value.toUpperCase())}
                placeholder="e.g., CLEAN"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for this courier integration (e.g., CLEAN)
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Generating a new key will invalidate any existing KCD integration. 
                  Make sure to update the key in the KCD portal immediately.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowKcdModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generateKcdKey}
                disabled={!courierCode.trim()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </div>
        )}
      </SharedModal>

      {/* Delete Confirmation */}
      <DeleteConfirmationModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, key: null })}
        onConfirm={() => deleteConfirm.key && revokeApiKey(deleteConfirm.key._id)}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${deleteConfirm.key?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
