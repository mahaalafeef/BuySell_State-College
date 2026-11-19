"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { notifyAdminReset } from "@/lib/email";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type ResetState = { ok?: boolean; error?: string } | undefined;

/**
 * A member who forgot their password asks for help. Nothing is reset automatically: this only tells the admin,
 * who checks with the person (on WhatsApp or by email) and then sends them a link. The answer is the same whether or
 * not the number has an account.
 */
export async function requestPasswordReset(_prev: ResetState, fd: FormData): Promise<ResetState> {
  if (String(fd.get("website") ?? "") !== "") return { ok: true }; // spam trap

  const idRaw = String(fd.get("identifier") ?? fd.get("phone") ?? "").trim();
  const isEmail = /^[^\s@]+@[^\s@]+$/.test(idRaw);
  const whatsapp = isEmail ? null : normalizeWhatsapp(idRaw);
  if (!isEmail && !whatsapp) {
    return { error: "Enter the email you signed up with, or the WhatsApp number you used to join (with country code, +1 555 123 4567)." };
  }

  const hash = ipHash(await headers());
  if (await checkLimit("reset", hash, 3)) return { error: "Too many requests. Please wait a while and try again." };
  await recordEvent("reset", hash);

  const member = await db.joinRequest.findFirst({
    where: isEmail ? { email: idRaw.toLowerCase(), status: "APPROVED" } : { whatsapp: whatsapp as string, status: "APPROVED" },
    orderBy: { decidedAt: "desc" },
    select: { id: true, name: true },
  });
  if (member) {
    await db.joinRequest.update({ where: { id: member.id }, data: { resetRequestedAt: new Date() } });
    await notifyAdminReset({ name: member.name });
    revalidatePath("/admin/resets");
    revalidatePath("/admin");
  }
  return { ok: true };
}
