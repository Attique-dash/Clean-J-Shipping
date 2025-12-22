"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Search, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  views?: number;
  helpful?: number;
  notHelpful?: number;
}

interface FAQResponse {
  faqs: Record<string, FAQItem[]>;
  flat: FAQItem[];
  categories: string[];
}

const categoryLabels: Record<string, string> = {
  shipping: "Shipping & Delivery",
  rates: "Rates & Pricing",
  policies: "Policies & Terms",
  account: "Account Management",
  general: "General Questions",
};

const categoryIcons: Record<string, string> = {
  shipping: "📦",
  rates: "💰",
  policies: "📋",
  account: "👤",
  general: "❓",
};

export default function CustomerFAQPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  async function loadFAQs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/customer/faq?${params.toString()}`, { cache: "no-store" });
      const data: FAQResponse = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load FAQs");

      setFaqs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFAQs();
  }, [selectedCategory]);

  useEffect(() => {
    if (searchQuery) {
      const timeout = setTimeout(() => loadFAQs(), 300);
      return () => clearTimeout(timeout);
    } else {
      loadFAQs();
    }
  }, [searchQuery]);

  function toggleItem(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const displayFaqs = faqs?.flat || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-[#0f4d8a] to-[#1e6bb8] rounded-xl shadow-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f4d8a]">Frequently Asked Questions</h1>
              <p className="text-sm text-gray-600 mt-1">
                Find answers to common questions about shipping, rates, and policies
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0f4d8a] focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="all">All Categories</option>
              {faqs?.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat] || cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0f4d8a] animate-spin" />
            <span className="ml-3 text-gray-600">Loading FAQs...</span>
          </div>
        )}

        {/* FAQs by Category */}
        {!loading && faqs && (
          <>
            {selectedCategory === "all" ? (
              // Show grouped by category
              Object.entries(faqs.faqs).map(([category, items]) => (
                <div key={category} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">{categoryIcons[category] || "📋"}</span>
                      {categoryLabels[category] || category}
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No FAQs found in this category
                      </div>
                    ) : (
                      items.map((faq) => (
                        <FAQItem
                          key={faq._id}
                          faq={faq}
                          isExpanded={expandedItems.has(faq._id)}
                          onToggle={() => toggleItem(faq._id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Show filtered list
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">{categoryIcons[selectedCategory] || "📋"}</span>
                    {categoryLabels[selectedCategory] || selectedCategory}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {displayFaqs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No FAQs found
                    </div>
                  ) : (
                    displayFaqs.map((faq) => (
                      <FAQItem
                        key={faq._id}
                        faq={faq}
                        isExpanded={expandedItems.has(faq._id)}
                        onToggle={() => toggleItem(faq._id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && (!faqs || displayFaqs.length === 0) && !error && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No FAQs found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FAQItem({
  faq,
  isExpanded,
  onToggle,
}: {
  faq: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="transition-all">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 pb-4">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{faq.answer}</div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span>Helpful ({faq.helpful || 0})</span>
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors">
              <ThumbsDown className="h-4 w-4" />
              <span>Not helpful ({faq.notHelpful || 0})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

