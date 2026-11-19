import { NextResponse, type NextRequest } from "next/server";
import { isValidToken } from "@/lib/edgeToken";

// Pages anyone can open. Everything else needs a member (or admin) sign-in cookie.
// Browsing (/, /housing, /listings) is public; seller contact details are hidden
// from non-members inside the listing page and /contact/[id] (see lib/memberAccess.ts).
const OPEN = ["/join", "/signup", "/login", "/members", "/enter", "/admin", "/api/chat", "/support/whatsapp", "/housing", "/listings", "/terms", "/privacy"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") return NextResponse.next();
  if (OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me");
  const allowed =
    (await isValidToken(req.cookies.get("mk_member")?.value, secret)) ||
    (await isValidToken(req.cookies.get("mk_admin")?.value, secret)); // the admin can browse too
  if (allowed) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Members only." }, { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = "/members";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and static files (logo, icons)
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|xml)$).*)"],
};
