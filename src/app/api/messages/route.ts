import { NextResponse } from "next/server";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { displayName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** The signed-in member's conversations (for the chat pop-up). */
export async function GET() {
  const me = await getActiveMember();
  if (!me) return NextResponse.json({ error: "Members only." }, { status: 401 });

  const rows = await db.conversation.findMany({
    where: { OR: [{ buyerId: me.id }, { sellerId: me.id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderId: true } },
    },
  });

  const conversations = rows.map((c) => {
    const iAmBuyer = c.buyerId === me.id;
    const last = c.messages[0];
    return {
      id: c.id,
      otherName: displayName(iAmBuyer ? c.seller.name : c.buyer.name),
      listingTitle: c.listingTitle,
      role: iAmBuyer ? "buying" : "selling",
      unread: iAmBuyer ? c.buyerUnread : c.sellerUnread,
      lastBody: last?.body ?? "",
      lastFromMe: last ? last.senderId === me.id : false,
      when: formatPosted(c.lastMessageAt, true),
    };
  });

  return NextResponse.json({ conversations, unread: conversations.filter((c) => c.unread).length });
}
