"use client";

export default function PackagesLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 overflow-hidden">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#0f4d8a]"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Packages</h2>
        <p className="text-gray-600">Please wait while we load your packages...</p>
        <div className="mt-6">
          <div className="h-2 bg-gray-200 rounded-full w-full max-w-xs mx-auto overflow-hidden">
            <div className="h-full bg-[#0f4d8a] rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
