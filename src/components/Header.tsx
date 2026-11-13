import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link href="/" className="font-display text-xl font-bold text-brand">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/manage" className="btn text-ink hover:bg-paper">
            My listings
          </Link>
          <Link href="/sell" className="btn-primary">
            Sell an item
          </Link>
        </nav>
      </div>
    </header>
  );
}
