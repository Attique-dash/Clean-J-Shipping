"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/customer/pay");
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Payment Center...</p>
      </div>
    </div>
  );
}
