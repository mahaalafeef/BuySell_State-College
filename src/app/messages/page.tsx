import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { MESSAGE_NOTICE } from "@/lib/messages";
import { displayName } from "@/lib/reviews";

export const metadata: Metadata = { title: "My messages" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const convos = await db.conversation.findMany({
    where: { OR: [{ buyerId: me.id }, { sellerId: me.id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderId: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AutoRefresh seconds={30} />
      <div>
        <h1 className="text-3xl font-bold">My messages</h1>
        <p className="mt-2 text-sm text-muted">{MESSAGE_NOTICE}</p>
      </div>

      {convos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No messages yet. Open a listing and tap &ldquo;Send message&rdquo; to contact a seller.
        </p>
      ) : (
        <ul className="space-y-3">
          {convos.map((c) => {
            const iAmBuyer = c.buyerId === me.id;
            const other = displayName(iAmBuyer ? c.seller.name : c.buyer.name);
            const unread = iAmBuyer ? c.buyerUnread : c.sellerUnread;
            const last = c.messages[0];
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="block rounded-xl border border-line bg-white p-4 hover:bg-paper"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">
                      {unread && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-danger align-middle" aria-label="Unread" />}
                      {other}
                      <span className="font-normal text-muted"> · {iAmBuyer ? "you are buying" : "you are selling"}</span>
                    </p>
                    <p className="shrink-0 text-xs text-muted">{formatPosted(c.lastMessageAt, true)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">About: {c.listingTitle}</p>
                  {last && (
                    <p className="mt-1 line-clamp-2 break-words text-sm">
                      {last.senderId === me.id ? "You: " : ""}
                      {last.body}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
