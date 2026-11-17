import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { codeMatches } from "@/lib/members";

export const metadata: Metadata = { title: "Your request" };
export const dynamic = "force-dynamic";

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ m?: string; c?: string }> }) {
  const { m, c } = await searchParams;
  if (!m || !c || !codeMatches(m, c)) redirect("/members?invalid=1");

  const row = await db.joinRequest.findUnique({
    where: { id: m },
    select: { name: true, status: true, passwordHash: true, decidedNote: true },
  });
  if (!row) redirect("/members?invalid=1");

  const q = `m=${encodeURIComponent(m)}&c=${encodeURIComponent(c)}`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl font-bold">Hi {row.name}</h1>

      {row.status === "PENDING" && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <p className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            Waiting for review
          </p>
          <p>
            We&rsquo;re checking your request. Bookmark this page and come back later. When you&rsquo;re approved, this
            page will show a button to choose your password.
          </p>
        </section>
      )}

      {row.status === "APPROVED" && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <p className="inline-block rounded-full bg-ok/10 px-3 py-1 text-sm font-semibold text-ok">You&rsquo;re approved</p>
          {row.passwordHash ? (
            <>
              <p>Your password is already set. Log in with your WhatsApp number and password.</p>
              <Link href="/login" className="btn-primary">
                Log in
              </Link>
            </>
          ) : (
            <>
              <p>Welcome! Choose a password to enter. After that, you can log in any time with your WhatsApp number.</p>
              <Link href={`/members/setup?${q}`} className="btn-primary">
                Choose my password
              </Link>
            </>
          )}
        </section>
      )}

      {row.status === "BANNED" && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <p className="inline-block rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
            Account not active
          </p>
          <p>This account has been removed from the site. If you think this is a mistake, please contact the site team.</p>
        </section>
      )}

      {row.status === "REJECTED" && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <p className="inline-block rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
            Not approved
          </p>
          <p>
            We couldn&rsquo;t approve this request
            {row.decidedNote && row.decidedNote !== "Access removed" ? `: ${row.decidedNote}` : "."}
          </p>
          <Link href="/join" className="btn-ghost">
            Send a new request
          </Link>
        </section>
      )}
    </div>
  );
}
