"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifyAdminSupport } from "@/lib/email";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/session";

export type SupportState = { ok?: boolean; error?: string } | undefined;

/** "Talk to a person": saves the message for the admin and emails them. */
export async function submitSupport(_prev: SupportState, fd: FormData): Promise<SupportState> {
  if (String(fd.get("website") ?? "") !== "") return { ok: true }; // spam trap

  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const contact = String(fd.get("contact") ?? "").trim().slice(0, 200);
  const message = String(fd.get("message") ?? "").trim().slice(0, 2000);
  const transcript = String(fd.get("transcript") ?? "").trim().slice(0, 6000);

  if (name.length < 2) return { error: "Please enter your name." };
  if (contact.length < 5) return { error: "Please enter an email or phone number so we can reply." };
  if (message.length < 5) return { error: "Please tell us how we can help." };

  const hash = ipHash(await headers());
  if (await checkLimit("support", hash, 5)) {
    return { error: "You've sent several messages already. We'll get back to you soon." };
  }
  await recordEvent("support", hash);

  await db.supportRequest.create({
    data: { name, contact, message, transcript: transcript || null },
  });
  await notifyAdminSupport({ name, contact, message });

  revalidatePath("/admin/support");
  return { ok: true };
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function resolveSupport(id: string) {
  await requireAdmin();
  await db.supportRequest.update({ where: { id }, data: { status: "RESOLVED" } });
  revalidatePath("/admin/support");
  revalidatePath("/admin");
}

export async function deleteSupport(id: string) {
  await requireAdmin();
  await db.supportRequest.delete({ where: { id } });
  revalidatePath("/admin/support");
  revalidatePath("/admin");
}
