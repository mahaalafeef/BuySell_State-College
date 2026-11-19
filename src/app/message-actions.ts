"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { emailNewMessage, notifyAdminReport } from "@/lib/email";
import { getActiveMember } from "@/lib/memberAccess";
import { siteUrl } from "@/lib/members";
import { MAX_MESSAGE_LENGTH, WATCH_PATTERN } from "@/lib/messageRules";
import { checkLimit, recordEvent } from "@/lib/ratelimit";
import { displayName } from "@/lib/reviews";
import { isAdmin } from "@/lib/session";

export type MessageState = { ok?: boolean; error?: string; n?: number } | undefined;

/** A member opens (or continues) a conversation with the seller of a listing. */
export async function startConversation(listingId: string) {
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, ownerId: true, status: true },
  });
  const open = listing && (listing.status === "APPROVED" || listing.status === "SALE_PENDING");
  if (!listing || !open || !listing.ownerId || listing.ownerId === me.id) redirect(`/listings/${listingId}`);

  const seller = await db.joinRequest.findUnique({ where: { id: listing.ownerId }, select: { status: true } });
  if (seller?.status !== "APPROVED") redirect(`/listings/${listingId}`);

  let convo = await db.conversation.findFirst({ where: { listingId, buyerId: me.id }, select: { id: true } });
  if (!convo) {
    if (await checkLimit("convo", me.id, 10)) redirect("/messages?limit=1");
    await recordEvent("convo", me.id);
    convo = await db.conversation.create({
      data: { listingId, listingTitle: listing.title, buyerId: me.id, sellerId: listing.ownerId },
      select: { id: true },
    });
  }
  redirect(`/messages/${convo.id}`);
}

/** Sends a message in a conversation the member is part of. */
export async function sendMessage(conversationId: string, _prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      buyerUnread: true,
      sellerUnread: true,
      listingTitle: true,
      buyer: { select: { name: true, email: true, status: true } },
      seller: { select: { name: true, email: true, status: true } },
    },
  });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) {
    return { error: "This conversation isn't available." };
  }

  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) return { error: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` };

  const iAmBuyer = convo.buyerId === me.id;
  const other = iAmBuyer ? convo.seller : convo.buyer;
  if (other.status !== "APPROVED") return { error: "This person is no longer on the site, so you can't message them." };

  if (await checkLimit("message", me.id, 40)) {
    return { error: "You're sending messages very quickly. Please wait a little and try again." };
  }
  await recordEvent("message", me.id);

  const flagged = WATCH_PATTERN.test(body);
  const theirUnreadBefore = iAmBuyer ? convo.sellerUnread : convo.buyerUnread;

  await db.$transaction([
    db.message.create({ data: { conversationId: convo.id, senderId: me.id, body } }),
    db.conversation.update({
      where: { id: convo.id },
      data: {
        lastMessageAt: new Date(),
        ...(iAmBuyer ? { sellerUnread: { increment: 1 } } : { buyerUnread: { increment: 1 } }),
        ...(flagged ? { flaggedAt: new Date() } : {}),
      },
    }),
  ]);

  // One email nudge per burst: only when they had nothing waiting before this message
  if (theirUnreadBefore === 0 && other.email) {
    await emailNewMessage({
      to: other.email,
      name: other.name,
      fromName: displayName(me.name),
      listingTitle: convo.listingTitle,
      link: `${siteUrl()}/messages/${convo.id}`,
    });
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${convo.id}`);
  revalidatePath(`/admin/messages/${convo.id}`);
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true, n: Date.now() };
}

/** A member asks the admin to look at a conversation. */
export async function reportConversation(conversationId: string, _prev: MessageState, fd: FormData): Promise<MessageState> {
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true, listingTitle: true },
  });
  if (!convo || (convo.buyerId !== me.id && convo.sellerId !== me.id)) return { error: "This conversation isn't available." };

  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || "Reported by a member";
  await db.conversation.update({
    where: { id: convo.id },
    data: { reportedAt: new Date(), flaggedAt: new Date(), reportReason: reason },
  });
  await notifyAdminReport({
    reporter: displayName(me.name),
    listingTitle: convo.listingTitle,
    reason,
    link: `${siteUrl()}/admin/messages/${convo.id}`,
  });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true, n: Date.now() };
}

/* ---------------- Admin ---------------- */

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Hide (or show again) one message. Members then see "removed by the admin". */
export async function setMessageHidden(messageId: string, hidden: boolean) {
  await requireAdmin();
  const m = await db.message.update({ where: { id: messageId }, data: { hidden }, select: { conversationId: true } });
  revalidatePath(`/admin/messages/${m.conversationId}`);
  revalidatePath(`/messages/${m.conversationId}`);
}

/** The admin has looked at it: clear the "needs a look" mark. */
export async function clearConversationFlag(conversationId: string) {
  await requireAdmin();
  await db.conversation.update({
    where: { id: conversationId },
    data: { flaggedAt: null, reportedAt: null, reportReason: null },
  });
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${conversationId}`);
  revalidatePath("/admin");
}

export async function deleteConversation(conversationId: string) {
  await requireAdmin();
  await db.conversation.delete({ where: { id: conversationId } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  redirect("/admin/messages");
}
