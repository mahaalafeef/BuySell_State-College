"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { emailPasswordLink, notifyAdminReset } from "@/lib/email";
import { canonicalGmail } from "@/lib/emailAddress";
import { memberLink, resetLink } from "@/lib/members";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type ResetState = { ok?: boolean; error?: string } | undefined;

/**
 * A member who forgot their password asks for help. If we have their Gmail address, the link goes straight to
 * that inbox (only the owner can open it). Otherwise the admin is told, checks with them on WhatsApp, and sends
 * a link. The answer on screen is the same whether or not the address or number has an account.
 */
export async function requestPasswordReset(_prev: ResetState, fd: FormData): Promise<ResetState> {
  if (String(fd.get("website") ?? "") !== "") return { ok: true }; // spam trap

  const raw = String(fd.get("phone") ?? "").trim();
  const email = raw.includes("@") ? canonicalGmail(raw) : null;
  const whatsapp = raw.includes("@") ? null : normalizeWhatsapp(raw);
  if (!email && !whatsapp) {
    return { error: "Enter your Gmail address, or the WhatsApp number you used to join (with country code, like +1 555 123 4567)." };
  }

  const hash = ipHash(await headers());
  if (await checkLimit("reset", hash, 3)) return { error: "Too many requests. Please wait a while and try again." };
  await recordEvent("reset", hash);

  const member = await db.joinRequest.findFirst({
    where: email ? { email, status: "APPROVED" } : { whatsapp: whatsapp as string, status: "APPROVED" },
    orderBy: { decidedAt: "desc" },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (member) {
    if (member.email) {
      const firstTime = !member.passwordHash;
      const sent = await emailPasswordLink({
        to: member.email,
        name: member.name,
        firstTime,
        link: firstTime ? memberLink(member.id) : resetLink(member.id, member.passwordHash),
      });
      if (sent) return { ok: true };
    }
    // No Gmail on file (an older member), or email isn't working: ask the admin to help on WhatsApp
    await db.joinRequest.update({ where: { id: member.id }, data: { resetRequestedAt: new Date() } });
    await notifyAdminReset({ name: member.name });
    revalidatePath("/admin/resets");
    revalidatePath("/admin");
  }
  return { ok: true };
}
