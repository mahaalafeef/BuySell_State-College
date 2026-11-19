"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { cleanMessage, MESSAGES_PER_HOUR } from "@/lib/messages";
import { checkLimit, recordEvent } from "@/lib/ratelimit";

export type MessageState = { error?: string; ok?: boolean } | undefined;

/** A buyer writes the first message to a seller about a listing. */
export async function startConversation(_prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/login");

  const listingId = String(fd.get("listingId") ?? "");
  const cleaned = cleanMessage(fd.get("body"));
  if ("error" in cleaned) return { error: cleaned.error };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, status: true, ownerId: true },
  });
  if (!listing || !listing.ownerId || (listing.status !== "APPROVED" && listing.status !== "SALE_PENDING")) {
    return { error: "This listing can't receive messages." };
  }
  if (listing.ownerId === me.id) return { error: "This is your own listing." };

  const seller = await db.joinRequest.findFirst({ where: { id: listing.ownerId, status: "APPROVED" }, select: { id: true } });
  if (!seller) return { error: "The seller can't be reached right now." };

  const limiter = `m:${me.id}`;
  if (await checkLimit("message", limiter, MESSAGES_PER_HOUR)) {
    return { error: "You've sent a lot of messages. Please wait a while before sending more." };
  }
  await recordEvent("message", limiter);

  let convoId: string | null = null;
  const existing = await db.conversation.findFirst({ where: { listingId: listing.id, buyerId: me.id }, select: { id: true } });
  if (existing) {
    convoId = existing.id;
    await db.$transaction([
      db.message.create({ data: { conversationId: existing.id, senderId: me.id, body: cleaned.text } }),
      db.conversation.update({ where: { id: existing.id }, data: { lastMessageAt: new Date(), sellerUnread: true } }),
    ]);
  } else {
    try {
      const created = await db.conversation.create({
        data: {
          listingId: listing.id,
          listingTitle: listing.title,
          buyerId: me.id,
          sellerId: listing.ownerId,
          sellerUnread: true,
          messages: { create: { senderId: me.id, body: cleaned.text } },
        },
        select: { id: true },
      });
      convoId = created.id;
    } catch (err) {
      // Two taps at the same moment: use the conversation that was just made
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      const again = await db.conversation.findFirst({ where: { listingId: listing.id, buyerId: me.id }, select: { id: true } });
      if (!again) throw err;
      convoId = again.id;
      await db.$transaction([
        db.message.create({ data: { conversationId: again.id, senderId: me.id, body: cleaned.text } }),
        db.conversation.update({ where: { id: again.id }, data: { lastMessageAt: new Date(), sellerUnread: true } }),
      ]);
    }
  }

  revalidatePath("/messages");
  revalidatePath("/admin/messages");
  redirect(`/messages/${convoId}`);
}

/** Either person replies in an existing conversation. */
export async function sendMessage(_prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/login");

  const id = String(fd.get("conversationId") ?? "");
  const cleaned = cleanMessage(fd.get("body"));
  if ("error" in cleaned) return { error: cleaned.error };

  const convo = await db.conversation.findUnique({ where: { id }, select: { id: true, buyerId: true, sellerId: true } });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) return { error: "Conversation not found." };

  const iAmBuyer = convo.buyerId === me.id;
  const otherId = iAmBuyer ? convo.sellerId : convo.buyerId;
  const other = await db.joinRequest.findFirst({ where: { id: otherId, status: "APPROVED" }, select: { id: true } });
  if (!other) return { error: "This person can't be reached right now." };

  const limiter = `m:${me.id}`;
  if (await checkLimit("message", limiter, MESSAGES_PER_HOUR)) {
    return { error: "You've sent a lot of messages. Please wait a while before sending more." };
  }
  await recordEvent("message", limiter);

  await db.$transaction([
    db.message.create({ data: { conversationId: id, senderId: me.id, body: cleaned.text } }),
    db.conversation.update({
      where: { id },
      data: iAmBuyer ? { lastMessageAt: new Date(), sellerUnread: true } : { lastMessageAt: new Date(), buyerUnread: true },
    }),
  ]);

  revalidatePath(`/messages/${id}`);
  revalidatePath("/messages");
  revalidatePath("/admin/messages");
  return { ok: true };
}
