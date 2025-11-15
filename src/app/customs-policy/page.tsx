"use client";
import Link from "next/link";
import Image from "next/image";
import { TfiPackage } from "react-icons/tfi";
import { motion } from "framer-motion";

export default function CustomsPolicyPage() {
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
              Customs Policies
            </h1>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-white/90">
              <Link href="/" className="hover:underline text-sm md:text-xl">
                Home
              </Link>
              <span className="text-sm md:text-xl text-[#E67919]">›</span>
              <span className="text-sm md:text-xl">Customs Policies</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 md:py-12">
        <div className="space-y-6">
          {/* Label */}
          <div className="flex items-center gap-2 text-gray-700">
            <Image
              src="/question.svg"
              alt="Important"
              width={22}
              height={22}
              className="h-10 w-10"
            />
            <span className="text-base md:text-lg font-semibold">
              Important
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900">
            All You Need To Know
          </h2>

          {/* Points */}
          <ul className="list-disc pl-6 space-y-2 text-gray-700 text-base md:text-lg leading-relaxed">
            <li>
              Personal imports with a FOB (free on Board) value of{" "}
              <span className="font-bold">US$100</span> or less will not be
              subject to import duties, however for items that exceed{" "}
              <span className="font-bold">US$100</span>, duties will be applied.
            </li>
            <li>
              Goods imported for commercial use will be subject to import
              charge, regardless of the FOB value.
            </li>
          </ul>

          {/* Highlighted card with right-to-left entrance */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="block w-fit rounded-xl bg-orange-100 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-orange-400 border-[3px] text-[#E67919] ring-1 ring-orange-100">
                  {/* simple box icon */}
                  <TfiPackage className="h-5 w-5 md:h-6 md:w-6 font-bold" />
                </span>
                <span className="text-sm sm:text-base md:text-xl font-semibold text-gray-900">
                  Importing Restricted Items into Jamaica
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 md:py-10">
        <div className="space-y-5 md:space-y-6 text-gray-700">
          <p className="text-base md:text-lg leading-relaxed break-words">
            As Christmas approaches, Jamaicans and visitors travelling from
            overseas may wish to import items in celebration of the season, such
            as uncooked ham/turkey, fire crackers, fireworks, pyrotechnics, toy
            guns, or alcohol (in excess of the stipulated allowance), all of
            which are categorized as restricted items.
          </p>

          <h3 className="text-lg md:text-xl font-extrabold text-gray-900">
            So what are restricted items?
          </h3>
          <p className="text-base md:text-lg leading-relaxed">
            Restricted items are those goods which require a permit or license
            in order to be imported into Jamaica. Failure to comply with this
            stipulation will result in the passenger or importer being breached,
            for contravening the Customs Act. It is therefore important that the
            requisite permits or licenses must be sought before the items are
            imported into Jamaica.
          </p>

          <p className="text-base md:text-lg font-semibold text-gray-900">
            Here are some frequently asked questions (FAQs):
          </p>

          <ol className="list-decimal pl-5 sm:pl-6 space-y-4 text-gray-800">
            <li>
              <div className="font-semibold">
                I wish to import ham for Christmas, may I do so?
              </div>
              <p className="mt-1 text-gray-900">
                Response: The importations of meats require a permit from the
                Ministry of Agriculture.
              </p>
            </li>
            <li>
              <div className="font-semibold">
                Can Red Kidney Beans be imported without a permit?
              </div>
              <p className="mt-1 text-gray-900">
                No. Red Kidney Beans require a permit from our Ministry of
                Agriculture.
              </p>
            </li>
            <li>
              <div className="font-semibold">
                My children wish to travel with their toy guns, are these
                allowed?
              </div>
              <p className="mt-1 text-gray-900">
                Toy guns are restricted, as they are deemed as a threat and can
                be used for illicit purposes. The requisite permit is needed for
                importing these items.
              </p>
            </li>
            <li>
              <div className="font-semibold">
                Can camouflage (military) clothing be imported?
              </div>
              <p className="mt-1 text-gray-900">
                This gear is for military purpose or use only. It will be deemed
                as an impersonation or a threat, if civilians are caught wearing
                this type of clothing.
              </p>
            </li>
            <li>
              <div className="font-semibold">
                Do I need a permit to import the remains of my deceased
                relative?
              </div>
              <p className="mt-1 text-gray-900">
                A permit is required for the importation of all human remains
                (corpse or ashes).
              </p>
            </li>
            <li>
              <div className="font-semibold">
                Are fruits and vegetables restricted?
              </div>
              <p className="mt-1 text-gray-900">
                These items are restricted, in order to prevent the importation
                of pests or plant diseases. The requisite permit is needed from
                the Ministry of Health, before they can be imported.
              </p>
            </li>
          </ol>
          <h3 className="text-base mb-2 md:text-lg font-bold text-gray-900">
            List of Restricted Items:
          </h3>
          <p className="text-gray-900 text-sm md:text-base leading-relaxed break-words">
            Some passengers and importers are unaware of the various permits
            that are required for importing certain items. The following list
            stipulates the items that are restricted. This list is subject to
            change, as items are added and removed as the Government of Jamaica
            dictates.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 md:py-10">
        <div className="space-y-4 md:space-y-5">
          <div className="text-gray-900 text-sm md:text-base">
            <div className="font-bold mb-1">Glossary:</div>
            <div>MOA – Ministry of Agriculture</div>
            <div>MOH – Ministry of Health</div>
            <div>MNS – Ministry of National Security</div>
            <div>PRAD – Pharmaceutical Regulatory Affairs Division</div>
            <div>KSHA – Kingston & St. Andrew Health Department</div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[920px] sm:min-w-full bg-white border border-gray-200 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left text-gray-900 text-xs sm:text-sm md:text-base font-bold px-4 sm:px-5 md:px-6 py-3 md:py-4 border-b border-gray-200 border-r last:border-r-0">
                      Restricted Items
                    </th>
                    <th className="text-left text-gray-900 text-xs sm:text-sm md:text-base font-bold px-4 sm:px-5 md:px-6 py-3 md:py-4 border-b border-gray-200 border-r last:border-r-0">
                      Requirement
                    </th>
                    <th className="text-left text-gray-900 text-xs sm:text-sm md:text-base font-bold px-4 sm:px-5 md:px-6 py-3 md:py-4 border-b border-gray-200 border-r last:border-r-0">
                      Issuing Agency
                    </th>
                    <th className="text-left text-gray-900 text-xs sm:text-sm md:text-base font-bold px-4 sm:px-5 md:px-6 py-3 md:py-4 border-b border-gray-200">
                      Telephone
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-4 sm:px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top break-words whitespace-pre-line">
                      Meat/Animals
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top break-words whitespace-pre-line">
                      Permit/Certificate
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top break-words whitespace-pre-line">
                      MOA
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 md:py-5 align-top break-words whitespace-pre-line">
                      977-0637
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Red Peas
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Permit / Phyto Sanitary Certificate
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      MOA
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      977-0637
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Fruits, Vegetables, Plants & Plant <br />
                      Products, Honey, Seeds, Cut Flowers, Onions
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Phyto Sanitary Certificate / Permit
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      MOA
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      977-0637
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Ground Provision
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Phyto Sanitary Certificate /Permit{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      MOA
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      633-7433
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Pharmaceuticals, Chemicals, Herbal Teas
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      PSD Certificate
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      PRAD/MOH
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      633-7120
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Firearms, and <br />
                      Accessories Explosives, Fireworks, Sword{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Permit/License to Import
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      MNS/Trade Board
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      906-4908 <br /> 967-0507
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Sugar{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      License{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Trade Board
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      967-0507
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Coconut <br /> Derivatives – Oil Producing Seeds, Edible
                      Oils, Soaps
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Permit{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Coconut Industry Board
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      926-1770
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Motor Vehicles
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      License{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Trade Board
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      967-0507
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Alcohol in Bulk
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Spirit Pool Permit
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Spirit Pool
                      <br />
                      Association Ltd.
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      968-4455
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Human Remains
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      KSAH Permit
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Kingston & St.
                      <br />
                      Andrew Health Dept.
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      926-1550-2
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Pesticides{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Permit{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Pesticides Control Authority
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      633-7770/2
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Milk Powder
                      <br />
                      Milk Based
                      <br />
                      Products{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      License/Permit
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      MOA
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      977-0637
                    </td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td className="px-5 md:px-6 py-4 md:py-5 text-gray-900 border-r border-gray-200 align-top">
                      Radios (Two-Way)
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      License/Approval
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 border-r border-gray-200 align-top">
                      Spectrum <br />
                      Management <br />
                      Authority{" "}
                    </td>
                    <td className="px-5 md:px-6 py-4 md:py-5 align-top">
                      967-7948
                    </td>
                  </tr>
                </tbody>
              </table>
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
