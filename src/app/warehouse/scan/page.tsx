"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Scan, Package, CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle, QrCode } from "lucide-react";
import { toast } from "react-toastify";

type ScanResult = {
  trackingNumber: string;
  package?: {
    _id: string;
    trackingNumber: string;
    status: string;
    description?: string;
    weight?: number;
    sender?: string;
    recipient?: string;
  };
  error?: string;
};

export default function WarehouseScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleScan = async (trackingNumber: string) => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter or scan a tracking number");
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch(`/api/warehouse/scan?trackingNumber=${encodeURIComponent(trackingNumber.trim())}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to scan package");
      }

      const result: ScanResult = {
        trackingNumber: trackingNumber.trim(),
        package: data.package,
        error: data.error,
      };

      setScanResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 scans
      
      if (data.package) {
        toast.success(`Package ${data.package.trackingNumber} found!`);
      } else {
        toast.warning("Package not found in system");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to scan package";
      toast.error(errorMessage);
      setScanResult({
        trackingNumber: trackingNumber.trim(),
        error: errorMessage,
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(manualInput);
    setManualInput("");
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualInput(value);
    // Auto-submit on Enter or when barcode scanner sends data (usually ends with Enter)
    if (value.length > 5 && value.includes("\n")) {
      handleScan(value.replace("\n", "").trim());
      setManualInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Scan className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Package Scanner</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Barcode Scanner</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Scanning Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camera/Input Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scanner
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Camera View */}
                {cameraActive ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-white/50 rounded-lg w-64 h-32" />
                    </div>
                    <button
                      onClick={stopCamera}
                      className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Camera not active</p>
                      <button
                        onClick={startCamera}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        <Camera className="w-5 h-5" />
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Input */}
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manual Entry / Barcode Scanner
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualInput}
                        onChange={handleBarcodeInput}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleScan(manualInput);
                            setManualInput("");
                          }
                        }}
                        placeholder="Enter tracking number or scan barcode..."
                        className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={scanning || !manualInput.trim()}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E67919] to-[#f59e42] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {scanning ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Scan className="w-5 h-5" />
                        )}
                        Scan
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Type tracking number or use a barcode scanner (auto-submits on Enter)
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className={`px-6 py-4 ${scanResult.package ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {scanResult.package ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    Scan Result
                  </h2>
                </div>
                <div className="p-6">
                  {scanResult.package ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Tracking Number</p>
                          <p className="text-lg font-bold text-gray-900">{scanResult.package.trackingNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            scanResult.package.status === "Delivered" ? "bg-green-100 text-green-700" :
                            scanResult.package.status === "In Transit" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {scanResult.package.status}
                          </span>
                        </div>
                      </div>
                      {scanResult.package.description && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="text-gray-900">{scanResult.package.description}</p>
                        </div>
                      )}
                      {scanResult.package.weight && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Weight</p>
                          <p className="text-gray-900">{scanResult.package.weight} kg</p>
                        </div>
                      )}
                      {scanResult.package.sender && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Sender</p>
                          <p className="text-gray-900">{scanResult.package.sender}</p>
                        </div>
                      )}
                      {scanResult.package.recipient && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Recipient</p>
                          <p className="text-gray-900">{scanResult.package.recipient}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-gray-900 mb-2">Package Not Found</p>
                      <p className="text-sm text-gray-600">
                        Tracking number: <span className="font-mono">{scanResult.trackingNumber}</span>
                      </p>
                      {scanResult.error && (
                        <p className="text-sm text-red-600 mt-2">{scanResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scan History Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Recent Scans
                </h2>
              </div>
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No scans yet</p>
                  </div>
                ) : (
                  scanHistory.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        result.package
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {result.trackingNumber}
                        </p>
                        {result.package ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      {result.package && (
                        <p className="text-xs text-gray-600">{result.package.status}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

