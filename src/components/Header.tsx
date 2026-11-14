import Link from "next/link";
import { LOGO_SRC, SHOW_SITE_NAME_WITH_LOGO, SITE_NAME } from "@/lib/config";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt={SHOW_SITE_NAME_WITH_LOGO ? "" : SITE_NAME} className="h-10 w-auto" />
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
          <Link href="/manage" className="btn text-ink hover:bg-paper">
            My listings
          </Link>
          <Link href="/sell" className="btn-primary">
            Post a listing
          </Link>
        </nav>
      </div>
    </header>
  );
}
