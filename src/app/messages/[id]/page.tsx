import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { reportConversation, sendMessage } from "@/app/message-actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MessageForm } from "@/components/MessageForm";
import { ReportForm } from "@/components/ReportForm";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { displayName } from "@/lib/reviews";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const convo = await db.conversation.findUnique({
    where: { id },
    include: {
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 300 },
    },
  });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) notFound();

  const iAmBuyer = convo.buyerId === me.id;
  const other = iAmBuyer ? convo.seller : convo.buyer;

  // Opening the conversation marks it as read
  if ((iAmBuyer ? convo.buyerUnread : convo.sellerUnread) > 0) {
    await db.conversation.update({ where: { id }, data: iAmBuyer ? { buyerUnread: 0 } : { sellerUnread: 0 } });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <AutoRefresh seconds={10} />
      <div>
        <Link href="/messages" className="text-sm underline">
          All messages
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{displayName(other.name)}</h1>
        <p className="text-muted">
          About{" "}
          {convo.listingId ? (
            <Link href={`/listings/${convo.listingId}`} className="underline">
              {convo.listingTitle}
            </Link>
          ) : (
            <>{convo.listingTitle} (listing removed)</>
          )}
        </p>
      </div>

      <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
        Messages on this site can be read by the site admin to keep members safe. Never send passwords, codes or payment
        details, never pay before you have seen the item, and meet in a public place.
      </p>

      <ul className="space-y-3" aria-label="Messages">
        {convo.messages.length === 0 && <li className="text-muted">No messages yet. Say hello!</li>}
        {convo.messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  mine ? "bg-brand text-white" : "border border-line bg-white"
                }`}
              >
                {m.hidden ? (
                  <p className="italic opacity-80">Message removed by the admin</p>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
                <p className={`mt-1 text-xs ${mine ? "text-white/80" : "text-muted"}`}>
                  {mine ? "You" : displayName(other.name)} · {formatPosted(m.createdAt, true)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <MessageForm action={sendMessage.bind(null, id)} />
      <ReportForm action={reportConversation.bind(null, id)} />
    </div>
  );
}
