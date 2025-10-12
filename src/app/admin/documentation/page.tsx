"use client";

import { useEffect, useState } from "react";

type DocMeta = { path: string; name: string };

export default function DocumentationPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) loadDoc(selected);
  }, [selected]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <button onClick={loadList} className="rounded-md border px-3 py-1.5 text-sm">Refresh</button>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 rounded-lg border p-3 max-h-[70vh] overflow-auto bg-white/40">
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-gray-500">No documents</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.path}>
                  <button
                    className={`w-full text-left px-2 py-1 rounded ${selected===d.path?"bg-neutral-900 text-white":"hover:bg-neutral-100"}`}
                    onClick={() => setSelected(d.path)}
                    title={d.path}
                  >
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:col-span-3 rounded-lg border p-4 bg-white/50">
          {selected ? (
            <>
              <div className="mb-2 text-xs text-gray-500">{selected}</div>
              <pre className="whitespace-pre-wrap text-sm leading-6">{content || "(empty)"}</pre>
            </>
          ) : (
            <div className="text-sm text-gray-500">Select a document to view.</div>
          )}
        </div>
      </div>
    </div>
  );
}
