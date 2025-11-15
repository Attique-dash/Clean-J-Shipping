"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, Search, RefreshCw, AlertCircle, ChevronRight, File, Folder, Copy, Check, ZoomIn, ZoomOut } from "lucide-react";

type DocMeta = { path: string; name: string };

export default function DocumentationPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/docs", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load docs");
      const items: DocMeta[] = Array.isArray(data?.docs) ? data.docs : [];
      setDocs(items);
      if (items.length && !selected) {
        setSelected(items[0].path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadDoc(p: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/docs?path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load document");
      setContent(String(data?.content || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setContent("");
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (selected) loadDoc(selected);
  }, [selected]);

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupDocsByFolder = (documents: DocMeta[]) => {
    const grouped: { [key: string]: DocMeta[] } = {};
    documents.forEach(doc => {
      const parts = doc.path.split('/');
      const folder = parts.length > 1 ? parts[0] : 'Root';
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(doc);
    });
    return grouped;
  };

  const groupedDocs = groupDocsByFolder(filteredDocs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-[#E67919] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0f4d8a] to-[#E67919] bg-clip-text text-transparent">
                Documentation
              </h1>
              <p className="text-slate-600 text-sm mt-1">Browse and search system documentation</p>
            </div>
          </div>
          <button 
            onClick={loadList}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Documents</p>
                <p className="text-3xl font-bold text-[#0f4d8a] mt-1">{docs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0f4d8a] to-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Categories</p>
                <p className="text-3xl font-bold text-[#E67919] mt-1">{Object.keys(groupedDocs).length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#E67919] to-orange-600 flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Search Results</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{filteredDocs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error Loading Documentation</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Documents
                </h2>
              </div>
              
              {/* Search Box */}
              <div className="p-4 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Document List */}
              <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <RefreshCw className="w-8 h-8 text-[#0f4d8a] animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Loading documents...</p>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No documents found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(groupedDocs).map(([folder, folderDocs]) => (
                      <div key={folder} className="mb-3">
                        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <Folder className="w-4 h-4 text-[#E67919]" />
                          {folder}
                        </div>
                        <ul className="space-y-1">
                          {folderDocs.map((doc) => (
                            <li key={doc.path}>
                              <button
                                onClick={() => setSelected(doc.path)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 group ${
                                  selected === doc.path
                                    ? 'bg-gradient-to-r from-[#0f4d8a] to-[#E67919] text-white shadow-md'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                                title={doc.path}
                              >
                                <File className={`w-4 h-4 flex-shrink-0 ${selected === doc.path ? 'text-white' : 'text-slate-400 group-hover:text-[#0f4d8a]'}`} />
                                <span className="text-sm truncate flex-1">{doc.name}</span>
                                {selected === doc.path && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {selected ? docs.find(d => d.path === selected)?.name || 'Document' : 'Select a Document'}
                  </h3>
                  {selected && (
                    <p className="text-sm text-white/80 truncate mt-0.5">{selected}</p>
                  )}
                </div>
                {selected && content && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Decrease font size"
                    >
                      <ZoomOut className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Increase font size"
                    >
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span className="text-sm text-white">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-white" />
                          <span className="text-sm text-white">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!selected ? (
                  <div className="text-center py-20">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-600">Select a document to view</p>
                    <p className="text-sm text-slate-400 mt-2">Choose from the list on the left to get started</p>
                  </div>
                ) : !content ? (
                  <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-600">Document is empty</p>
                    <p className="text-sm text-slate-400 mt-2">This document has no content yet</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <pre 
                      className="whitespace-pre-wrap leading-relaxed text-slate-800 font-mono overflow-x-auto"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {content}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Document Info Card */}
            {selected && content && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Characters</p>
                    <p className="text-2xl font-bold text-[#0f4d8a]">{content.length.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Words</p>
                    <p className="text-2xl font-bold text-[#E67919]">{content.split(/\s+/).filter(Boolean).length.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Lines</p>
                    <p className="text-2xl font-bold text-green-600">{content.split('\n').length.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium mb-1">Font Size</p>
                    <p className="text-2xl font-bold text-purple-600">{fontSize}px</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}