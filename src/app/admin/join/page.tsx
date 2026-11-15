import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { approveJoin, deleteJoin, rejectJoin } from "@/app/join-actions";
import { SITE_NAME } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Join requests" };
export const dynamic = "force-dynamic";

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { PENDING: "To review", APPROVED: "Approved", REJECTED: "Not approved" };

function show(whatsapp: string) {
  return /^\d+$/.test(whatsapp) ? `+${whatsapp}` : `@${whatsapp}`;
}

export default async function JoinInbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { status } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(status ?? "") ? (status as Tab) : "PENDING";
  const groupLink = process.env.WHATSAPP_GROUP_LINK; // private: only used here, on the server

  const [requests, counts] = await Promise.all([
    db.joinRequest.findMany({
      where: { status: tab },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, whatsapp: true, role: true, note: true, hasProof: true, decidedNote: true, createdAt: true },
    }),
    db.joinRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: Tab) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const chat = (whatsapp: string, text?: string) =>
    `https://wa.me/${whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Join requests</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>

      {!groupLink && (
        <p className="rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          To include your group's invite link in the welcome message, add a Vercel variable named{" "}
          <code>WHATSAPP_GROUP_LINK</code> with your group link, then redeploy.
        </p>
      )}

      <nav aria-label="Request status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/join?status=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              t === tab ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand hover:text-brand"
            }`}
          >
            {LABELS[t]} ({countOf(t)})
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{r.name}</p>
                  <p className="text-sm text-muted">
                    {r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <p className="rounded-full bg-paper px-3 py-1 text-sm font-semibold">{r.role}</p>
              </div>

              <p className="mt-2">
                <span className="font-semibold">WhatsApp:</span> {show(r.whatsapp)}
              </p>
              {r.note && <p className="mt-1 whitespace-pre-wrap text-sm">{r.note}</p>}
              {r.decidedNote && <p className="mt-1 text-sm text-danger">Reason: {r.decidedNote}</p>}

              {r.hasProof ? (
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold">View proof photo</summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/admin/join/${r.id}/proof`}
                    alt={`Proof from ${r.name}`}
                    loading="lazy"
                    className="mt-2 max-h-[28rem] w-auto rounded-lg shadow"
                  />
                </details>
              ) : (
                <p className="mt-3 text-sm text-muted">Proof photo deleted after review.</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tab === "PENDING" && (
                  <>
                    <form action={approveJoin.bind(null, r.id)}>
                      <button className="btn-primary">Approve</button>
                    </form>
                    <form action={rejectJoin.bind(null, r.id)} className="flex gap-2">
                      <input name="reason" placeholder="Reason (optional)" aria-label={`Reason for rejecting ${r.name}`} className="input w-44" />
                      <button className="btn-ghost">Reject</button>
                    </form>
                    <a href={chat(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      Open WhatsApp chat
                    </a>
                  </>
                )}
                {tab === "APPROVED" && (
                  <a
                    href={chat(
                      r.whatsapp,
                      `Hi ${r.name}! You're approved to join the ${SITE_NAME} community group.${groupLink ? ` Join here: ${groupLink}` : ""}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Send invite on WhatsApp
                  </a>
                )}
                <form action={deleteJoin.bind(null, r.id)}>
                  <button className="btn-danger">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
