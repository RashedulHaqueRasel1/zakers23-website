import { NextRequest, NextResponse } from "next/server";
import { createInquiryAccess, INQUIRY_ACCESS_MAX_AGE, INQUIRY_ACCESS_COOKIE, readInquiryAccess } from "../../../lib/server/inquiry-access";
import projects from "../../../data/miami-projects.json";

export async function POST(request: NextRequest) {
  const access = readInquiryAccess(request.cookies.get(INQUIRY_ACCESS_COOKIE)?.value);
  if (!access) return NextResponse.json({ error: "Please submit an inquiry first." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("slug" in body) || typeof body.slug !== "string") {
    return NextResponse.json({ error: "A property slug is required." }, { status: 400 });
  }
  const project = projects.find((item) => item.slug === body.slug);
  if (!project) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  const apiKey = process.env.FOLLOWUP_BOSS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Visit tracking unavailable." }, { status: 503 });

  // Use server-owned property data and the signed contact ID, never a browser-supplied person ID.
  const pageUrl = new URL(`/property/${project.slug}`, request.url).href;
  try {
    const response = await fetch("https://api.followupboss.com/v1/events", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${apiKey}:`).toString("base64"),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        source: "Website",
        type: "General Inquiry",
        person: { id: access.personId },
        message: `Automatic property inquiry — returning visitor clicked property details.
Property: ${project.name}\nNeighborhood: ${project.neighborhood}\nPrice: ${project.priceFrom}\nPage: ${pageUrl}`,
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (response.status !== 200 && response.status !== 201) {
      console.error("Follow Up Boss property visit rejected. Status:", response.status);
      return NextResponse.json({ error: "Visit could not be recorded." }, { status: 502 });
    }
    const result = await response.json();
    if (result?.id !== access.personId) {
      return NextResponse.json({ error: "Visit could not be confirmed." }, { status: 502 });
    }
    const token = createInquiryAccess(access.personId);
    const renewed = readInquiryAccess(token)!;
    const success = NextResponse.json({ success: true, expiresAt: renewed.expiresAt });
    success.cookies.set(INQUIRY_ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: INQUIRY_ACCESS_MAX_AGE,
    });
    return success;
  } catch {
    console.error("Follow Up Boss property visit failed or timed out.");
    return NextResponse.json({ error: "Visit could not be recorded." }, { status: 502 });
  }
}
