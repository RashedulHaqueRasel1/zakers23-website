import { NextRequest, NextResponse } from "next/server";

import { createInquiryAccess, INQUIRY_ACCESS_COOKIE, INQUIRY_ACCESS_MAX_AGE } from "../../../lib/server/inquiry-access";

const FUB_API_URL = "https://api.followupboss.com/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body) || ["name", "email", "phone", "message", "source", "pageUrl"].some(
    (key) => body[key] !== undefined && typeof body[key] !== "string"
  ) || (body.details !== undefined && !isRecord(body.details))) {
    return NextResponse.json({ error: "Invalid inquiry fields." }, { status: 400 });
  }

  const email = ((body.email as string) || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const apiKey = process.env.FOLLOWUP_BOSS_API_KEY;
  if (!apiKey) {
    console.error("Inquiry integration is missing FOLLOWUP_BOSS_API_KEY.");
    return NextResponse.json({ error: "Inquiry service is unavailable. Please try again later." }, { status: 503 });
  }

  const name = ((body.name as string) || "").trim();
  const phone = ((body.phone as string) || "").trim();
  const message = ((body.message as string) || "").trim();
  const source = ((body.source as string) || "").trim() || "Website";
  const pageUrl = ((body.pageUrl as string) || "").trim();
  const details = (body.details || {}) as Record<string, unknown>;
  const nameParts = name.split(/\s+/);
  const person = {
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" "),
    emails: [{ value: email, type: "home" }],
    ...(phone ? { phones: [{ value: phone, type: "mobile" }] } : {}),
  };

  // Keep every submitted field in the event itself. A second note request could
  // fail after the contact is created and silently lose the consultation details.
  const lines = [
    "Website consultation request",
    "",
    `Name: ${name || "Not provided"}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
  ];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined || value === "") continue;
    lines.push(`${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
  }
  lines.push("", `Message: ${message || "Not provided"}`, "", `Source: ${source}`);
  if (pageUrl) lines.push(`Page: ${pageUrl}`);

  try {
    // FUB's website-lead endpoint records the inquiry and deduplicates contacts.
    // https://docs.followupboss.com/reference/events-post
    const response = await fetch(`${FUB_API_URL}/events`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        source,
        type: "General Inquiry",
        person,
        message: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    // 204 means this source's lead flow is archived/ignored, not saved.
    if (response.status !== 200 && response.status !== 201) {
      console.error("Follow Up Boss inquiry was not accepted. Status:", response.status);
      return NextResponse.json({ error: "Your inquiry could not be saved. Please try again or contact us directly." }, { status: 502 });
    }

    const result: unknown = await response.json();
    if (!isRecord(result) || typeof result.id !== "number" || result.id <= 0) {
      console.error("Follow Up Boss returned an invalid contact response.");
      return NextResponse.json({ error: "We could not confirm your inquiry. Please contact us directly." }, { status: 502 });
    }
    const success = NextResponse.json({ success: true, id: result.id });
    success.cookies.set(INQUIRY_ACCESS_COOKIE, createInquiryAccess(result.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: INQUIRY_ACCESS_MAX_AGE,
    });
    return success;
  } catch {
    console.error("Follow Up Boss inquiry request failed or timed out.");
    return NextResponse.json({ error: "We could not confirm your inquiry. Please try again or contact us directly." }, { status: 502 });
  }
}
