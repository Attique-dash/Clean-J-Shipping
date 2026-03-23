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
  EyeOff
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
      const payload = {
        trackingNumber,
        houseNumber,
        customerMailbox,
        weight,
        shipper,
        receivedAt: timestamp
      };

      const response = await fetch('/api/kcd/packages/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const responseTime = Math.round(performance.now() - startTime);
      const data = await response.json().catch(() => null);

      setResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        responseTime,
        timestamp
      });

      // Refresh logs after successful test
      if (response.ok) {
        fetchLogs();
      }
    } catch (error) {
      setResult({
        success: false,
        status: 0,
        statusText: 'Network Error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        responseTime: Math.round(performance.now() - startTime),
        timestamp
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/kcd/packages/add', {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
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

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 border-green-200';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status >= 500) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status >= 400) return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Plug className="h-6 w-6" />
          KCD Webhook Testing
        </h1>
        <p className="text-gray-600 mt-1">
          Test the KCD Logistics webhook endpoint and view request logs
        </p>
      </div>

      {/* API Key Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X-API-Key Header Value
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Enter your API key"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(apiKey)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Copy API key"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This key is used for both sending test requests and viewing logs
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Endpoint Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Method:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">POST</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">URL:</span>
                <code className="font-mono text-gray-700">/api/kcd/packages/add</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Content-Type:</span>
                <code className="font-mono text-gray-700">application/json</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Payload Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Test Payload</h2>
          </div>
          <button
            onClick={generateNewTracking}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            New Tracking Number
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="e.g., TBA3295097"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Mailbox <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerMailbox}
              onChange={(e) => setCustomerMailbox(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="e.g., CLEAN-0007"
            />
            <p className="text-xs text-gray-500 mt-0.5">Maps to userCode in database</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              House Number
            </label>
            <input
              type="text"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CLEAN0000001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.5"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipper
            </label>
            <input
              type="text"
              value={shipper}
              onChange={(e) => setShipper(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Amazon, eBay, etc."
            />
          </div>
        </div>

        <button
          onClick={testWebhook}
          disabled={loading || !apiKey || !trackingNumber || !customerMailbox}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Sending Request...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Test Webhook
            </>
          )}
        </button>
      </div>

      {/* Test Result */}
      {result && (
        <div className={`rounded-lg shadow-sm border p-6 mb-6 ${getStatusColor(result.status)}`}>
          <div className="flex items-start gap-3">
            {getStatusIcon(result.status)}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-semibold">
                  {result.success ? 'Success' : 'Failed'}
                </span>
                <span className="px-2 py-0.5 text-sm rounded bg-white/50 font-mono">
                  {result.status} {result.statusText}
                </span>
                <span className="flex items-center gap-1 text-sm opacity-75">
                  <Clock className="h-3 w-3" />
                  {result.responseTime}ms
                </span>
              </div>
              
              <div className="bg-white/50 rounded-lg p-3 font-mono text-sm overflow-auto max-h-60">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Request Logs</h2>
          </div>
          <button
            onClick={fetchLogs}
            disabled={logsLoading || !apiKey}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {logsLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Logs
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No logs available</p>
            <p className="text-sm">Send a test request or click Refresh Logs</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${
                  log.responseStatus >= 200 && log.responseStatus < 300 
                    ? 'border-green-200 bg-green-50/30' 
                    : log.responseStatus >= 400 
                      ? 'border-red-200 bg-red-50/30' 
                      : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                    log.responseStatus >= 200 && log.responseStatus < 300 
                      ? 'bg-green-100 text-green-700' 
                      : log.responseStatus >= 400 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {log.method}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    log.responseStatus >= 200 && log.responseStatus < 300 
                      ? 'bg-green-100 text-green-700' 
                      : log.responseStatus >= 400 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {log.responseStatus}
                  </span>
                </div>
                
                {log.error && (
                  <div className="text-sm text-red-600 mb-2">
                    Error: {log.error}
                  </div>
                )}
                
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                    View Request Details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-gray-500 font-medium">Headers:</span>
                      <pre className="mt-1 bg-gray-100 rounded p-2 text-xs overflow-auto font-mono">
                        {JSON.stringify(log.headers, null, 2)}
                      </pre>
                    </div>
                    {log.body && (
                      <div>
                        <span className="text-gray-500 font-medium">Body:</span>
                        <pre className="mt-1 bg-gray-100 rounded p-2 text-xs overflow-auto font-mono">
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

      {/* Quick Reference */}
      <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Quick Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="block text-blue-700 font-medium mb-1">Endpoint URL</span>
            <code className="text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs">
              POST /api/kcd/packages/add
            </code>
          </div>
          <div>
            <span className="block text-blue-700 font-medium mb-1">Required Headers</span>
            <code className="text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs block">
              X-API-Key: {'<your-key>'}
            </code>
            <code className="text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs block mt-1">
              Content-Type: application/json
            </code>
          </div>
          <div>
            <span className="block text-blue-700 font-medium mb-1">Required Fields</span>
            <code className="text-blue-900 bg-blue-100 px-2 py-1 rounded text-xs block">
              trackingNumber, customerMailbox
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
