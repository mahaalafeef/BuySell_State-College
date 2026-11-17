"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/accountAuth";
import { db } from "@/lib/db";
import { notifyAdminSupport } from "@/lib/email";
import { setMemberCookie } from "@/lib/members";
import { readResetToken, resetMatches } from "@/lib/passwordReset";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { hashPasscode } from "@/lib/security";
import { isAdmin } from "@/lib/session";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type PasswordState = { ok?: boolean; error?: string } | undefined;

function checkNew(password: string, confirm: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 72) return "Please use 72 characters or fewer.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/** "I forgot my password": flags the member so the admin can send a reset link on WhatsApp. */
export async function requestPasswordReset(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const phone = normalizeWhatsapp(String(fd.get("phone") ?? ""));
  if (!phone) return { error: "Enter the WhatsApp number you joined with." };

  const hash = ipHash(await headers());
  if (await checkLimit("login", hash, 20)) return { error: "Too many attempts. Please wait a while and try again." };
  await recordEvent("login", hash);

  // The same answer whether or not the number has an account, so nothing is revealed here
  const row = await db.joinRequest.findFirst({
    where: { whatsapp: phone, status: "APPROVED" },
    select: { id: true, name: true },
  });
  if (row) {
    await db.joinRequest.update({ where: { id: row.id }, data: { resetRequestedAt: new Date() } });
    await notifyAdminSupport({
      name: row.name,
      contact: `WhatsApp ${/^\d+$/.test(phone) ? `+${phone}` : `@${phone}`}`,
      message: "Forgot their password. Open /admin/resets to send them a reset link on WhatsApp.",
    });
    revalidatePath("/admin/resets");
    revalidatePath("/admin/join");
  }
  return { ok: true };
}

/** From the reset link the admin sent: choose a new password and sign in. */
export async function resetPassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const expired = "This link has expired or was already used. Ask for a new one.";
  const token = readResetToken(String(fd.get("t") ?? ""));
  if (!token) return { error: expired };

  const problem = checkNew(String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
  if (problem) return { error: problem };

  const row = await db.joinRequest.findUnique({ where: { id: token.id }, select: { status: true, passwordHash: true } });
  if (row?.status !== "APPROVED" || !resetMatches(token.h, row.passwordHash)) return { error: expired };

  await db.joinRequest.update({
    where: { id: token.id },
    data: {
      passwordHash: hashPasscode(String(fd.get("password"))),
      failedAttempts: 0,
      lockedUntil: null,
      resetRequestedAt: null,
    },
  });
  await setMemberCookie(token.id);
  redirect("/");
}

/** A signed-in member changes their own password. */
export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const id = await currentMemberId();
  if (!id) redirect("/members");

  const password = String(fd.get("password") ?? "");
  const problem = checkNew(password, String(fd.get("confirm") ?? ""));
  if (problem) return { error: problem };

  await db.joinRequest.update({
    where: { id },
    data: { passwordHash: hashPasscode(password), failedAttempts: 0, lockedUntil: null },
  });
  return { ok: true };
}

/** Admin: clear a reset request once the link has been sent. */
export async function dismissReset(id: string) {
  if (!(await isAdmin())) redirect("/admin/login");
  await db.joinRequest.update({ where: { id }, data: { resetRequestedAt: null } });
  revalidatePath("/admin/resets");
  revalidatePath("/admin/join");
}
