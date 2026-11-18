import { createHash, createHmac } from "node:crypto";

// Visitor counting without cookies or stored IP addresses:
// each visit becomes a one-way code made from (today's secret + IP + browser). The code changes every
// day, so a person can't be followed from one day to the next, and the IP itself is never saved.

export const STATS_TZ = process.env.STATS_TIMEZONE || "America/New_York"; // days roll over at local midnight

/** "2026-11-18" in the site's time zone. */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STATS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function visitorHash(day: string, ip: string, userAgent: string): string {
  const secret = process.env.SESSION_SECRET || "dev-only-secret-change-me";
  const salt = createHmac("sha256", secret).update(`visit:${day}`).digest("hex");
  return createHash("sha256").update(`${salt}:${ip}:${userAgent}`).digest("hex").slice(0, 24);
}

/** Link previews and crawlers that shouldn't count as visitors. */
export const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse/i;
