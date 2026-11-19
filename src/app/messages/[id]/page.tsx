import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ReplyForm } from "@/components/MessageForm";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { MESSAGE_NOTICE } from "@/lib/messages";
import { displayName } from "@/lib/reviews";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const convo = await db.conversation.findUnique({
    where: { id },
    include: { buyer: { select: { id: true, name: true, status: true } }, seller: { select: { id: true, name: true, status: true } } },
  });
  // Only the two people in it can open it (the admin reads it from /admin/messages)
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) notFound();

  const iAmBuyer = convo.buyerId === me.id;
  const otherPerson = iAmBuyer ? convo.seller : convo.buyer;

  // Opening it marks it as read
  if (iAmBuyer && convo.buyerUnread) {
    await db.conversation.update({ where: { id }, data: { buyerUnread: false } });
  } else if (!iAmBuyer && convo.sellerUnread) {
    await db.conversation.update({ where: { id }, data: { sellerUnread: false } });
  }

  const latest = await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 200 });
  const messages = latest.reverse();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <AutoRefresh seconds={10} />
      <div>
        <Link href="/messages" className="text-sm underline">
          &larr; All messages
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{displayName(otherPerson.name)}</h1>
        <p className="text-sm text-muted">
          About:{" "}
          {convo.listingId ? (
            <Link href={`/listings/${convo.listingId}`} className="underline">
              {convo.listingTitle}
            </Link>
          ) : (
            <>{convo.listingTitle} (listing removed)</>
          )}
        </p>
      </div>

      <p className="rounded-lg bg-paper p-3 text-sm">{MESSAGE_NOTICE}</p>

      <ul className="space-y-3">
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "bg-brand text-white" : "border border-line bg-white"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-xs ${mine ? "text-white/70" : "text-muted"}`}>{formatPosted(m.createdAt, true)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {otherPerson.status === "APPROVED" ? (
        <ReplyForm conversationId={convo.id} />
      ) : (
        <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">This person is no longer on the site, so you can&rsquo;t reply.</p>
      )}
    </div>
  );
}
