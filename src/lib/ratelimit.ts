import { createHash } from "node:crypto";
import { db } from "./db";

/** A one-way hash of the visitor's IP address (we never store the address itself). */
export function ipHash(headers: { get(name: string): string | null }): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET ?? "dev"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Returns "ip" or "daily" if a limit is reached, otherwise null. */
export async function checkLimit(
  kind: "chat" | "support",
  hash: string,
  perHour: number,
  dailyCap?: number,
): Promise<"ip" | "daily" | null> {
  const perIp = await db.chatEvent.count({
    where: { kind, ipHash: hash, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (perIp >= perHour) return "ip";

  if (dailyCap) {
    const today = await db.chatEvent.count({
      where: { kind, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (today >= dailyCap) return "daily";
  }
  return null;
}

export async function recordEvent(kind: "chat" | "support", hash: string) {
  await db.chatEvent.create({ data: { kind, ipHash: hash } });
  // keep the table small
  await db.chatEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } } });
}
