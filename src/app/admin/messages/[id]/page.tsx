import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ChatAdmin({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;

  const convo = await db.conversation.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true, whatsapp: true, status: true } },
      seller: { select: { id: true, name: true, email: true, whatsapp: true, status: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 1000 },
    },
  });
  if (!convo) notFound();

  const who = (m: { id: string; name: string; email: string | null; whatsapp: string | null; status: string }, role: string) => (
    <div className="rounded-lg border border-line bg-white p-3 text-sm">
      <p className="font-semibold">
        {m.name} <span className="font-normal text-muted">({role})</span>
      </p>
      <p className="text-muted">{m.email ?? (m.whatsapp ? `WhatsApp ${m.whatsapp}` : "No contact on file")}</p>
      {m.status !== "APPROVED" && <p className="font-semibold text-danger">Status: {m.status}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/messages" className="btn-ghost">
          &larr; All chats
        </Link>
        <Link href="/admin/sellers" className="btn-ghost">
          Sellers (to ban someone)
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">About: {convo.listingTitle}</h1>
        {convo.listingId ? (
          <Link href={`/listings/${convo.listingId}`} className="text-sm underline">
            Open the listing
          </Link>
        ) : (
          <p className="text-sm text-muted">The listing was removed.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {who(convo.buyer, "buyer")}
        {who(convo.seller, "seller")}
      </div>

      <p className="rounded-lg bg-paper p-3 text-sm">Read-only view. Only open conversations when you have a reason, such as a report or a suspected scam.</p>

      <ul className="space-y-3">
        {convo.messages.map((m) => {
          const fromSeller = m.senderId === convo.sellerId;
          return (
            <li key={m.id} className={fromSeller ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${fromSeller ? "bg-brand/10" : "border border-line bg-white"}`}>
                <p className="text-xs font-semibold text-muted">{fromSeller ? convo.seller.name : convo.buyer.name}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-1 text-xs text-muted">{formatPosted(m.createdAt, true)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
