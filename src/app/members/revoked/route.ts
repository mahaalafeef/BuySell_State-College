import { NextResponse } from "next/server";
import { MEMBER_COOKIE } from "@/lib/members";

export const dynamic = "force-dynamic";

// Used when someone's access has been removed: clears their cookie and sends them to the members page.
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/members", request.url));
  res.cookies.delete(MEMBER_COOKIE);
  return res;
}
