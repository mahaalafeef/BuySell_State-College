import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <Link href="/" className="font-display text-xl font-bold text-brand">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
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
