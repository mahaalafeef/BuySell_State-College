import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Members only" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const { invalid } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHero title="Members only" subtitle={`${SITE_NAME} is for people connected to Penn State or living in State College.`}>
        <Link href="/join" className="btn bg-white text-brand hover:bg-white/90">
          Request to join
        </Link>
      </PageHero>

      {invalid && (
        <p role="alert" className="rounded-xl bg-danger/10 p-4 text-danger">
          That link didn&rsquo;t work. It may be wrong or expired. Ask the admin to send you a new one.
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="text-xl font-bold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Tap &ldquo;Request to join&rdquo; and send your WhatsApp number with a photo showing your connection.</li>
          <li>We review it and message you on WhatsApp.</li>
          <li>You get a personal link. Open it once on your phone and the site stays open for you.</li>
        </ol>
        <p className="text-sm text-muted">Already approved? Open the personal link we sent you on WhatsApp.</p>
      </section>
    </div>
  );
}
