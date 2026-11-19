import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readToken, signToken } from "./security";

export const MEMBER_COOKIE = "mk_member";
export const MEMBER_DAYS = 90;

function secretKey(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return "dev-only-secret-change-me";
}

/** A personal code for one approved request. Nothing extra is stored: it is calculated from the request id. */
export function memberCode(id: string): string {
  return createHmac("sha256", secretKey()).update(`member:${id}`).digest("base64url").slice(0, 22);
}

export function codeMatches(id: string, code: string): boolean {
  const a = Buffer.from(memberCode(id));
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** A short fingerprint of the current password, so a reset link stops working once the password has changed. */
function passwordFingerprint(passwordHash: string | null): string {
  return createHash("sha256").update(passwordHash ?? "none").digest("base64url").slice(0, 16);
}

/** A one-hour link that lets a member choose a new password. It can only be used once. */
export function resetLink(id: string, passwordHash: string | null): string {
  const t = signToken({ r: id, f: passwordFingerprint(passwordHash) }, 3600);
  return `${siteUrl()}/members/reset?t=${encodeURIComponent(t)}`;
}

/** Reads a reset link's token (signature and expiry are checked). Compare the fingerprint with fingerprintMatches. */
export function readResetToken(token: string | undefined): { id: string; fingerprint: string } | null {
  const d = readToken<{ r?: unknown; f?: unknown }>(token);
  return d && typeof d.r === "string" && typeof d.f === "string" ? { id: d.r, fingerprint: d.f } : null;
}

export function fingerprintMatches(passwordHash: string | null, fingerprint: string): boolean {
  const a = Buffer.from(passwordFingerprint(passwordHash));
  const b = Buffer.from(fingerprint);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The personal link the admin sends to an approved member. */
export function memberLink(id: string): string {
  return `${siteUrl()}/enter?m=${encodeURIComponent(id)}&c=${memberCode(id)}`;
}

export function memberToken(id: string): string {
  return signToken({ m: id }, MEMBER_DAYS * 86400);
}

export const REQUEST_COOKIE = "mk_request";

/** The relative personal link (also works as the applicant's status page before approval). */
export function memberPath(id: string): string {
  return `/enter?m=${encodeURIComponent(id)}&c=${memberCode(id)}`;
}

/** Remembers an applicant's request in this browser, so they can check on it later. */
export async function setRequestCookie(id: string) {
  (await cookies()).set(REQUEST_COOKIE, signToken({ r: id }, 60 * 86400), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 86400,
  });
}

export async function getRequestId(): Promise<string | null> {
  const jar = await cookies();
  return readToken<{ r?: string }>(jar.get(REQUEST_COOKIE)?.value)?.r ?? null;
}

/** Server actions only: signs a member in on this device. */
export async function setMemberCookie(id: string) {
  (await cookies()).set(MEMBER_COOKIE, memberToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_DAYS * 86400,
  });
}

export async function getMemberId(): Promise<string | null> {
  const jar = await cookies();
  return readToken<{ m?: string }>(jar.get(MEMBER_COOKIE)?.value)?.m ?? null;
}
