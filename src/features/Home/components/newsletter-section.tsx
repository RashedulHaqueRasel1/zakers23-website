import Link from "next/link";

export function NewsletterSection() {
  return (
    <section className="bg-[var(--sand)]" id="contact">
      <div className="bg-[#0a0a0a] px-5 py-12 md:px-8 lg:px-12 xl:px-[360px]">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[640px]">
            <span className="mb-4 inline-block text-[10px] uppercase tracking-[0.34em] text-[#b89354]">
              Owners &amp; Investors
            </span>
            <h2
              className="m-0 text-[34px] font-normal leading-[1.12] tracking-[-0.025em] text-[#d7b77d] md:text-[46px]"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              Selling or assigning your unit?
            </h2>
            <p className="mt-4 max-w-[620px] text-[15px] leading-[1.65] text-[#acb0ba] md:text-[16px]">
              A valuation based on comparable closings, active inventory, and assignment
              activity in your building or neighborhood.
            </p>
          </div>

          <Link
            href="/find-my-project"
            className="inline-flex min-h-11 items-center justify-center border border-[#a87b31] px-8 py-4 text-[11px] uppercase tracking-[0.32em] !text-[#a87b31] transition-colors duration-200 hover:bg-[#b89354] hover:text-white focus:outline-none md:px-11"
          >
            List Your Property
          </Link>
        </div>
      </div>
    </section>
  );
}
