import Link from "next/link";
import { redirect } from "next/navigation";
import { memberLogout } from "@/app/member-actions";
import { db } from "@/lib/db";
import { LOGO_SRC, SHOW_SITE_NAME_WITH_LOGO, SITE_NAME } from "@/lib/config";
import { getMemberId } from "@/lib/members";
import { isAdmin } from "@/lib/session";

export async function Header() {
  // If someone's access was removed, sign them out the next time a page loads
  const memberId = await getMemberId();
  let unread = 0;
  if (memberId && !(await isAdmin())) {
    const row = await db.joinRequest.findUnique({ where: { id: memberId }, select: { status: true } });
    if (row?.status !== "APPROVED") redirect("/members/revoked");
    unread = await db.conversation.count({
      where: { OR: [{ buyerId: memberId, buyerUnread: true }, { sellerId: memberId, sellerUnread: true }] },
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt={SHOW_SITE_NAME_WITH_LOGO ? "" : SITE_NAME} className="h-11 w-auto" />
          {SHOW_SITE_NAME_WITH_LOGO && (
            <span className="font-display text-xl font-extrabold tracking-tight text-brand">{SITE_NAME}</span>
          )}
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link href="/" className="btn text-ink hover:bg-paper">
            For sale
          </Link>
          <Link href="/housing" className="btn text-ink hover:bg-paper">
            Housing
          </Link>
          {memberId && (
            <Link href="/messages" className="btn text-ink hover:bg-paper">
              Messages{unread > 0 ? ` (${unread})` : ""}
            </Link>
          )}
          <Link href="/account" className="btn text-ink hover:bg-paper">
            My account
          </Link>
          <Link href="/sell" className="btn-primary">
            Post a listing
          </Link>
          {!memberId && (
            <>
              <Link href="/login" className="btn text-ink hover:bg-paper">
                Log in
              </Link>
              <Link href="/signup" className="btn text-ink hover:bg-paper">
                Sign up
              </Link>
            </>
          )}
          {memberId && (
            <form action={memberLogout}>
              <button className="btn text-ink hover:bg-paper">Log out</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
