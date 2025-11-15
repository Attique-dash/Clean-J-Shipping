"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaTruck } from "react-icons/fa";
import { LiaPhoneVolumeSolid } from "react-icons/lia";
import { LuMailOpen } from "react-icons/lu";
import { IoMdTime } from "react-icons/io";
import { FaFacebookF, FaInstagram  } from "react-icons/fa";
import { FaXTwitter, FaLinkedinIn } from "react-icons/fa6";

export default function ContactPage() {
  return (
    <>
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
            Contact us
          </h1>
          <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-white/90">
            <Link href="/" className="hover:underline text-sm md:text-xl">
              Home
            </Link>
            <span className="text-sm md:text-xl text-[#E67919]">›</span>
            <span className="text-sm md:text-xl">Contact us</span>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 xl:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2 text-gray-700">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#E67919] ">
              <FaTruck className="h-5 w-5" />
            </span> 
            <span className="text-sm md:text-base font-semibold">Contact</span>
          </div>

          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Get in touch with us</h2>

          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
            <div className="group flex items-start gap-3 text-gray-800 break-words transition-colors">
              <span className="text-[#E67919]">
                <LiaPhoneVolumeSolid className="h-5 w-5 md:h-7 md:w-7" />
              </span>
              <span className="text-sm sm:text-base font-semibold md:text-lg transition-colors group-hover:text-[#E67919]">1 (876) 578-5945</span>
            </div>
            <div className="group flex items-start gap-3 text-gray-800 break-words transition-colors">
              <span className="text-[#E67919]">
                <LuMailOpen className="h-5 w-5 md:h-7 md:w-7" />
              </span>
              <span className="text-sm sm:text-base font-semibold md:text-lg transition-colors group-hover:text-[#E67919]">Info@cleajshipping.com</span>
            </div>
            <div className="group flex items-start gap-3 text-gray-800 break-words transition-colors">
              <span className="text-[#E67919]">
                <IoMdTime className="h-5 w-5 md:h-7 md:w-7" />
              </span>
              <span className="text-sm sm:text-base font-semibold md:text-lg transition-colors group-hover:text-[#E67919]">Mon - Sat : 09 am - 06 pm</span>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-orange-50 border border-orange-100 p-5 sm:p-6">
            <div className="text-gray-900 font-semibold">Follow us:</div>
            <div className="flex items-center flex-wrap gap-3">
              <a aria-label="Facebook" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E67919] text-white transition-colors hover:bg-[#0E7893]"><FaFacebookF className="h-4 w-4" /></a>
              <a aria-label="X" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E67919] text-white transition-colors hover:bg-[#0E7893]"><FaXTwitter className="h-4 w-4" /></a>
              <a aria-label="LinkedIn" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E67919] text-white transition-colors hover:bg-[#0E7893]"><FaLinkedinIn className="h-4 w-4" /></a>
              <a aria-label="Instagram" href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E67919] text-white transition-colors hover:bg-[#0E7893]"><FaInstagram className="h-4 w-4" /></a>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
        >
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-5 sm:p-6 md:p-8">
            <div className="text-gray-900 font-bold text-base md:text-lg mb-4">Active & Ready to use Contact Form!</div>
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" className="w-full rounded-md bg-white px-4 py-3 min-h-11 text-sm md:text-base text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67919]" />
                <input type="text" placeholder="Last Name" className="w-full rounded-md bg-white px-4 py-3 min-h-11 text-sm md:text-base text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67919]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="email" placeholder="Your Email" className="w-full rounded-md bg-white px-4 py-3 min-h-11 text-sm md:text-base text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67919]" />
                <input type="tel" placeholder="Phone Number" className="w-full rounded-md bg-white px-4 py-3 min-h-11 text-sm md:text-base text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67919]" />
              </div>
              <textarea placeholder="Your Message" rows={5} className="w-full rounded-md bg-white px-4 py-3 text-sm md:text-base text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67919]"></textarea>
              <button type="button" className="w-full rounded-lg bg-[#E67919] px-5 sm:px-6 py-3 md:py-3.5 font-semibold text-white transition-colors hover:bg-[#0E7893]">Get in Touch</button>
            </form>
          </div>
        </motion.div>
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
