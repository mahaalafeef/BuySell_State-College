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
          <Link href="/signup" className="btn bg-white text-brand hover:bg-white/90">
            Create account
          </Link>
          <Link href="/login" className="btn border border-white/40 text-white hover:bg-white/10">
            Member log in
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
          <li>Tap &ldquo;Create account&rdquo; and enter your name, your email and a password.</li>
          <li>You are signed in right away. There is nothing to wait for.</li>
          <li>Next time, log in with your email and password.</li>
        </ol>
        <p className="text-sm text-muted">
          Joined earlier through WhatsApp? Use &ldquo;Member log in&rdquo; with your WhatsApp number, or open the personal link we sent you.
        </p>
      </section>
    </div>
  );
}
