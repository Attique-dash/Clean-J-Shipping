// src/app/admin/kcd-test/page.tsx
'use client';

import { useState } from 'react';
import {
  Plug,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  RefreshCw,
  Code,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface TestResult {
  success: boolean;
  status: number;
  statusText: string;
  data: any;
  responseTime: number;
  timestamp: string;
}

interface RequestLog {
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  responseStatus: number;
  error?: string;
}

export default function KcdTestPage() {
  const [apiKey, setApiKey] = useState('XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Test payload state
  const [trackingNumber, setTrackingNumber] = useState('TEST' + Date.now().toString().slice(-6));
  const [customerMailbox, setCustomerMailbox] = useState('CLEAN-0007');
  const [weight, setWeight] = useState('2.5');
  const [shipper, setShipper] = useState('Amazon');
  const [houseNumber, setHouseNumber] = useState('CLEAN0000001');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateNewTracking = () => {
    setTrackingNumber('TEST' + Date.now().toString().slice(-6));
  };

  const testWebhook = async () => {
    setLoading(true);
    setResult(null);
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    try {
      const payload = { trackingNumber, houseNumber, customerMailbox, weight, shipper, receivedAt: timestamp };
      const response = await fetch('/api/kcd/packages/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(payload),
      });
      const responseTime = Math.round(performance.now() - startTime);
      const data = await response.json().catch(() => null);
      setResult({ success: response.ok, status: response.status, statusText: response.statusText, data, responseTime, timestamp });
      if (response.ok) fetchLogs();
    } catch (error) {
      setResult({
        success: false, status: 0, statusText: 'Network Error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        responseTime: Math.round(performance.now() - startTime), timestamp,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/kcd/packages/add', { headers: { 'X-API-Key': apiKey } });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 400) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status >= 400) return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Plug className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">KCD Webhook Testing</h1>
                <p className="text-blue-100 mt-1">Test the KCD Logistics webhook endpoint and view request logs</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={generateNewTracking}
                className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg text-sm sm:text-base"
              >
                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform" />
                <span className="hidden sm:inline">New Tracking</span>
              </button>
              <button
                onClick={testWebhook}
                disabled={loading || !apiKey || !trackingNumber || !customerMailbox}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E67919] to-[#d46a0f] px-4 py-3 sm:px-6 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm sm:text-base"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                <span>{loading ? 'Sending...' : 'Send Test Webhook'}</span>
                {!loading && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* ── API Configuration ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5" />
              API Configuration
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                X-API-Key Header Value
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm font-mono focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                    placeholder="Enter your API key"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-600"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Used for both sending test requests and viewing logs
              </p>
            </div>

            {/* Endpoint Info */}
            <div className="rounded-xl bg-gradient-to-r from-[#0f4d8a]/5 to-[#E67919]/5 border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Endpoint Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Method</span>
                  <div>
                    <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 font-mono">
                      POST
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">URL</span>
                  <code className="block text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200">
                    /api/kcd/packages/add
                  </code>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Content-Type</span>
                  <code className="block text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200">
                    application/json
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Test Payload Form ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Send className="w-5 h-5" />
                Test Payload
              </h2>
              <button
                onClick={generateNewTracking}
                className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/30 hover:bg-white/30 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New Tracking
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., TBA3295097"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Customer Mailbox <span className="text-red-500">*</span>
                </label>
                <input
                  value={customerMailbox}
                  onChange={(e) => setCustomerMailbox(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., CLEAN-0007"
                />
                <p className="text-xs text-gray-500 mt-1">Maps to userCode in database</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">House Number</label>
                <input
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., CLEAN0000001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., 2.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Shipper</label>
                <input
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                  placeholder="e.g., Amazon, eBay, etc."
                />
              </div>
            </div>

            <button
              onClick={testWebhook}
              disabled={loading || !apiKey || !trackingNumber || !customerMailbox}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-6 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending Request...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Test Webhook</>
              )}
            </button>
          </div>
        </div>

        {/* ── Test Result ── */}
        {result && (
          <div className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden ${result.success ? 'border-green-400' : 'border-red-400'}`}>
            <div className={`px-6 py-4 ${result.success ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  {result.success
                    ? <CheckCircle className="h-5 w-5 text-white" />
                    : <XCircle className="h-5 w-5 text-white" />}
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {result.success ? 'Request Successful' : 'Request Failed'}
                </h2>
                <div className="ml-auto flex items-center gap-3">
                  <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-white/20 text-white font-mono">
                    {result.status} {result.statusText}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-white/80">
                    <Clock className="h-4 w-4" />
                    {result.responseTime}ms
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Response Body</label>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 font-mono text-sm overflow-auto max-h-60">
                <pre className="text-gray-700">{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ── Request Logs ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Request Logs
              </h2>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">{logs.length} log{logs.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/30 hover:bg-white/30 transition-all"
                >
                  {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showLogs ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading || !apiKey}
                  className="p-2 rounded-lg bg-white/20 backdrop-blur ring-1 ring-white/30 hover:bg-white/30 transition-all text-white disabled:opacity-50"
                >
                  {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {showLogs && (
            <div className="p-6">
              {logs.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Logs Available</h3>
                  <p className="text-sm text-gray-500">Send a test request to see logs here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`rounded-xl border p-4 ${
                        log.responseStatus >= 200 && log.responseStatus < 300
                          ? 'border-green-200 bg-green-50/40'
                          : log.responseStatus >= 400
                          ? 'border-red-200 bg-red-50/40'
                          : 'border-gray-200 bg-gray-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono ${getStatusBadgeClass(log.responseStatus)}`}>
                          {log.method}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${getStatusBadgeClass(log.responseStatus)}`}>
                          {log.responseStatus}
                        </span>
                        {log.error && (
                          <span className="text-xs text-red-600 font-medium">Error: {log.error}</span>
                        )}
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-[#0f4d8a] hover:text-blue-700 font-medium text-xs">
                          View Request Details
                        </summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Headers</span>
                            <pre className="mt-1 bg-white rounded-lg border border-gray-200 p-3 text-xs overflow-auto font-mono">
                              {JSON.stringify(log.headers, null, 2)}
                            </pre>
                          </div>
                          {log.body && (
                            <div>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Body</span>
                              <pre className="mt-1 bg-white rounded-lg border border-gray-200 p-3 text-xs overflow-auto font-mono">
                                {JSON.stringify(log.body, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Quick Reference ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Quick Reference
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
                <span className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Endpoint URL</span>
                <code className="block text-sm font-mono bg-white text-blue-900 px-3 py-2 rounded-lg border border-blue-100">
                  POST /api/kcd/packages/add
                </code>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
                <span className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Required Headers</span>
                <code className="block text-sm font-mono bg-white text-blue-900 px-3 py-2 rounded-lg border border-blue-100 mb-2">
                  X-API-Key: {'<your-key>'}
                </code>
                <code className="block text-sm font-mono bg-white text-blue-900 px-3 py-2 rounded-lg border border-blue-100">
                  Content-Type: application/json
                </code>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
                <span className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Required Fields</span>
                <code className="block text-sm font-mono bg-white text-blue-900 px-3 py-2 rounded-lg border border-blue-100">
                  trackingNumber, customerMailbox
                </code>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}