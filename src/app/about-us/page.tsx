"use client";
import Link from "next/link";
import { useState } from "react";
import { FiDollarSign, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";
import TopHeader from "@/components/TopHeader";

export default function AboutUsPage() {
  const items = [
    {
      title: "Our Mission",
      body: "To deliver efficient, affordable, and secure shipping solutions with a personal touch — ensuring every customer experience is smooth, trustworthy, and backed by outstanding service.",
    },
    {
      title: "Our Vision",
      body: "To become the Caribbean’s leading logistics and shipping provider, known for reliability, innovation, and a people-first approach that bridges distance and builds trust across borders.",
    },
  ];
  const [open, setOpen] = useState<number | null>(1);

  return (
    <>
      <TopHeader />
      {/* Hero / Banner */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          backgroundImage: "url('/images/ship.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-16 md:py-24">
          {/* Left: Title & Breadcrumbs */}
          <div className="text-white text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight md:text-[50px]">
              About us
            </h1>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-white/90">
              <Link href="/" className="hover:underline text-sm md:text-xl">
                Home
              </Link>
              <span className="text-sm md:text-xl text-[#E67919]">›</span>
              <span className="text-sm md:text-xl">About us</span>
            </div>
          </div>
        </div>
      </section>

      {/* Page content */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="mb-6 text-3xl font-bold">
              Our Mission Statement & Vision
            </h3>
            <div className="space-y-3">
              {items.map((it, idx) => {
                const isOpen = open === idx;
                return (
                  <div
                    key={it.title}
                    className="rounded-md border border-gray-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      className={`flex w-full cursor-pointer border-2 border-blue-200 items-center justify-between rounded-md px-4 py-3 text-left transition-colors ${
                        isOpen
                          ? "bg-[#0F2A5A] text-white"
                          : "bg-white text-gray-900"
                      }`}
                    >
                      <span className="font-semibold text-base md:text-[22px]">{it.title}</span>
                      <span
                        className={`inline-flex text-xl md:text-[30px] h-6 w-6 items-center justify-center rounded-sm text-lg transition-transform ${
                          isOpen ? "rotate-0" : "rotate-0"
                        }`}
                      >
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                        isOpen ? "max-h-[500px] md:max-h-48" : "max-h-0"
                      }`}
                    >
                      <div className="px-4 py-6 md:py-8 text-base md:text-[20px] text-gray-700">
                        {it.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-3xl font-bold leading-snug">
              Delivering More Than Packages — We Deliver Trust
            </h3>
            <p className="mb-4 text-lg text-gray-700">At
              <span className="font-semibold"> Clean J Shipping</span>, we
              take pride in providing fast, reliable, and affordable shipping
              solutions that connect our clients with the world. Whether it’s
              air freight, ocean cargo, or local delivery, we go above and
              beyond to ensure every package is handled with care, precision,
              and urgency.
            </p>
            <p className="mb-4 text-lg text-gray-700">
              What started as a small, customer‑focused courier service has
              grown into a trusted logistics partner for individuals and
              businesses alike. Our team is driven by a passion for service and
              a commitment to making shipping stress‑free and dependable for
              everyone we serve.
            </p>
            <p className="text-gray-700 text-lg">
              We believe that your packages are more than just items — they’re
              promises, opportunities, and connections. That’s why, at Clean J
              Shipping, we treat every shipment like it matters — because to
              you, it does.
            </p>
          </div>
        </div>
      </section>

      {/* Page bottom promo/features */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left pill card with slide-up */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center justify-center rounded-lg bg-[#0F2A5A] px-6 py-7 text-center text-white shadow-sm"
          >
            <p className="text-lg md:text-[22px] font-semibold leading-snug">
              Your <span className="text-[#E67919]">Trusted</span> Shipping
              <br /> Partner
            </p>
          </motion.div>

          {/* Right feature cards with opposing slide-in */}
          <div className="grid gap-6 md:col-span-2 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex md:justify-center items-center gap-4 rounded-lg bg-orange-50 p-5 shadow-sm ring-1 ring-orange-100"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E67919] text-[#E67919] bg-white">
                <FiDollarSign className="h-5 w-5 md:h-11 md:w-11" />
              </span>
              <div>
                <p className="text-lg md:text-[25px] font-semibold text-gray-900">Affordable</p>
                <p className="-mt-0.5 text-lg md:text-[25px] font-semibold text-gray-900">Pricing</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
              className="flex md:justify-center items-center gap-4 rounded-lg bg-orange-50 p-5 shadow-sm ring-1 ring-orange-100"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E67919] text-[#E67919] bg-white">
                <FiClock className="h-5 w-5 md:h-11 md:w-11" />
              </span>
              <div>
                <p className="text-lg md:text-[25px] font-semibold text-gray-900">On‑Time</p>
                <p className="-mt-0.5 text-lg md:text-[25px] font-semibold text-gray-900">Deliveries</p>
              </div>
            </motion.div>
          </div>
        </div>
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
