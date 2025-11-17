"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import TopHeader from "@/components/TopHeader";

export default function ServicesPage() {
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
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-12 sm:py-16 md:py-24">
          {/* Left: Title & Breadcrumbs */}
          <div className="text-white text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight md:text-[50px]">
              Our Services
            </h1>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-white/90">
              <Link href="/" className="hover:underline text-sm md:text-xl">
                Home
              </Link>
              <span className="text-sm md:text-xl text-[#E67919]">›</span>
              <span className="text-sm md:text-xl">Services</span>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        <p className="text-[#475569] text-base md:text-lg leading-relaxed">
          At{" "}
          <span className="font-semibold text-gray-700">Clean J Shipping</span>,
          we offer a range of reliable and efficient shipping solutions designed
          to meet your needs — whether you&apos;re sending a small package
          across town or importing goods from overseas. Explore our core
          services below:
        </p>
      </section>
      <section className="mx-auto  max-w-7xl px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="space-y-10 md:space-y-14">
          {/* Block 1 */}
          <div className="grid md:mt-[30px] grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div>
              <div className="relative h-72 sm:h-80 md:h-[420px] overflow-hidden rounded-[40px]">
                <Image
                  src="/images/flying.png"
                  alt="Air Freight"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="relative overflow-hidden bg-white border border-gray-200 rounded-lg p-6 md:p-8">
              <div className="absolute right-[-25px] top-[15px] rotate-45 bg-[#1F76D3] text-white text-[10px] md:text-xs font-semibold px-6 py-1 shadow">
                POPULAR
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
                Air Freight
              </h3>
              <p className="mt-2 font-semibold text-base md:text-lg text-gray-700">
                Fast, Secure, and Reliable Global Shipping
              </p>
              <p className="mt-3 text-gray-600 text-base md:text-lg leading-relaxed">
                When time is critical, our air freight services deliver. Whether
                it&apos;s documents, packages, or bulk goods, Clean J Shipping
                ensures swift and secure transport to and from international
                destinations. We handle customs clearance, tracking, and
                logistics so your shipment arrives on time — every time.
              </p>
              <p className="mt-4 text-base md:text-lg font-semibold text-gray-900">
                Why choose us for air freight?
              </p>
              <ul className="mt-2 list-disc pl-5 text-base md:text-lg space-y-1 text-gray-700">
                <li>Rapid transit times</li>
                <li>Global coverage</li>
                <li>Real-time tracking</li>
                <li>Expert customs support</li>
              </ul>
            </div>
          </div>

          {/* Block 2 */}
          <div className="grid md:mt-[30px] grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="relative h-72 sm:h-80 md:h-[420px] overflow-hidden rounded-[36px]">
                <Image
                  src="/images/ship2.png"
                  alt="Air Freight"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="relative bg-white border border-gray-200 rounded-lg p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
                Ocean Freight
              </h3>
              <p className="mt-2 font-semibold text-base md:text-lg text-gray-700">
                Affordable & Efficient International Cargo Shipping
              </p>
              <p className="mt-3 text-gray-600 text-base md:text-lg leading-relaxed">
                For larger or less time-sensitive shipments, our ocean freight
                solutions offer cost-effective transport across the globe. We
                manage both Full Container Load (FCL) and Less than Container
                Load (LCL) services, making international shipping flexible and
                hassle-free for individuals and businesses.{" "}
              </p>
              <p className="mt-4 font-semibold text-base md:text-lg text-gray-900">
                Our ocean freight services include:
              </p>
              <ul className="mt-2 list-disc pl-5 text-base md:text-lg space-y-1 text-gray-700">
                <li>FCL & LCL shipping options</li>
                <li>Cargo consolidation</li>
                <li>Port-to-door delivery</li>
                <li>Import/export assistance</li>
              </ul>
            </div>
          </div>

          {/* Block 3 */}
          <div className="grid md:mt-[30px] grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="relative h-72 sm:h-80 md:h-[420px] overflow-hidden rounded-[36px]">
                <Image
                  src="/images/deliver.png"
                  alt="Air Freight"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="relative bg-white border border-gray-200 rounded-lg p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
                Local Delivery
              </h3>
              <p className="mt-2 font-semibold text-base md:text-lg text-gray-700">
                Fast, Friendly, and Reliable Courier Services Across Jamaica
              </p>
              <p className="mt-3 text-gray-600 text-base md:text-lg leading-relaxed">
                Need something delivered across town or to a nearby parish? Our
                local courier services are designed for speed, safety, and
                convenience. From documents and small packages to bulk items, we
                ensure same-day or next-day delivery options with professional
                handling every step of the way.
              </p>
              <p className="mt-4 font-semibold text-base md:text-lg text-gray-900">
                Benefits of our local delivery:
              </p>
              <ul className="mt-2 list-disc pl-5 text-base md:text-lg space-y-1 text-gray-700">
                <li>Islandwide coverage</li>
                <li>Same-day & next-day options</li>
                <li>Door-to-door service</li>
                <li>Trusted, friendly couriers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
          <div className="relative h-64 w-full sm:h-72 md:h-80">
            <Image
              src="/images/airplane.png"
              alt="Airplane background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E7893]/80 via-[#0E7893]/50 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-between px-6 py-8 md:px-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl text-white"
              >
                <div className="text-2xl font-extrabold md:text-3xl">
                  We Ensure Safe Transportation
                  <br />& Delivery
                </div>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#E67919] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#0E7893] md:hidden"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.66 12.66 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.66 12.66 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  1 (876) 578-5945
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="hidden md:block"
              >
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 rounded-md bg-[#E67919] px-5 py-3 text-white font-semibold shadow-md transition hover:bg-[#0E7893]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.66 12.66 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.66 12.66 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  1 (876) 578-5945
                </Link>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
              className="pointer-events-none absolute right-[280px] z-10 hidden md:block"
            >
              <Image
                src="/images/boy.png"
                alt="Courier"
                width="300"
                height="300"
                className="max-h-full object-contain drop-shadow-md"
              />
            </motion.div>
          </div>
        </div>
      </section>
      {/* ===== Footer ===== */}
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
