"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const FaFacebookF = dynamic(() => import("react-icons/fa").then(m => m.FaFacebookF), { ssr: false });
const FaTwitter = dynamic(() => import("react-icons/fa").then(m => m.FaTwitter), { ssr: false });
const FaInstagram = dynamic(() => import("react-icons/fa").then(m => m.FaInstagram), { ssr: false });
const FaPhoneAlt = dynamic(() => import("react-icons/fa").then(m => m.FaPhoneAlt), { ssr: false });
const FiMenu = dynamic(() => import("react-icons/fi").then(m => m.FiMenu), { ssr: false });
const FiX = dynamic(() => import("react-icons/fi").then(m => m.FiX), { ssr: false });
const MdEmail = dynamic(() => import("react-icons/md").then(m => m.MdEmail), { ssr: false });

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [showTopBar, setShowTopBar] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  useEffect(() => {
    const onScroll = () => {
      setShowTopBar(window.scrollY < 50);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll when drawer or search is open
  useEffect(() => {
    if (isDrawerOpen || isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isDrawerOpen, isSearchOpen]);

  // focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isSearchOpen]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setIsSearchOpen(false);
    if (!q) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  // Define routes where header should be hidden
  const hideHeaderRoutes = [
    '/login',
    '/admin',
    '/customer',
    '/warehouse',
  ];

  // Check if current route should hide header
  const shouldHideHeader = hideHeaderRoutes.some(route => 
    pathname?.startsWith(route)
  );

  // Hide header on specified routes
  if (shouldHideHeader) {
    return null;
  }

  return (
    <>
    <header className="z-50 overflow-x-hidden text-gray-900 transition-all duration-500 ease-in-out">
      {/* === Top Blue Bar === */}
      <div
        className={`relative h-10 overflow-hidden bg-[#0E7893] text-white transition-all duration-500 ease-in-out ${
          showTopBar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
        }`}
      >
        {/* Left & Right Diagonal Cuts */}
        <span className="pointer-events-none absolute left-0 top-0 h-full w-10 -skew-x-12 bg-white" />
        <span className="pointer-events-none absolute right-0 top-0 h-full w-10 skew-x-12 bg-white" />

        <div className="relative z-10 mx-auto hidden h-full max-w-7xl items-center md:flex md:justify-between gap-8 px-6 text-sm">
          <div className="flex items-center gap-6 pl-8">
            <a href="tel:+18765785945" className="inline-flex items-center gap-2 hover:opacity-90">
              <FaPhoneAlt className="text-[#E67919]" size={18} />
              <span className="font-medium ">1 (876) 578-5945</span>
            </a>
            <a href="mailto:info@cleanshipping.com" className="inline-flex items-center gap-2 hover:opacity-90">
              <MdEmail className="text-[#E67919]" size={18} />
              <span className="font-medium">info@cleanshipping.com</span>
            </a>
          </div>
          <div className="flex items-center gap-4 pr-8">
            <a aria-label="Facebook" href="#" className="hover:opacity-90">
              <FaFacebookF size={16} className="text-[#E67919]" />
            </a>
            <a aria-label="Twitter" href="#" className="hover:opacity-90">
              <FaTwitter size={16} className="text-[#E67919]" />
            </a>
            <a aria-label="Instagram" href="#" className="hover:opacity-90">
              <FaInstagram size={16} className="text-[#E67919]" />
            </a>
          </div>
        </div>
      </div>

      {/* === White Navbar (Sticky) === */}
      <div className={`sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm transition-all duration-300`}>
        <div className="mx-auto flex h-25 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image src="/images/Logo.png" alt="Clean Shipping" width={150} height={60} priority className="w-[180px] md:w-[150px] h-auto" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {[
              { href: "/", label: "Home" },
              { href: "/about-us", label: "About Us" },
              { href: "/services", label: "Services" },
              { href: "/rates", label: "Rates" },
              { href: "/customs-policy", label: "Customs Policy" },
              { href: "/contact", label: "Contact Us" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[15px] font-semibold tracking-wide hover:text-[#E67919] ${
                  pathname === item.href ? "text-[#E67919]" : "text-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden md:inline-flex rounded-md bg-[#E67919] md:px-4 md:py-2 md:text-sm lg:px-5 lg:py-2.5 lg:text-sm font-semibold text-white shadow-sm hover:bg-gray-900"
            >
              Login
            </Link>

            <button
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#E67919] ring-1 ring-orange-100 hover:bg-orange-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50 md:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Off-canvas mobile drawer */}
      <div className={`fixed inset-0 z-[60] md:hidden ${isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* overlay */}
        <div
          onClick={() => setIsDrawerOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${isDrawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        {/* panel */}
        <div
          className={`absolute left-0 top-0 h-full w-5/6 max-w-[320px] transform bg-white shadow-xl ring-1 ring-black/10 transition-transform duration-300 ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Link href="/" onClick={() => setIsDrawerOpen(false)} className="flex items-center">
              <Image src="/images/Logo.png" alt="Clean Shipping" width={120} height={48} />
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsDrawerOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-4 py-3">
            {[
              { href: "/", label: "Home" },
              { href: "/about-us", label: "About Us" },
              { href: "/services", label: "Services" },
              { href: "/rates", label: "Rates" },
              { href: "/customs-policy", label: "Customs Policy" },
              { href: "/contact", label: "Contact Us" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsDrawerOpen(false)}
                className={`block rounded-md px-3 py-3 text-[15px] font-semibold tracking-wide hover:bg-gray-50 ${
                  pathname === item.href ? "text-[#E67919]" : "text-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Contact info + socials inside drawer for small screens */}
          <div className="mt-auto border-t px-4 py-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <FaPhoneAlt className="text-[#E67919]" />
              <a href="tel:+18765785945" className="hover:underline">1 (876) 578-5945</a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MdEmail className="text-[#E67919]" />
              <a href="mailto:info@cleanshipping.com" className="hover:underline">info@cleanshipping.com</a>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <a aria-label="Facebook" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"><FaFacebookF className="text-[#E67919]" /></a>
              <a aria-label="Twitter" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"><FaTwitter className="text-[#E67919]" /></a>
              <a aria-label="Instagram" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-gray-200 hover:bg-gray-50"><FaInstagram className="text-[#E67919]" /></a>
            </div>
            <Link
              href="/login"
              onClick={() => setIsDrawerOpen(false)}
              className="mt-3 block rounded-md bg-[#E67919] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#cf6912]"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </header>
    {/* Search Modal Overlay */}
    <div className={`fixed inset-0 z-[70] ${isSearchOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* dim background */}
      <div
        onClick={() => setIsSearchOpen(false)}
        className={`absolute inset-0 bg-black/60 transition-opacity ${isSearchOpen ? "opacity-100" : "opacity-0"}`}
      />
      {/* top-right close */}
      <button
        aria-label="Close search"
        onClick={() => setIsSearchOpen(false)}
        className={`fixed right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-gray-900 shadow ring-1 ring-black/10 transition-opacity ${isSearchOpen ? "opacity-100" : "opacity-0"}`}
      >
        ×
      </button>
      {/* centered search bar */}
      <div className={`absolute left-1/2 top-1/3 w-[90%] max-w-3xl -translate-x-1/2 -translate-y-1/2 transform transition-opacity ${isSearchOpen ? "opacity-100" : "opacity-0"}`}>
        <form onSubmit={onSubmit} className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border border-white/40 bg-white/95 px-6 py-4 pr-12 text-base md:text-lg shadow-lg outline-none focus:ring-2 focus:ring-[#E67919]"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E67919] text-white shadow"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
    </>
  );
}