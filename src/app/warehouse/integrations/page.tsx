"use client";

import Link from "next/link";
import { Plug, Code, Shield, ExternalLink, Plus, Edit, Trash2, RefreshCw, Users } from "lucide-react";

export default function WarehouseIntegrationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f4d8a] via-[#0a3a6b] to-[#062844] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-[#E67919] rounded-lg shadow-lg">
              <Plug className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">API Integrations</h1>
              <p className="text-blue-200 text-sm mt-1">Connect external systems with our warehouse APIs</p>
            </div>
          </div>
          
          {/* Info Banner */}
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#E67919] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">Secure API Endpoints</p>
                <p className="text-blue-200 text-xs mt-1">
                  All endpoints require authentication via x-warehouse-key header or APIToken parameter
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints Grid */}
        <div className="space-y-4">
          <Section
            title="Add Package"
            method="POST"
            path="/api/warehouse/addpackage/subdir"
            notes="Accepts array of package objects. Auth via x-warehouse-key header or APIToken in body."
            icon={<Plus className="w-5 h-5" />}
            color="green"
          />
          <Section
            title="Edit Package"
            method="POST"
            path="/api/warehouse/editpackage/subdir"
            notes="Updates existing packages; adds history entry if status changed."
            icon={<Edit className="w-5 h-5" />}
            color="blue"
          />
          <Section
            title="Delete Package"
            method="POST"
            path="/api/warehouse/deletepackage/subdir"
            notes="Soft deletes (status → 'Deleted'). Accepts array or single object."
            icon={<Trash2 className="w-5 h-5" />}
            color="red"
          />
          <Section
            title="Update Manifest"
            method="POST"
            path="/api/warehouse/updatemanifest/subdir"
            notes="Links packages to manifestId using tracking/control numbers. Flexible manifest payload."
            icon={<RefreshCw className="w-5 h-5" />}
            color="orange"
          />
          <Section
            title="Pull Customers"
            method="GET"
            path="/api/warehouse/pullcustomer/subdir?id=APITOKEN"
            notes="Returns array of customers with user codes and service types."
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
            <Code className="w-4 h-4 text-[#E67919]" />
            <p className="text-blue-200 text-sm">
              Need API documentation? Contact your system administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ 
  title, 
  method, 
  path, 
  notes, 
  icon,
  color 
}: { 
  title: string; 
  method: string; 
  path: string; 
  notes?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const methodColors = {
    POST: "bg-blue-500 text-white",
    GET: "bg-green-500 text-white",
    PUT: "bg-yellow-500 text-white",
    DELETE: "bg-red-500 text-white"
  };

  const iconColors = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    orange: "bg-[#E67919]",
    purple: "bg-purple-500"
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden transform transition-all duration-200 hover:shadow-2xl hover:-translate-y-1">
      {/* Card Header with Gradient */}
      <div className="bg-gradient-to-r from-[#0f4d8a] to-[#0a3a6b] px-6 py-4 border-b-2 border-[#E67919]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${iconColors[color as keyof typeof iconColors]} rounded-lg text-white`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`${methodColors[method as keyof typeof methodColors]} text-xs font-bold px-2 py-0.5 rounded`}>
                  {method}
                </span>
                <code className="text-xs text-blue-200 font-mono bg-white/10 px-2 py-0.5 rounded">
                  {path}
                </code>
              </div>
            </div>
          </div>
          <Link 
            href={path} 
            className="flex items-center gap-1.5 bg-[#E67919] hover:bg-[#d46a0f] text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="text-sm">Open</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
      
      {/* Card Body */}
      {notes && (
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0f4d8a]"></div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}