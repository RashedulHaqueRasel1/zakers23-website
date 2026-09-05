"use client";

import React, { useEffect, useRef, useState } from "react";
import ConsultationSelect from "./consultation-select";
import { submitInquiry } from "@/src/lib/inquiry";

type InquiryModalProps = {
  isOpen: boolean;
  context?: string;
  onClose: () => void;
  onSuccess?: () => void;
  requireForDetails?: boolean;
};

export default function InquiryModal({ isOpen, context, onClose, onSuccess, requireForDetails = false }: InquiryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea');
        if (items?.length) {
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }
      }
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;

    const data = new FormData(event.currentTarget);
    const name = (data.get("name") as string) || "";
    const email = ((data.get("email") as string) || "").trim();
    const phone = (data.get("phone") as string) || "";
    const budget = (data.get("budget") as string) || "";
    const message = (data.get("message") as string) || "";

    if (!email) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    try {
      await submitInquiry({
        name,
        email,
        phone,
        message,
        source: "Website",
        details: {
          ...(context ? { "Interested in": context } : {}),
          ...(budget ? { Budget: budget } : {}),
          ...(data.get("primaryGoal") ? { "Primary goal": String(data.get("primaryGoal")) } : {}),
          ...(data.get("timeline") ? { Timeline: String(data.get("timeline")) } : {}),
        },
      });
      setStatus("done");
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="consultation-backdrop" onClick={onClose} role="presentation" data-lenis-prevent>
      <div ref={dialogRef} tabIndex={-1} className="consultation-modal" onClick={(event) => event.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title" aria-describedby="inquiry-modal-description">
        <button type="button" className="consultation-close" onClick={onClose} aria-label="Close inquiry form">×</button>
        <span className="consultation-kicker">Private consultation</span>
        {status === "done" ? (
          <div className="consultation-success" role="status">
            <h3 id="inquiry-modal-title">Thank you for reaching out.</h3>
            <p id="inquiry-modal-description">Your request has been received. Zachary will follow up personally with tailored options.</p>
            <button type="button" className="consultation-submit" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="consultation-heading">
              <img src="/images/imagereader.webp" alt="Zachary Akers" className="consultation-avatar" />
              <h3 id="inquiry-modal-title">Connect with <em>Zachary Akers</em></h3>
            </div>
            <p className="consultation-description" id="inquiry-modal-description">
              {requireForDetails
                ? "Submit your inquiry to unlock property details, pricing and floor plans. Zachary will follow up with tailored options."
                : "Share a few details about what you’re looking for and Zachary will follow up with tailored options."}
            </p>
            {context && <p className="consultation-context">Regarding: {context}</p>}
            <form className="consultation-form" onSubmit={handleSubmit}>
              <div className="consultation-fields">
                <input aria-label="Your name" type="text" name="name" autoComplete="name" placeholder="Your name" required />
                <input aria-label="Email address" type="email" name="email" autoComplete="email" placeholder="Email address" required />
                <input aria-label="Phone (optional)" type="tel" name="phone" autoComplete="tel" placeholder="Phone (optional)" />
                <ConsultationSelect name="budget" label="Price range" options={["Under $1M", "$1M to $3M", "$3M to $5M", "$5M to $10M", "$10M to $25M", "$25M to $50M", "$50M to $100M", "$100M and above", "Not sure yet"]} />
                <ConsultationSelect name="primaryGoal" label="Primary goal" options={["Primary residence", "Vacation home", "Investment / rental", "Portfolio expansion", "Selling / assigning a property", "Just exploring"]} />
                <ConsultationSelect name="timeline" label="Timeline" options={["As soon as possible", "Within 6 months", "6–12 months", "1–2 years", "2–3 years", "Flexible / just exploring"]} />
                <textarea aria-label="Message (optional)" name="message" rows={3} placeholder="Message (optional)" />
              </div>
              <button type="submit" className="consultation-submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending your request…" : requireForDetails ? "Submit inquiry & view property" : "Request a consultation"}
              </button>
              {status === "error" && <p className="consultation-error" role="alert">Something went wrong submitting your inquiry. Please try again.</p>}
            </form>
            <div className="consultation-alternatives">
              <a className="consultation-whatsapp" href="https://wa.me/17864758134" target="_blank" rel="noopener noreferrer">
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="#13d766" />
                  <path d="M6.4 17.7l.8-2.7a7 7 0 1 1 2.5 2.3l-3.3.4Z" fill="none" stroke="white" strokeWidth="1.35" />
                  <path d="M9 8.2c-.7.4-.5 2.4 1.4 4.4s3.8 2.3 4.5 1.6l.6-1.1-2-1-.7.7c-1.3-.5-2.1-1.3-2.6-2.5l.7-.7-1-1.9-.9.5Z" fill="white" />
                </svg>
                WhatsApp
              </a>
              <button type="button" className="consultation-dismiss" onClick={onClose}>Not now</button>
            </div>
          </>
        )}
        <div className="consultation-brands" aria-label="MR Luxury Group · ONE Sotheby's International Realty">
          <div className="consultation-mr"><span>MR</span><span>Luxury Group</span></div>
          <div className="consultation-sothebys"><span>ONE</span><div>Sotheby&apos;s<small>International Realty</small></div></div>
        </div>
      </div>
    </div>
  );
}
