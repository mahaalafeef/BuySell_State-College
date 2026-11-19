import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { SITE_NAME } from "@/lib/config";
import { db } from "@/lib/db";
import { getRequestId, memberPath } from "@/lib/members";

export const metadata: Metadata = { title: "Members only" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  const requestId = await getRequestId();
  // If the link was emailed, it must stay in their inbox, so it is not offered from this device
  const request = requestId ? await db.joinRequest.findUnique({ where: { id: requestId }, select: { email: true } }) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHero title="Members only" subtitle={`${SITE_NAME} is for people connected to Penn State or living in State College.`}>
        <div className="flex flex-wrap gap-2">
          <Link href="/login" className="btn bg-white text-brand hover:bg-white/90">
            Member log in
          </Link>
          <Link href="/join" className="btn border border-white/40 text-white hover:bg-white/10">
            Request to join
          </Link>
        </div>
      </PageHero>

      {invalid && (
        <p role="alert" className="rounded-xl bg-danger/10 p-4 text-danger">
          That link didn&rsquo;t work. It may be wrong or expired. Ask the admin to send you a new one.
        </p>
      )}

      {requestId && request?.email && (
        <section className="space-y-1 rounded-xl border border-line bg-white p-5">
          <p className="font-semibold">You sent a request from this device.</p>
          <p className="text-sm text-muted">
            We emailed you a link. Open it from your Gmail to check on your request.
          </p>
        </section>
      )}
      {requestId && request && !request.email && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5">
          <p className="font-semibold">You sent a request from this device.</p>
          <Link href={memberPath(requestId)} className="btn-primary">
            Check my request
          </Link>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="text-xl font-bold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Tap &ldquo;Request to join&rdquo; and send your name, Gmail address and WhatsApp number, and tell us how you are connected.</li>
          <li>We review it and email you.</li>
          <li>You get a link in your Gmail. Open it once to choose a password.</li>
          <li>After that, log in any time with your Gmail address and password.</li>
        </ol>
        <p className="text-sm text-muted">Already approved? Use &ldquo;Member log in&rdquo;. First time? Open the link we emailed you.</p>
      </section>
    </div>
  );
}
