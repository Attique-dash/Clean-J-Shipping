"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Loader2 } from "lucide-react";

type UploadResult = {
  trackingNumber?: string;
  ok: boolean;
  error?: string;
};

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [uploadFormat, setUploadFormat] = useState<"json" | "csv">("json");
  const [preview, setPreview] = useState<any[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, success: 0, failed: 0 });

  function downloadTemplate(format: "json" | "csv") {
    const template = [
      {
        trackingNumber: "TAS12345",
        userCode: "CUST001",
        weight: 5.5,
        shipper: "DHL",
        description: "Electronics",
        length: 30,
        width: 20,
        height: 15,
        warehouse: "Main Warehouse",
        receivedBy: "John Doe"
      },
      {
        trackingNumber: "TAS12346",
        userCode: "CUST002",
        weight: 3.2,
        shipper: "FedEx",
        description: "Documents",
        length: 25,
        width: 15,
        height: 10
      }
    ];
    
    if (format === "csv") {
      // CSV template
      const headers = ["trackingNumber", "userCode", "weight", "shipper", "description", "length", "width", "height", "warehouse", "receivedBy"];
      const csv = [
        headers.join(","),
        ...template.map(row => headers.map(h => row[h as keyof typeof row] || "").join(","))
      ].join("\n");
      
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk-upload-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // JSON template
      const json = JSON.stringify({ packages: template }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk-upload-template.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function parseCSV(text: string): any[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");
    
    const headers = lines[0].split(",").map(h => h.trim());
    const packages = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const pkg: any = {};
      headers.forEach((header, idx) => {
        pkg[header] = values[idx] || "";
      });
      packages.push(pkg);
    }
    
    return packages;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (selectedFile.name.endsWith('.csv')) {
          setUploadFormat("csv");
          setCsvText(text);
          try {
            const parsed = parseCSV(text);
            setPreview(parsed.slice(0, 5)); // Preview first 5 rows
          } catch (err) {
            setPreview([]);
          }
        } else {
          setUploadFormat("json");
          setJsonText(text);
          try {
            const data = JSON.parse(text);
            setPreview(data.packages?.slice(0, 5) || []);
          } catch (err) {
            setPreview([]);
          }
        }
      };
      reader.readAsText(selectedFile);
    }
  }

  async function handleUpload() {
    if (uploadFormat === "json" && !jsonText.trim()) {
      alert("Please select a file or paste JSON data");
      return;
    }
    if (uploadFormat === "csv" && !csvText.trim()) {
      alert("Please select a CSV file or paste CSV data");
      return;
    }

    setLoading(true);
    setResults([]);
    setSummary({ total: 0, success: 0, failed: 0 });

    try {
      let packages: any[] = [];
      
      if (uploadFormat === "csv") {
        packages = parseCSV(csvText);
      } else {
        const data = JSON.parse(jsonText);
        if (!data.packages || !Array.isArray(data.packages)) {
          throw new Error("JSON must have a 'packages' array");
        }
        packages = data.packages;
      }

      if (packages.length === 0) {
        throw new Error("No packages found in file");
      }

      // Validate required fields
      const invalid = packages.find((pkg: any) => !pkg.trackingNumber || !pkg.userCode);
      if (invalid) {
        throw new Error("All packages must have 'trackingNumber' and 'userCode' fields");
      }
      
      const response = await fetch("/api/warehouse/packages/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages })
      });

      const result = await response.json();
      
      if (response.ok) {
        setResults(result.results || []);
        setSummary({
          total: result.total || 0,
          success: result.success || 0,
          failed: result.failed || 0
        });
      } else {
        alert(result.error || "Upload failed");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invalid JSON format");
    } finally {
      setLoading(false);
    }
  }

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
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-100">Package Management</p>
                  <h1 className="text-3xl font-bold leading-tight md:text-4xl">Bulk Upload</h1>
                  <p className="text-blue-100 mt-1">Upload multiple packages at once using CSV or JSON format</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Upload Instructions
            </h2>
          </div>
          <div className="p-6">
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Upload a CSV or JSON file with package data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Required fields: trackingNumber, userCode</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Optional fields: weight, shipper, description, length, width, height, warehouse, receivedBy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Download the template below to see the correct format</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>CSV files will be validated and previewed before upload</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload File
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Format Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Format
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUploadFormat("csv");
                    setJsonText("");
                    setCsvText("");
                    setPreview([]);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    uploadFormat === "csv"
                      ? "bg-[#0f4d8a] text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadFormat("json");
                    setJsonText("");
                    setCsvText("");
                    setPreview([]);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    uploadFormat === "json"
                      ? "bg-[#0f4d8a] text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select {uploadFormat.toUpperCase()} File
              </label>
              <div className="flex gap-3">
                <input
                  type="file"
                  accept={uploadFormat === "csv" ? ".csv" : ".json"}
                  onChange={handleFileChange}
                  className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => downloadTemplate(uploadFormat)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Template
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Paste {uploadFormat.toUpperCase()} Data
              </label>
              {uploadFormat === "csv" ? (
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                  rows={12}
                  placeholder="trackingNumber,userCode,weight,shipper,description,length,width,height&#10;TAS12345,CUST001,5.5,DHL,Electronics,30,20,15"
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    try {
                      if (e.target.value.trim()) {
                        const parsed = parseCSV(e.target.value);
                        setPreview(parsed.slice(0, 5));
                      } else {
                        setPreview([]);
                      }
                    } catch {
                      setPreview([]);
                    }
                  }}
                />
              ) : (
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                  rows={12}
                  placeholder='{"packages": [{"trackingNumber": "TAS12345", "userCode": "CUST001", ...}]}'
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    try {
                      if (e.target.value.trim()) {
                        const data = JSON.parse(e.target.value);
                        setPreview(data.packages?.slice(0, 5) || []);
                      } else {
                        setPreview([]);
                      }
                    } catch {
                      setPreview([]);
                    }
                  }}
                />
              )}
            </div>

            {/* Preview Section */}
            {preview.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Preview ({preview.length} rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        {Object.keys(preview[0] || {}).map((key) => (
                          <th key={key} className="px-2 py-1 text-left font-semibold text-blue-900">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t border-blue-200">
                          {Object.values(row).map((val: any, i) => (
                            <td key={i} className="px-2 py-1 text-blue-800">{String(val || "-")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || (uploadFormat === "json" ? !jsonText.trim() : !csvText.trim())}
              className="w-full flex items-center justify-center gap-2 bg-[#E67919] hover:bg-[#d66e15] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Packages
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Summary */}
        {results.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Total Processed</p>
                <p className="text-3xl font-bold text-[#0f4d8a]">{summary.total}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Successful</p>
                <p className="text-3xl font-bold text-green-600">{summary.success}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Failed</p>
                <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#E67919] to-[#d66e15] px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Upload Results</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tracking Number</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {result.ok ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-medium">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="w-5 h-5" />
                              <span className="font-medium">Failed</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <code className="font-mono text-sm">
                            {result.trackingNumber || "-"}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {result.error || "Package created successfully"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}