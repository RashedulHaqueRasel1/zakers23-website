import { createHmac, timingSafeEqual } from "node:crypto";

export const INQUIRY_ACCESS_COOKIE = "inquiry-access";
export const INQUIRY_ACCESS_MAX_AGE = 60 * 60 * 24 * 365;

function secret() {
  return process.env.INQUIRY_ACCESS_SECRET || process.env.FOLLOWUP_BOSS_API_KEY;
}

export function createInquiryAccess(personId: number, now = Date.now()): string {
  const key = secret();
  if (!key || !Number.isSafeInteger(personId) || personId <= 0) throw new Error("Invalid inquiry access configuration.");
  const expires = Math.floor(now / 1000) + INQUIRY_ACCESS_MAX_AGE;
  const payload = `${personId}.${expires}`;
  return `${payload}.${createHmac("sha256", key).update(`inquiry-access:${payload}`).digest("hex")}`;
}

export function readInquiryAccess(token: string | undefined, now = Date.now()): { personId: number; expiresAt: number } | null {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const personId = Number(id);
  const expiresAt = Number(expires) * 1000;
  if (!Number.isSafeInteger(personId) || personId <= 0 || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return null;
  const expected = createHmac("sha256", key).update(`inquiry-access:${id}.${expires}`).digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) return null;
  return { personId, expiresAt };
}

export function hasInquiryAccess(token: string | undefined, now = Date.now()): boolean {
  return readInquiryAccess(token, now) !== null;
}
