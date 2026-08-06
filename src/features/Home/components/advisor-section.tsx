import Image from "next/image";

export function AdvisorSection() {
  return (
    <section className="bg-[var(--sand)] px-5 py-14 md:px-7 md:py-20" id="advisor">
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-10 lg:grid-cols-[454px_minmax(0,1fr)] lg:gap-14">
        <div className="relative overflow-hidden rounded-[10px]">
          <div className="relative aspect-[0.8/1] min-h-[420px] bg-[#d9d1c5]">
            <Image
              fill
              src="/images/imagereader.webp"
              alt="Zachary Akers"
              className="object-cover"
            />
          </div>
          {/* <div className="absolute bottom-4 left-4 bg-[rgba(22,30,48,0.92)] px-4 py-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white">3× Olympian</span>
          </div> */}
        </div>

        <div className="flex flex-col justify-between pt-1">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-6 bg-[#c2a36a]" />
              <span className="text-[10px] uppercase tracking-[0.34em] text-[#8f96ab]">
                A Different Kind of Advisor
              </span>
            </div>

            <h2
              className="m-0 text-[42px] font-normal leading-[1.02] tracking-[-0.03em] text-[#182235] md:text-[60px]"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              Zachary Akers
            </h2>

            <p className="mt-3 text-[13px] uppercase tracking-[0.26em] text-[#7c8498]">
              MR Luxury Group · ONE Sotheby&apos;s International Realty
            </p>

            <p
              className="mt-8 max-w-[32rem] text-[16px] leading-[1.72] text-[#2d3550]"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
Zach, is a veteran of 14 years in the real estate industry working both in sales, as well as luxury new-construction and development. Zach is adept at understanding the relationship between investment and emotional connection to your property. With vast experience working with homeowners from all walks of life and backgrounds, he understands that no home buyer or seller is the same, but they all want results. Zach will help you purchase or sell your property seamlessly and with integrity.
            </p>
          </div>

          <div className="mt-10">
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-6 bg-[#c2a36a]" />
              <span className="text-[10px] uppercase tracking-[0.34em] text-[#8f96ab]">
                MR Luxury Group
              </span>
            </div>

            <div className="grid grid-cols-1 border-y border-[#ddd8cd] py-7 sm:grid-cols-3">
              <div className="px-4 text-center sm:border-r sm:border-[#ddd8cd]">
                <strong
                  className="block text-[28px] font-normal leading-none text-[#182235]"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                >
                  $1B+
                </strong>
                <span className="mt-2 block text-[12px] uppercase tracking-[0.22em] text-[#8c8376]">
                  Closed Transactions
                </span>
              </div>

              <div className="px-4 pt-6 text-center sm:border-r sm:border-[#ddd8cd] sm:pt-0">
                <strong
                  className="block text-[28px] font-normal leading-none text-[#182235]"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                >
                  $225M+
                </strong>
                <span className="mt-2 block text-[12px] uppercase tracking-[0.22em] text-[#8c8376]">
                  Sold Off-Market
                </span>
              </div>

              <div className="px-4 pt-6 text-center sm:pt-0">
                <strong
                  className="block text-[28px] font-normal leading-none text-[#182235]"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                >
                  2026
                </strong>
                <span className="mt-2 block text-[12px] uppercase tracking-[0.22em] text-[#8c8376]">
                  Top Producers ONE Sotheby&apos;s
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-b border-[#ddd8cd] py-4 text-[14px] text-[#182235] sm:flex-row sm:items-center sm:gap-8">
              <a
                href="tel:7864758134"
                className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-[#b89354]"
              >
                <span className="text-[#b89354]">◌</span>
                786.475.8134
              </a>
              <a
                href="mailto:brett@frasermiami.com"
                className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-[#b89354]"
              >
                <span className="text-[#b89354]">✉</span>
                brett@frasermiami.com
              </a>
            </div>

            <a
              href="#contact"
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center bg-[#bb9751] px-6 py-4 text-center text-[11px] uppercase tracking-[0.34em] text-white transition-colors duration-200 hover:bg-[#a88543] focus:outline-none"
            >
              Connect With Brett
            </a>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-6 text-[#6e7482] sm:justify-end">
              <Image
                src="/images/logo.png"
                alt="Miami New Development"
                width={220}
                height={58}
                className="h-auto w-[180px] opacity-75"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
