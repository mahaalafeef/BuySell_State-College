import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { view } = await searchParams;
  const showAll = view === "all";

  const [convos, nAttention, nAll] = await Promise.all([
    db.conversation.findMany({
      where: showAll ? {} : { flaggedAt: { not: null } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
      },
    }),
    db.conversation.count({ where: { flaggedAt: { not: null } } }),
    db.conversation.count(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AutoRefresh seconds={20} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Messages between members</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>

      <nav aria-label="Message lists" className="flex flex-wrap gap-2">
        <Link href="/admin/messages" aria-current={!showAll ? "page" : undefined} className={!showAll ? "btn-primary" : "btn-ghost"}>
          Needs a look ({nAttention})
        </Link>
        <Link href="/admin/messages?view=all" aria-current={showAll ? "page" : undefined} className={showAll ? "btn-primary" : "btn-ghost"}>
          Everything ({nAll})
        </Link>
      </nav>

      <p className="text-sm text-muted">
        You can read every conversation. A conversation lands in &ldquo;Needs a look&rdquo; when a member reports it or a
        message uses a word that often appears in scams (gift cards, wire transfers, crypto, and so on). Members are told
        on every page that the admin can read messages.
      </p>

      {convos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          {showAll ? "No conversations yet." : "Nothing needs a look."}
        </p>
      ) : (
        <ul className="space-y-3">
          {convos.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/messages/${c.id}`} className="block rounded-xl border border-line bg-white p-4 hover:border-brand">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.listingTitle}</p>
                    <p className="text-sm text-muted">
                      {c.buyer.name} (buyer) and {c.seller.name} (seller) · {c._count.messages}{" "}
                      {c._count.messages === 1 ? "message" : "messages"}
                    </p>
                    <p className="mt-1 truncate text-sm">{c.messages[0]?.body ?? "No messages yet"}</p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{formatPosted(c.lastMessageAt, true)}</p>
                    {c.reportedAt && <p className="mt-1 font-bold text-danger">Reported: {c.reportReason}</p>}
                    {c.flaggedAt && !c.reportedAt && <p className="mt-1 font-bold text-danger">Worrying word used</p>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
