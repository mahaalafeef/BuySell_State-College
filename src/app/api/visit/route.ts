import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMemberId } from "@/lib/members";
import { isAdmin } from "@/lib/session";
import { BOT, dayKey, visitorHash } from "@/lib/stats";

export const dynamic = "force-dynamic";

const none = (status = 204) => new NextResponse(null, { status });

// Called by the small tracker on each page view. It never stores an IP address or sets a cookie.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return none(403);

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT.test(userAgent)) return none();
  if (await isAdmin()) return none(); // your own visits don't count

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : "";
  if (path.startsWith("/admin") || path.startsWith("/api")) return none();

  const day = dayKey();
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const hash = visitorHash(day, ip, userAgent);
  const member = (await getMemberId()) !== null;

  try {
    let isNew = false;
    let upgraded = false; // was counted as a visitor earlier today, then logged in

    const seen = await db.visitorDay.findUnique({ where: { day_hash: { day, hash } } });
    if (!seen) {
      try {
        await db.visitorDay.create({ data: { day, hash, member } });
        isNew = true;
      } catch {
        /* another request from the same visitor got there first */
      }
    } else if (member && !seen.member) {
      await db.visitorDay.update({ where: { day_hash: { day, hash } }, data: { member: true } });
      upgraded = true;
    }

    const memberDelta = (isNew && member) || upgraded ? 1 : 0;
    await db.dailyStat.upsert({
      where: { day },
      create: { day, views: 1, visitors: isNew ? 1 : 0, memberVisitors: memberDelta },
      update: {
        views: { increment: 1 },
        visitors: { increment: isNew ? 1 : 0 },
        memberVisitors: { increment: memberDelta },
      },
    });

    // Keep the table tiny: the daily codes are only needed for today
    if (Math.random() < 0.02) {
      await db.visitorDay.deleteMany({ where: { day: { lt: dayKey(new Date(Date.now() - 2 * 86_400_000)) } } });
    }
  } catch (err) {
    console.error("Visit count failed:", err); // counting must never get in a visitor's way
  }
  return none();
}
