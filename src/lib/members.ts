import { createHmac, timingSafeEqual } from "node:crypto";
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

/** The personal link the admin sends to an approved member. */
export function memberLink(id: string): string {
  return `${siteUrl()}/enter?m=${encodeURIComponent(id)}&c=${memberCode(id)}`;
}

export function memberToken(id: string): string {
  return signToken({ m: id }, MEMBER_DAYS * 86400);
}

export async function getMemberId(): Promise<string | null> {
  const jar = await cookies();
  return readToken<{ m?: string }>(jar.get(MEMBER_COOKIE)?.value)?.m ?? null;
}
