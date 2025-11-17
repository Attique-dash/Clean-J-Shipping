"use client";
import Link from "next/link";
import Image from "next/image";
import TopHeader from "@/components/TopHeader";
export default function RatesPage() {
  return (
    <>
      <TopHeader />
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
              Rates{" "}
            </h1>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-white/90">
              <Link href="/" className="hover:underline text-sm md:text-xl">
                Home
              </Link>
              <span className="text-sm md:text-xl text-[#E67919]">›</span>
              <span className="text-sm md:text-xl">Rates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rates Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
          {/* Left: Image background with content */}
          <div className="relative overflow-hidden rounded-lg ring-1 ring-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
            <Image
              src="/images/airplane.png"
              alt="Air Freight"
              fill
              className="absolute inset-0 -z-10 object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-black/40" />
            <div className="relative flex flex-col items-center justify-center px-6 sm:px-8 md:px-10 py-8 sm:py-10 md:py-12 text-white min-h-[380px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px]">
                <h2 className="text-2xl md:text-[35px] font-bold drop-shadow-sm">
                  Air Freight Rates
                </h2>
                <p className="mt-3 max-w-2xl text-center text-base md:text-lg text-white/90 leading-relaxed">
                  At Clean J Shipping, we offer fast, reliable, and
                  cost-effective Air Freight solutions tailored to your shipping
                  needs. Whether you&apos;re sending small parcels or large
                  commercial shipments, our competitive rates and seamless
                  process ensure your cargo arrives safely and on time.
                </p>

                {/* Price pill */}
                <div className="mt-7 inline-flex items-center gap-3 rounded-full rounded-r-3xl bg-white/20 backdrop-blur-[2px] px-6 py-4 md:px-8 md:py-5">
                  <span className="text-lg md:text-xl relative bottom-2">
                    $
                  </span>
                  <span className="text-3xl md:text-[50px] font-bold">
                    {" "}
                    700
                  </span>
                  <span className="text-lg md:text-xl font-semibold relative bottom-2">
                    For the first pound (lb)
                  </span>
                </div>

                <div className="mt-6 text-lg md:text-2xl font-extrabold">
                  $350{" "}
                  <span className="text-lg md:text-2xl font-medium text-white/90">
                    for every additional pounds (lbs)
                  </span>
                </div>
            </div>
          </div>

          {/* Right: Fees and notes */}
          <div className=" p-6 sm:p-8 md:p-10">
            <div className="space-y-8">
              {/* Item 1 */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <Image src="/money.svg" alt="Customs fees" width={50} height={50} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                    Customs Fees
                  </h3>
                  <p className="mt-1 text-gray-600 text-base md:text-lg leading-relaxed">
                    Packages deemed by Customs as intended for personal use and
                    value exceed $100 USD (C.I.F) will be subject to Customs
                    duty charges.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <Image src="/coins.svg" alt="Other fees" width={50} height={50} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                    Other Fees
                  </h3>
                  <p className="mt-1 text-gray-600 text-base md:text-lg leading-relaxed">
                    Fee for packages with incorrect or missing shipping details
                    is $500 JMD. Fee for packages weighing more than 80 LBS or
                    have the dimensions exceeding 100 inches is $1000/package.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <Image src="/info.svg" alt="Important notice" width={50} height={50} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                    Important Notice
                  </h3>
                  <p className="mt-1 text-gray-600 text-base md:text-lg leading-relaxed">
                    We reserve the rights to adjust rates at any time, with or
                    without prior notice. Storage fee of $50 JMD per day/package
                    will be charged after 7 days. Any package without the
                    mailbox number present in the shipping address will be
                    charged a $500 JMD fee.
                  </p>
                </div>
              </div>
            </div>
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
