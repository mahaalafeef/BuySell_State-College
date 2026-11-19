import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { displayName } from "@/lib/reviews";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const me = await getActiveMember();
  if (!me) redirect("/members");
  const { limit } = await searchParams;

  const convos = await db.conversation.findMany({
    where: { OR: [{ buyerId: me.id }, { sellerId: me.id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, hidden: true, senderId: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AutoRefresh seconds={20} />
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="rounded-lg bg-paper p-3 text-sm">
        Messages on this site can be read by the site admin to keep members safe. Never send passwords, codes or
        payment details.
      </p>
      {limit && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          You have started a lot of conversations in the last hour. Please wait a little before starting another.
        </p>
      )}

      {convos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No messages yet. Open a listing and tap &ldquo;Message the seller&rdquo; to start a conversation.
        </p>
      ) : (
        <ul className="space-y-3">
          {convos.map((c) => {
            const iAmBuyer = c.buyerId === me.id;
            const other = iAmBuyer ? c.seller : c.buyer;
            const unread = iAmBuyer ? c.buyerUnread : c.sellerUnread;
            const last = c.messages[0];
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="block rounded-xl border border-line bg-white p-4 hover:border-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {displayName(other.name)} <span className="font-normal text-muted">about {c.listingTitle}</span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {last ? (last.hidden ? "Message removed by the admin" : `${last.senderId === me.id ? "You: " : ""}${last.body}`) : "No messages yet"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p>{formatPosted(c.lastMessageAt)}</p>
                      <p>{iAmBuyer ? "You are buying" : "You are selling"}</p>
                      {unread > 0 && (
                        <span className="mt-1 inline-block rounded-full bg-danger px-2 py-0.5 font-bold text-white">
                          {unread} new
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
