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
  Globe
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AddButton from '@/components/admin/AddButton';

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

  const [showLogs, setShowLogs] = useState(false);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 border-green-200';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status >= 500) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
    if (status >= 400) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status >= 400) return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Plug className="h-6 w-6 text-[#0f4d8a]" />
            KCD Webhook Testing
          </h1>
          <p className="text-gray-500 mt-1">
            Test the KCD Logistics webhook endpoint and view request logs
          </p>
        </div>
      </div>

      {/* API Key Configuration */}
      <Card>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Code className="h-5 w-5 text-[#0f4d8a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
              <p className="text-gray-500 text-sm">Configure your API key for testing</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-API-Key Header Value
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono"
                  placeholder="Enter your API key"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiKey)}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This key is used for both sending test requests and viewing logs
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Endpoint Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase">Method</span>
                <Badge className="bg-blue-100 text-blue-700 font-mono">POST</Badge>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase">URL</span>
                <code className="block text-sm font-mono text-gray-700">/api/kcd/packages/add</code>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase">Content-Type</span>
                <code className="block text-sm font-mono text-gray-700">application/json</code>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Test Payload Form */}
      <Card>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Test Payload</h2>
                <p className="text-gray-500 text-sm">Configure and send test webhook</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateNewTracking}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Tracking
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="e.g., TBA3295097"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Customer Mailbox <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerMailbox}
                onChange={(e) => setCustomerMailbox(e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="e.g., CLEAN-0007"
              />
              <p className="text-xs text-gray-500">Maps to userCode in database</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">House Number</label>
              <Input
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="e.g., CLEAN0000001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
              <Input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 2.5"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">Shipper</label>
              <Input
                value={shipper}
                onChange={(e) => setShipper(e.target.value)}
                placeholder="e.g., Amazon, eBay, etc."
              />
            </div>
          </div>

          <Button
            onClick={testWebhook}
            disabled={loading || !apiKey || !trackingNumber || !customerMailbox}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Webhook
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Test Result */}
      {result && (
        <Card className={`border-l-4 ${result.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                  <Badge className={getStatusBadge(result.status)}>
                    {result.status} {result.statusText}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {result.responseTime}ms
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-60">
                  <pre className="text-gray-700">{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Request Logs */}
      <Card>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Request Logs</h2>
                <p className="text-gray-500 text-sm">{logs.length} log{logs.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={logsLoading || !apiKey}
              >
                {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {showLogs && (
          <div className="p-6">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No logs available</p>
                <p className="text-sm text-gray-400">Send a test request to see logs</p>
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
                      <Badge className={getStatusBadge(log.responseStatus)}>
                        {log.method}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <Badge className={getStatusBadge(log.responseStatus)}>
                        {log.responseStatus}
                      </Badge>
                    </div>
                    
                    {log.error && (
                      <div className="text-sm text-red-600 mb-2">
                        Error: {log.error}
                      </div>
                    )}
                    
                    <details className="text-sm">
                      <summary className="cursor-pointer text-[#0f4d8a] hover:text-blue-700 font-medium">
                        View Request Details
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <span className="text-gray-500 font-medium text-xs uppercase">Headers</span>
                          <pre className="mt-1 bg-gray-100 rounded p-2 text-xs overflow-auto font-mono">
                            {JSON.stringify(log.headers, null, 2)}
                          </pre>
                        </div>
                        {log.body && (
                          <div>
                            <span className="text-gray-500 font-medium text-xs uppercase">Body</span>
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
        )}
      </Card>

      {/* Quick Reference */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Quick Reference</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="block text-sm font-medium text-blue-700 mb-1">Endpoint URL</span>
              <code className="block text-sm font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded">
                POST /api/kcd/packages/add
              </code>
            </div>
            <div>
              <span className="block text-sm font-medium text-blue-700 mb-1">Required Headers</span>
              <code className="block text-sm font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded">
                X-API-Key: {'<your-key>'}
              </code>
              <code className="block text-sm font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded mt-1">
                Content-Type: application/json
              </code>
            </div>
            <div>
              <span className="block text-sm font-medium text-blue-700 mb-1">Required Fields</span>
              <code className="block text-sm font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded">
                trackingNumber, customerMailbox
              </code>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
