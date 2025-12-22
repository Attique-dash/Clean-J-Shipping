// src/app/warehouse/search/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaSearch, FaBox, FaUser, FaArrowRight } from 'react-icons/fa';

interface SearchResult {
  _id: string;
  type: 'package' | 'customer';
  trackingNumber?: string;
  name?: string;
  email?: string;
  shippingId?: string;
  status?: string;
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/warehouse/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      
      if (res.ok) {
        setSearchResults(data.results);
      } else {
        throw new Error(data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      // Handle error (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'package') {
      router.push(`/warehouse/packages/${result._id}`);
    } else {
      // Customer lookup - show customer info in packages view instead
      router.push(`/warehouse/packages?userCode=${result.shippingId || result._id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Packages & Customers</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by tracking #, customer name, email, or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white ${
                loading || !searchTerm.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {searchResults.map((result) => (
                <li key={`${result.type}-${result._id}`} className="hover:bg-gray-50">
                  <button
                    onClick={() => handleResultClick(result)}
                    className="block w-full text-left px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          result.type === 'package' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {result.type === 'package' ? (
                            <FaBox className={`h-5 w-5 ${result.status === 'unknown' ? 'text-yellow-500' : 'text-blue-500'}`} />
                          ) : (
                            <FaUser className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {result.type === 'package' ? result.trackingNumber : result.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.type === 'package' 
                              ? `Status: ${result.status?.replace('_', ' ') || 'Unknown'}`
                              : result.email}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <FaArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {searchResults.length === 0 && searchTerm && !loading && (
          <div className="text-center py-12">
            <FaSearch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              We couldn't find any packages or customers matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}