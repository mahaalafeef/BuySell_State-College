import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import { Header } from "@/components/Header";
import { MessagesWidget } from "@/components/MessagesWidget";
import { getActiveMember } from "@/lib/memberAccess";
import { SITE_NAME, SITE_TITLE } from "@/lib/config";
import { VisitTracker } from "@/components/VisitTracker";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: "Items for sale and housing in State College and neighboring areas, listed by the people offering them.",
};

export const viewport: Viewport = { themeColor: "#2B5D8C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await getActiveMember(); // the messages pop-up is only for signed-in members
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="container-page flex-1 py-6 sm:py-8">{children}</main>
        <footer className="mt-8 border-t border-line bg-white">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-muted">
            <p>{SITE_NAME}</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-1">
              <Link href="/" className="hover:text-ink">For sale</Link>
              <Link href="/housing" className="hover:text-ink">Housing</Link>
              <Link href="/manage" className="hover:text-ink">My listings</Link>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/admin" className="hover:text-ink">Admin</Link>
            </nav>
          </div>
        </footer>
        <ChatWidget />
        {member && <MessagesWidget />}
        <VisitTracker />
      </body>
    </html>
  );
}
