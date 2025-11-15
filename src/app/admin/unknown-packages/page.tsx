import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";

export default async function UnknownPackagesPage() {
  await dbConnect();
  const raw = await Package.find({
    $or: [{ status: "Unknown" }, { customer: { $exists: false } }, { customer: null }],
  })
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean<{
      _id: unknown;
      trackingNumber: string;
      status: string;
      userCode: string;
      updatedAt?: Date | string;
      description?: string;
    }[]>();

  const items = raw.map((p) => ({
    _id: String(p._id),
    trackingNumber: p.trackingNumber,
    status: p.status,
    userCode: p.userCode,
    description: p.description,
    updatedAt:
      typeof p.updatedAt === "string"
        ? p.updatedAt
        : p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#E67919] rounded-2xl shadow-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Unknown Packages
                </h1>
                <p className="text-blue-100 text-lg">Packages requiring attention and assignment</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/30">
                <div className="text-sm font-medium text-blue-100 mb-1">Total Items</div>
                <div className="text-4xl font-bold">{items.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#0f4d8a] hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Unknown Status</p>
                <p className="text-3xl font-bold text-[#0f4d8a]">
                  {items.filter(i => i.status === "Unknown").length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-[#0f4d8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#E67919] hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">No Customer</p>
                <p className="text-3xl font-bold text-[#E67919]">
                  {items.filter(i => !i.userCode || i.userCode === "").length}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-[#E67919]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Recent (24h)</p>
                <p className="text-3xl font-bold text-green-600">
                  {items.filter(i => {
                    const diff = Date.now() - new Date(i.updatedAt).getTime();
                    return diff < 24 * 60 * 60 * 1000;
                  }).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-[#0f4d8a] to-[#0f4d8a]/90 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Package Details
            </h2>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    User Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-500 font-medium">No unknown packages found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((p, idx) => (
                    <tr 
                      key={p._id} 
                      className="hover:bg-blue-50/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#E67919] rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-gray-900">{p.trackingNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.userCode ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[#0f4d8a]/10 text-[#0f4d8a] border border-[#0f4d8a]/20">
                            {p.userCode}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-200">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {p.description || <span className="text-gray-400 italic">No description</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(p.updatedAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Showing <span className="font-semibold text-gray-900">{items.length}</span> packages</span>
                <span className="text-xs">Last updated: {new Date().toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}