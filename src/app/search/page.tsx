"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SearchPageContent() {
  const params = useSearchParams();
  const q = (params?.get("q") || "").trim();

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12 md:py-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900">Search results for{q ? ": " : ""}<span className="break-words">{q}</span></h1>
        <p className="mt-3 text-gray-600 max-w-3xl">It seems we can&apos;t find what you&apos;re looking for.</p>
      </section>
      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-6 py-6 text-base text-gray-700">
          <div className="text-right font-semibold">
            <Link href="#" className="hover:underline">
              All rights reserved
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
