import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { codeMatches } from "@/lib/members";

export const dynamic = "force-dynamic";

// The personal link shows an applicant where their request stands, and lets an approved member choose a password.
// Once a password exists the link no longer signs anyone in: they log in with their number and password.
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

  return NextResponse.redirect(new URL("/login?link=1", request.url));
}
