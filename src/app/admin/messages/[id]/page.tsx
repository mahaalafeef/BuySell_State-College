import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConfirmButton } from "@/components/ConfirmButton";
import { banMember } from "@/app/join-actions";
import { clearConversationFlag, deleteConversation, setMessageHidden } from "@/app/message-actions";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

function show(whatsapp: string) {
  return /^\d+$/.test(whatsapp) ? `+${whatsapp}` : `@${whatsapp}`;
}

export default async function AdminThread({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;

  const convo = await db.conversation.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, whatsapp: true, email: true, status: true } },
      seller: { select: { id: true, name: true, whatsapp: true, email: true, status: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
    },
  });
  if (!convo) notFound();

  const people = [
    { label: "Buyer", p: convo.buyer },
    { label: "Seller", p: convo.seller },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AutoRefresh seconds={10} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/messages" className="text-sm underline">
            All conversations
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{convo.listingTitle}</h1>
          {convo.listingId && (
            <Link href={`/listings/${convo.listingId}`} className="text-sm underline">
              Open the listing
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {convo.flaggedAt && (
            <form action={clearConversationFlag.bind(null, convo.id)}>
              <button className="btn-ghost">Mark as checked</button>
            </form>
          )}
          <form action={deleteConversation.bind(null, convo.id)}>
            <ConfirmButton message="Delete this whole conversation? This can't be undone." className="btn-danger">
              Delete conversation
            </ConfirmButton>
          </form>
        </div>
      </div>

      {convo.reportedAt && (
        <p className="rounded-lg bg-danger/10 p-3 text-danger">Reported by a member: {convo.reportReason}</p>
      )}
      {convo.flaggedAt && !convo.reportedAt && (
        <p className="rounded-lg bg-amber-100 p-3 text-amber-900">
          A message used a word that often appears in scams. Take a look, then press &ldquo;Mark as checked&rdquo;.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {people.map(({ label, p }) => (
          <div key={p.id} className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-muted">{show(p.whatsapp)}</p>
            {p.email && <p className="text-sm text-muted">{p.email}</p>}
            {p.status === "APPROVED" ? (
              <form action={banMember.bind(null, p.id)} className="mt-3 flex flex-wrap gap-2">
                <input name="reason" placeholder="Reason (only you see this)" aria-label={`Reason for banning ${p.name}`} className="input w-48" />
                <ConfirmButton
                  message={`Ban ${p.name}? They will be logged out and all their live listings will be hidden.`}
                  className="btn-danger"
                >
                  Ban
                </ConfirmButton>
              </form>
            ) : (
              <p className="mt-2 text-sm font-semibold text-danger">{p.status === "BANNED" ? "Banned" : "Not an active member"}</p>
            )}
          </div>
        ))}
      </section>

      <ul className="space-y-3" aria-label="Messages">
        {convo.messages.length === 0 && <li className="text-muted">No messages yet.</li>}
        {convo.messages.map((m) => {
          const fromBuyer = m.senderId === convo.buyerId;
          const sender = fromBuyer ? convo.buyer : convo.seller;
          return (
            <li key={m.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  <strong>{sender.name}</strong> <span className="text-muted">({fromBuyer ? "buyer" : "seller"})</span>
                </p>
                <p className="text-muted">{formatPosted(m.createdAt, true)}</p>
              </div>
              <p className={`mt-2 whitespace-pre-wrap break-words ${m.hidden ? "text-muted line-through" : ""}`}>{m.body}</p>
              <form action={setMessageHidden.bind(null, m.id, !m.hidden)} className="mt-2">
                <button className="text-sm underline">{m.hidden ? "Show this message again" : "Hide this message from members"}</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
