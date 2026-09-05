"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import InquiryModal from "@/src/features/inquiry/components/inquiry-modal";

export default function PropertyInquiryGate({ name }: { name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <main className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <Link href="/" className="inline-block mb-10"><img src="/images/logo.png" alt="Miami New Development" width={110} height={60} /></Link>
        <p className="consultation-kicker">Private property access</p>
        <h1 className="text-3xl text-[#1c1f26] mb-4" style={{ fontFamily: "var(--font-serif), serif" }}>{name}</h1>
        <p className="text-sm text-[#788092] leading-7">
          {submitted ? "Your inquiry has been received. Your property details are ready." : "Submit an inquiry to explore the full property details, pricing and floor plans."}
        </p>
        <button type="button" className="consultation-submit" onClick={() => submitted ? router.refresh() : setOpen(true)}>
          {submitted ? "View property details" : "Submit inquiry to view details"}
        </button>
        <Link href="/map" className="inline-block mt-6 text-xs text-[#788092] underline underline-offset-4">Back to properties</Link>
      </div>
      <InquiryModal isOpen={open} context={name} onClose={close} requireForDetails
        onSuccess={() => { setSubmitted(true); setOpen(false); router.refresh(); }} />
    </main>
  );
}
