import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeMatches, MEMBER_COOKIE, MEMBER_DAYS, memberToken } from "@/lib/members";

export const dynamic = "force-dynamic";

// Opens the site for an approved member who uses their personal link.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("m") ?? "";
  const code = url.searchParams.get("c") ?? "";
  const fail = NextResponse.redirect(new URL("/members?invalid=1", request.url));

  if (!id || !code || !codeMatches(id, code)) return fail;
  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true, passwordHash: true } });
  if (!row) return fail;

  // Not approved (yet): show where their request stands
  if (row.status !== "APPROVED") {
    return NextResponse.redirect(new URL(`/members/status?m=${encodeURIComponent(id)}&c=${encodeURIComponent(code)}`, request.url));
  }

  // First visit: let them choose a password
  if (!row.passwordHash) {
    return NextResponse.redirect(new URL(`/members/setup?m=${encodeURIComponent(id)}&c=${encodeURIComponent(code)}`, request.url));
  }

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(MEMBER_COOKIE, memberToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_DAYS * 86400,
  });
  return res;
}
