import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-[#23252d] px-5 pb-10 pt-12 md:px-8 lg:px-12 xl:px-[394px]">
      <div className="mx-auto max-w-[1125px] text-[#5f6575]">
        <div className="grid grid-cols-1 gap-10 border-b border-[rgba(91,97,111,0.3)] pb-10 md:grid-cols-[1.08fr_0.84fr_1.45fr]">
          <div>
            <Image
              src="/images/logo.png"
              alt="Miami New Development"
              width={220}
              height={58}
              className="mb-4 h-auto w-[138px]"
            />
            <div className="border-t border-[rgba(210,176,114,0.5)] pt-5 text-[14px] leading-[1.55] text-[#596071]">
              <p className="m-0">Designed, Developed, and Presented by</p>
              <p className="m-0 mt-2">Zachary Akers</p>
              <p className="m-0 mt-2">Global Real Estate Advisor</p>
              <p className="m-0 mt-2">ONE Sotheby&apos;s International Realty</p>
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-[12px] uppercase tracking-[0.32em] text-[#d2b072]">Contact</h4>
            <div className="space-y-3 text-[14px] leading-[1.45] text-[#596071]">
              <a className="block transition-colors duration-200 hover:text-[#d2b072]" href="tel:7864758134">
                786-475-8134
              </a>
              <a
                className="block transition-colors duration-200 hover:text-[#d2b072]"
                href="mailto:brett@frasermiami.com"
              >
                brett@frasermiami.com
              </a>
              <a
                className="block transition-colors duration-200 hover:text-[#d2b072]"
                href="https://www.instagram.com/frasermiami/"
              >
                IG: @frasermiami
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-[12px] uppercase tracking-[0.32em] text-[#d2b072]">Legal</h4>
            <div className="space-y-3 text-[13px] leading-[1.6] text-[#596071]">
              <p className="m-0">
                © 2026 · All rights reserved. Sotheby&apos;s International Realty® is a registered
                trademark. Each office is independently owned and operated.
              </p>
              <p className="m-0 inline-flex items-center gap-2">
                <span className="text-[#d2b072]">⌂</span>
                Equal Housing Opportunity
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 border-b border-[rgba(91,97,111,0.3)] py-6 text-[13px] leading-[1.72] text-[#4f5566] md:grid-cols-2 md:gap-12">
          <p className="m-0">
            This is not intended to solicit property already listed. Pricing, floorplans,
            finishes, amenities, square footage, delivery dates, and availability are subject
            to change without notice and are not guaranteed. Renderings are artist conceptions.
          </p>
          <p className="m-0">
            Conceptions may differ from final construction. All information is provided by
            developers and third-party sources and should be independently verified before
            making any purchasing decision.
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-5 text-[13px] leading-[1.5] md:flex-row md:items-center md:justify-between">
          <Image
            src="/images/logo.png"
            alt="Miami New Development"
            width={160}
            height={42}
            className="h-auto w-[96px] opacity-70"
          />
          <div className="flex flex-wrap items-center gap-3 text-[#6e7485]">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Data updated continuously</span>
            <span>·</span>
            <span>All figures are estimates</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
