import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { SITE_NAME } from "@/lib/config";
import { getRequestId, memberPath } from "@/lib/members";

export const metadata: Metadata = { title: "Members only" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;
  const requestId = await getRequestId();

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

      {requestId && (
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
          <li>Tap &ldquo;Request to join&rdquo; and send your WhatsApp number with a photo showing your connection.</li>
          <li>We review it and message you on WhatsApp.</li>
          <li>You get a personal link. Open it once to choose a password.</li>
          <li>After that, log in any time with your WhatsApp number and password.</li>
        </ol>
        <p className="text-sm text-muted">Already approved? Use &ldquo;Member log in&rdquo;. First time? Open the personal link we sent you on WhatsApp.</p>
      </section>
    </div>
  );
}
