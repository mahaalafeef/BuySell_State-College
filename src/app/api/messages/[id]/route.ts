import { NextResponse } from "next/server";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { displayName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** One conversation's messages (for the chat pop-up). Opening it marks it as read. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveMember();
  if (!me) return NextResponse.json({ error: "Members only." }, { status: 401 });

  const { id } = await params;
  const convo = await db.conversation.findUnique({
    where: { id },
    include: { buyer: { select: { name: true, status: true } }, seller: { select: { name: true, status: true } } },
  });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const iAmBuyer = convo.buyerId === me.id;
  const other = iAmBuyer ? convo.seller : convo.buyer;

  if (iAmBuyer && convo.buyerUnread) {
    await db.conversation.update({ where: { id }, data: { buyerUnread: false } });
  } else if (!iAmBuyer && convo.sellerUnread) {
    await db.conversation.update({ where: { id }, data: { sellerUnread: false } });
  }

  const latest = await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 100 });
  const messages = latest.reverse().map((m) => ({
    id: m.id,
    mine: m.senderId === me.id,
    body: m.body,
    when: formatPosted(m.createdAt, true),
  }));

  return NextResponse.json({
    id: convo.id,
    otherName: displayName(other.name),
    listingId: convo.listingId,
    listingTitle: convo.listingTitle,
    canReply: other.status === "APPROVED",
    messages,
  });
}
