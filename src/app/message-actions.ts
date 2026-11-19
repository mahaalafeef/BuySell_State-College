"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { cleanMessage, MESSAGES_PER_HOUR } from "@/lib/messages";
import { checkLimit, recordEvent } from "@/lib/ratelimit";

export type MessageState = { error?: string; ok?: boolean } | undefined;

type Me = { id: string; name: string };

function refresh(conversationId?: string) {
  if (conversationId) revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/admin/messages");
}

/** Keeps one member from flooding others. Returns an error message, or null if they may send. */
async function tooMany(me: Me): Promise<string | null> {
  const key = `m:${me.id}`;
  if (await checkLimit("message", key, MESSAGES_PER_HOUR)) {
    return "You've sent a lot of messages. Please wait a while before sending more.";
  }
  await recordEvent("message", key);
  return null;
}

/** A buyer writes to a seller about a listing: starts the conversation, or adds to the one that already exists. */
async function writeToSeller(me: Me, listingId: string, text: string): Promise<{ id: string } | { error: string }> {
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

  const limited = await tooMany(me);
  if (limited) return { error: limited };

  const append = async (conversationId: string) => {
    await db.$transaction([
      db.message.create({ data: { conversationId, senderId: me.id, body: text } }),
      db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), sellerUnread: true } }),
    ]);
    return { id: conversationId };
  };

  const existing = await db.conversation.findFirst({ where: { listingId: listing.id, buyerId: me.id }, select: { id: true } });
  if (existing) return append(existing.id);

  try {
    const created = await db.conversation.create({
      data: {
        listingId: listing.id,
        listingTitle: listing.title,
        buyerId: me.id,
        sellerId: listing.ownerId,
        sellerUnread: true,
        messages: { create: { senderId: me.id, body: text } },
      },
      select: { id: true },
    });
    return { id: created.id };
  } catch (err) {
    // Two taps at the same moment: use the conversation that was just made
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const again = await db.conversation.findFirst({ where: { listingId: listing.id, buyerId: me.id }, select: { id: true } });
    if (!again) throw err;
    return append(again.id);
  }
}

/** Either person replies in an existing conversation. */
async function reply(me: Me, conversationId: string, text: string): Promise<{ ok: true } | { error: string }> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) return { error: "Conversation not found." };

  const iAmBuyer = convo.buyerId === me.id;
  const otherId = iAmBuyer ? convo.sellerId : convo.buyerId;
  const other = await db.joinRequest.findFirst({ where: { id: otherId, status: "APPROVED" }, select: { id: true } });
  if (!other) return { error: "This person can't be reached right now." };

  const limited = await tooMany(me);
  if (limited) return { error: limited };

  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: me.id, body: text } }),
    db.conversation.update({
      where: { id: conversationId },
      data: iAmBuyer ? { lastMessageAt: new Date(), sellerUnread: true } : { lastMessageAt: new Date(), buyerUnread: true },
    }),
  ]);
  return { ok: true };
}

/* ---------- Full-page forms (/messages and the listing page without JavaScript) ---------- */

export async function startConversation(_prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/login");
  const cleaned = cleanMessage(fd.get("body"));
  if ("error" in cleaned) return { error: cleaned.error };

  const result = await writeToSeller(me, String(fd.get("listingId") ?? ""), cleaned.text);
  if ("error" in result) return { error: result.error };
  refresh(result.id);
  redirect(`/messages/${result.id}`);
}

export async function sendMessage(_prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/login");
  const cleaned = cleanMessage(fd.get("body"));
  if ("error" in cleaned) return { error: cleaned.error };

  const id = String(fd.get("conversationId") ?? "");
  const result = await reply(me, id, cleaned.text);
  if ("error" in result) return { error: result.error };
  refresh(id);
  return { ok: true };
}

/* ---------- Pop-up chat (called from the chat bubble, no page change) ---------- */

export async function startChat(listingId: string, body: string): Promise<{ id?: string; error?: string }> {
  const me = await getActiveMember();
  if (!me) return { error: "Please log in to send messages." };
  const cleaned = cleanMessage(body);
  if ("error" in cleaned) return { error: cleaned.error };

  const result = await writeToSeller(me, listingId, cleaned.text);
  if ("error" in result) return { error: result.error };
  refresh(result.id);
  return { id: result.id };
}

export async function sendChat(conversationId: string, body: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await getActiveMember();
  if (!me) return { error: "Please log in to send messages." };
  const cleaned = cleanMessage(body);
  if ("error" in cleaned) return { error: cleaned.error };

  const result = await reply(me, conversationId, cleaned.text);
  if ("error" in result) return { error: result.error };
  refresh(conversationId);
  return { ok: true };
}
