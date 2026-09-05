"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PropertyInquiryGate from "./PropertyInquiryGate";

const PropertyDetailPageClient = dynamic(
  () => import("./PropertyDetailPage"),
  { ssr: false }
);

export default function PropertyDetailWrapper({ slug, name, expiresAt }: { slug: string; name: string; expiresAt: number }) {
  const router = useRouter();
  const lastVisit = useRef("");
  const [sessionDeadline, setSessionDeadline] = useState(expiresAt);
  useEffect(() => setSessionDeadline(expiresAt), [expiresAt]);
  const [expiredSession, setExpiredSession] = useState<number | null>(null);

  useEffect(() => {
    const remaining = sessionDeadline - Date.now();
    if (remaining <= 0) { setExpiredSession(expiresAt); return; }
    // Browser timers cap at ~24.8 days, so recheck longer sessions periodically.
    const timer = window.setInterval(() => {
      if (Date.now() >= sessionDeadline) setExpiredSession(expiresAt);
    }, Math.min(remaining, 60000));
    return () => window.clearInterval(timer);
  }, [expiresAt, sessionDeadline]);

  useEffect(() => {
    if (Date.now() >= expiresAt) { setExpiredSession(expiresAt); return; }
    const visit = `${slug}:${expiresAt}`;
    if (lastVisit.current === visit) return;
    lastVisit.current = visit;
    // Runs on an actual page mount/navigation, not Next.js link prefetches.
    void fetch("/api/property-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).then(async (response) => {
      if (response.status === 401) { setExpiredSession(expiresAt); router.refresh(); }
      else if (!response.ok) console.error("Property inquiry could not be recorded.");
      else {
        const result = await response.json();
        if (typeof result.expiresAt === "number") setSessionDeadline(result.expiresAt);
      }
    }).catch(() => console.error("Property visit could not be recorded."));
  }, [slug, expiresAt, router]);

  if (expiredSession === expiresAt) return <PropertyInquiryGate name={name} />;
  return <PropertyDetailPageClient slug={slug} />;
}
