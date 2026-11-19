import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Buyer and seller chats" };
export const dynamic = "force-dynamic";

export default async function MessagesAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { q } = await searchParams;
  const term = (q ?? "").trim().slice(0, 100);

  const [convos, total] = await Promise.all([
    db.conversation.findMany({
      where: term
        ? {
            OR: [
              { listingTitle: { contains: term, mode: "insensitive" } },
              { buyer: { name: { contains: term, mode: "insensitive" } } },
              { seller: { name: { contains: term, mode: "insensitive" } } },
              { messages: { some: { body: { contains: term, mode: "insensitive" } } } },
            ],
          }
        : {},
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.conversation.count(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Buyer and seller chats</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>

      <p className="text-sm text-muted">
        Read-only. You can see every conversation ({total} so far). Members are told in the app and in the Privacy Policy that the site team can read messages.
        To act on someone, use the Sellers page to ban them.
      </p>

      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={term} placeholder="Search by name, listing, or words in a message" aria-label="Search chats" className="input" />
        <button className="btn-ghost">Search</button>
      </form>

      {convos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          {term ? "No chats match that search." : "No conversations yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {convos.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/messages/${c.id}`} className="block rounded-xl border border-line bg-white p-4 hover:bg-paper">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">
                    {c.buyer.name} <span className="font-normal text-muted">(buyer)</span> &harr; {c.seller.name}{" "}
                    <span className="font-normal text-muted">(seller)</span>
                  </p>
                  <p className="text-xs text-muted">
                    {c._count.messages} {c._count.messages === 1 ? "message" : "messages"} · {formatPosted(c.lastMessageAt, true)}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted">About: {c.listingTitle}</p>
                {c.messages[0] && <p className="mt-1 line-clamp-2 break-words text-sm">{c.messages[0].body}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
