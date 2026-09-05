export interface InquiryPayload {
  name?: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  pageUrl?: string;
  details?: Record<string, unknown>;
}

export async function submitInquiry(payload: InquiryPayload) {
  const res = await fetch("/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      pageUrl: payload.pageUrl || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success !== true) {
    throw new Error(data.error || "Submission failed. Please try again.");
  }

  return data;
}