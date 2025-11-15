"use client";

import Link from "next/link";
import Image from "next/image";
import HeroSlider from "@/components/HeroSlider";
import { FiPhone, FiCheckCircle, } from "react-icons/fi";
import { PiCurrencyCircleDollarLight } from "react-icons/pi";
import { TbTruckDelivery } from "react-icons/tb";
import { motion } from "framer-motion";
import { GiAirplaneDeparture } from "react-icons/gi";
import { LiaShipSolid } from "react-icons/lia";
import { FaUserCheck } from "react-icons/fa";
import { FaShoppingCart } from "react-icons/fa";
import { IoAirplane } from "react-icons/io5";
import { FiClock } from "react-icons/fi";



export default function Home() {
  return (
    <div className="bg-white text-gray-900">
      {/* ===== Hero Section ===== */}
      <section className="relative w-full overflow-hidden">
        {/* background slider fills this section */}
        <HeroSlider />

        {/* Blue gradient overlay from left to transparent */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E7893]/60 via-[#0E7893]/35 to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-start px-6 py-16 md:py-24 lg:py-28">
          <div className="w-full flex-col items-start md:w-3/4 lg:w-1/2">
            <h1 className="text-3xl font-extrabold leading-tight text-white drop-shadow-md md:text-5xl">
              Reliable <span className="text-[#E67919]">Courier</span> &{" "}
              <span className="text-[#E67919]">Delivery</span>
              <br /> Services You <br /> Can Count On
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/90 md:text-lg">
              At Clean J Shipping, we specialize in fast, affordable, and secure
              delivery solutions — whether it&rsquo;s a package across town or a
              shipment overseas. With our trusted air freight, ocean freight,
              and local courier services, your items are always in safe hands.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 rounded-md bg-[#E67919] px-6 py-3 text-white shadow-md transition hover:bg-gray-900"
              >
                <span className="text-base font-semibold">Contact Us</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 17L17 7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 7h7v7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>

              <div className="inline-flex items-center gap-3 rounded-xl ">
                <div className="inline-flex text-white h-14 w-14 items-center justify-center rounded-full hover:bg-gray-900  bg-sky-500 shadow">
                  <FiPhone size={20} />
                </div>
                <div className="leading-tight font-semibold text-lg text-white ">
                  <div className=" ">Call us any time</div>
                  <div className="">
                    1 (876) 578-5945
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Welcome / Shipping Made Simple ===== */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-start gap-16 md:grid-cols-2">
          {/* ===== Left: Welcome ===== */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-extrabold text-gray-900 leading-tight">
              Welcome to <span className="text-[#0E7893]">Clean J Shipping</span>
            </h2>
            <p className="mt-3 text-lg font-semibold text-gray-800">Fast. Reliable. Affordable.</p>
            <p className="mt-4 text-base leading-8 text-gray-700">
              Whether you&apos;re shipping across the island or across the ocean,{" "}
              <span className="font-semibold">Clean J Shipping</span> is your trusted partner for
              air freight, ocean freight, and local delivery services. We
              specialize in making shipping easy, secure, and hassle-free — so you
              can focus on what matters most.
            </p>

            {/* ==== Features with Animations ==== */}
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Left - Affordable Pricing */}
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="flex items-center gap-3 rounded-2xl bg-orange-50 px-5 py-4 text-gray-900 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <span className="inline-flex items-center justify-center border-none text-[#E67919] ring-1 ring-orange-100 text-lg font-bold">
                  <PiCurrencyCircleDollarLight className="sm:text-2xl" size={70} />
                </span>
                <span className="font-semibold sm:text-base text-lg">Affordable Pricing</span>
              </motion.div>

              {/* Right - On-Time Deliveries */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 rounded-2xl bg-orange-50 px-5 py-4 text-gray-900 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <span className="inline-flex items-center justify-center text-[#E67919] ring-1 ring-orange-100 text-lg">
                  <FiClock className="sm:text-2xl font-light" size={70} />
                </span>
                <span className="font-semibold sm:text-base text-lg">On-Time Deliveries</span>
              </motion.div>
            </div>

            {/* ==== Button ==== */}
            <div className="mt-10">
              <Link
                href="/about-us"
                className="inline-flex items-center gap-2 rounded-md bg-[#E67919] px-6 py-3 text-white md:text-lg text-sm font-semibold shadow-md hover:bg-[#0E7893] transition duration-300"
              >
                Read More
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 17L17 7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 7h7v7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* ===== Right: Shipping Made Simple ===== */}
          <div className="text-gray-700">
            <div className="w-full rounded-sm bg-[#0E7893] px-5 py-3 text-xl font-bold tracking-wide text-white">
              Shipping Made Simple
            </div>
            <p className="mt-5 text-lg leading-8 text-gray-700">
              From personal packages to commercial cargo, we handle it all with care and efficiency. Our team ensures your items arrive safely, on time, and at a price you can feel good about.
            </p>
            <div className="mt-6">
              <div className="mb-3 text-xl font-semibold text-gray-900">Why Choose Clean J Shipping?</div>
              <ul className="space-y-3">
                {[
                  "Reliable, on-time deliveries",
                  "Friendly and responsive customer service",
                  "Affordable and transparent pricing",
                  "Easy quote requests and package tracking",
                ].map((text, i) => (
                  <motion.li
                    key={text}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.05 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    className="flex items-start gap-3 text-base"
                  >
                    <FiCheckCircle className="mt-0.5 text-[#0E7893]" size={24} />
                    <span>{text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-base">Join our happy customers who trust us to move what matters.</p>
          </div>
        </div>
      </section>

      {/* ===== Our Popular Logistics Services ===== */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-extrabold text-gray-900">Our Popular Logistics Services</h3>
          <Link href="/services" className="inline-flex items-center gap-2 rounded-md bg-[#E67919] px-4 py-2.5 text-white text-sm font-semibold shadow hover:bg-[#0E7893]">
            View All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 17L17 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10 7h7v7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Ocean Freight", img: "/images/ship2.png", Icon: LiaShipSolid, desc: "For larger or less time-sensitive shipments, our ocean freight solutions." },
            { title: "Air Freight", img: "/images/airplane.png", Icon: GiAirplaneDeparture, desc: "When time is critical, our air freight services deliver. Small or large packages." },
            { title: "Delivery", img: "/images/deliver.png", Icon: TbTruckDelivery, desc: "Need something delivered across town or nearby? Our local courier has you covered." },
          ].map(({ title, img, Icon, desc }, idx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              className="group rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative p-4">
                <div className="overflow-hidden rounded-2xl">
                  <Image src={img} alt={title} width={720} height={480} className="h-56 w-full transform object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="absolute bottom-2 left-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#E67919] text-white shadow-md transition-colors duration-300 group-hover:bg-[#0E7893]">
                    <Icon size={20} />
                  </span>
                </div>
              </div>
              <div className="px-6 pb-6 pt-1">
                <div className="text-lg font-semibold text-gray-900">{title}</div>
                <p className="mt-1 text-sm text-gray-600">{desc}</p>
                <Link href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#E67919] hover:underline">
                  Read more
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 7h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        </section>

      {/* ===== How Stuff Works Panel ===== */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <div className="relative">
          <div className="relative rounded-xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5 border-l-4 border-sky-400">
            <div className="flex flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center md:px-10">
              <h3 className="text-xl font-extrabold text-gray-900 md:text-2xl">How Stuff Works!</h3>
              <Link
                href="/customs-policy"
                className="inline-flex items-center gap-2 rounded-md bg-[#E67919] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0E7893]"
              >
                VIEW CUSTOM POLICIES
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 7h7v7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Shop & Ship Steps ===== */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Left: Video */}
          <div className="overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
            <video
              src="/videos/shoping.mp4"
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>

          {/* Right: Steps */}
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
              Shop from Amazon, eBay & More – We Handle the Shipping, So You Don’t Have To
            </h3>

            <div className="relative mt-6">
              {/* vertical line */}
              <div className="pointer-events-none absolute left-[24px] top-0 h-full w-0.5 bg-gray-200" />

              <ol className="space-y-8">
                {[
                  { n: 1, title: "Sign Up", desc: "Create your free lifetime online account today and start shopping from your favorite online stores.", Icon: FaUserCheck },
                  { n: 2, title: "Shop", desc: "Buy from your favorite stores. If you don’t have a credit card, we’ll provide one.", Icon: FaShoppingCart },
                  { n: 3, title: "Ship", desc: "After purchasing your items, ship them to the address provided during Sign Up.", Icon: IoAirplane },
                  { n: 4, title: "Delivery", desc: "After shipping, request delivery or pickup your items at our location.", Icon: TbTruckDelivery },
                ].map(({ n, title, desc, Icon }) => (
                  <li key={n} className="relative flex gap-4">
                    {/* Number badge */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow">
                      <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E67919] text-[11px] font-bold shadow">{n}</span>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{title}</div>
                      <p className="mt-1 text-sm text-gray-600">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-10">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center shadow-sm ring-1 ring-black/5 sm:grid-cols-3 md:grid-cols-6">
          {[
            { name: "Amazon", src: "/amazon.svg" },
            { name: "eBay", src: "/ebay.svg" },
            { name: "Shein", src: "/shein.svg" },
            { name: "Forever 21", src: "/forever21.svg" },
            { name: "Fashion Nova", src: "/fashionnova.svg" },
            { name: "Old Navy", src: "/oldnavy.svg" },
          ].map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
              className={`group relative flex items-center justify-center py-3 ${i < 5 ? "sm:border-r sm:border-gray-300 sm:border-dashed" : ""}`}
            >
              <Link href="#" className="block w-full">
                <div className="mx-auto inline-flex transform items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                  <Image src={brand.src} alt={brand.name} width={200} height={80} className={`w-auto object-contain ${brand.name === 'Shein' ? 'h-8 md:h-9 lg:h-10' : 'h-12 md:h-18 lg:h-20'}`} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
          <div className="relative h-64 w-full sm:h-72 md:h-80">
            <Image src="/images/airplane.png" alt="Airplane background" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E7893]/80 via-[#0E7893]/50 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-between px-6 py-8 md:px-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl text-white"
              >
                <div className="text-2xl font-extrabold md:text-3xl">We Ensure Safe Transportation
                  <br />& Delivery
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="hidden md:block"
              >
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-md bg-[#E67919] px-5 py-3 text-white font-semibold shadow-md transition hover:bg-[#0E7893]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.66 12.66 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.66 12.66 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
              <Image src="/images/boy.png" alt="Courier" width="300" height="300" className="max-h-full object-contain drop-shadow-md" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-6 py-6 text-base text-gray-700">
          <div className="text-right font-semibold">
            <Link href="#" className="hover:underline">All rights reserved</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
