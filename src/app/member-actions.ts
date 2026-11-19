"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/config";
import { db } from "@/lib/db";
import { canonicalGmail } from "@/lib/emailAddress";
import { codeMatches, fingerprintMatches, MEMBER_COOKIE, readResetToken, setMemberCookie } from "@/lib/members";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { hashPasscode, verifyPasscode } from "@/lib/security";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type MemberFormState = { error?: string } | undefined;

let dummy: string | null = null;
const dummyHash = () => (dummy ??= hashPasscode("not-a-real-password")); // so unknown numbers take as long as real ones

/** First visit from the personal link: the member chooses a password and is signed in. */
export async function setMemberPassword(_prev: MemberFormState, fd: FormData): Promise<MemberFormState> {
  const id = String(fd.get("m") ?? "");
  const code = String(fd.get("c") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (!id || !code || !codeMatches(id, code)) return { error: "This link isn't valid. Ask the admin for a new one." };
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password.length > 72) return { error: "Please use 72 characters or fewer." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true, passwordHash: true } });
  if (row?.status !== "APPROVED") return { error: "This link isn't valid. Ask the admin for a new one." };
  if (row.passwordHash) return { error: "A password is already set. Log in with it, or ask the admin to reset it." };

  await db.joinRequest.update({
    where: { id },
    data: { passwordHash: hashPasscode(password), failedAttempts: 0, lockedUntil: null },
  });
  await setMemberCookie(id);
  redirect("/");
}

/** Finish a password reset from the emailed link. The link works once and then stops working. */
export async function completePasswordReset(_prev: MemberFormState, fd: FormData): Promise<MemberFormState> {
  const token = String(fd.get("t") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password.length > 72) return { error: "Please use 72 characters or fewer." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const expired = { error: "This link has expired or was already used. Ask for a new one on the log in page." };
  const data = readResetToken(token);
  if (!data) return expired;
  const row = await db.joinRequest.findUnique({ where: { id: data.id }, select: { status: true, passwordHash: true } });
  if (row?.status !== "APPROVED" || !fingerprintMatches(row.passwordHash, data.fingerprint)) return expired;

  await db.joinRequest.update({
    where: { id: data.id },
    data: { passwordHash: hashPasscode(password), failedAttempts: 0, lockedUntil: null, resetRequestedAt: null },
  });
  await setMemberCookie(data.id);
  redirect("/");
}

/** Log in with the Gmail address or WhatsApp number used to join, plus the member's password. */
export async function memberLogin(_prev: MemberFormState, fd: FormData): Promise<MemberFormState> {
  const phoneRaw = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const generic = "That Gmail address, WhatsApp number or password didn't match.";
  if (!phoneRaw || !password) return { error: "Enter your Gmail address (or WhatsApp number) and password." };

  const hash = ipHash(await headers());
  if (await checkLimit("login", hash, 20)) return { error: "Too many attempts. Please wait a while and try again." };
  await recordEvent("login", hash);

  // Members can log in with their Gmail address or their WhatsApp number
  const email = phoneRaw.includes("@") ? canonicalGmail(phoneRaw) : null;
  const whatsapp = phoneRaw.includes("@") ? null : normalizeWhatsapp(phoneRaw);
  const who = email ? { email } : whatsapp ? { whatsapp } : null;
  const row = who
    ? await db.joinRequest.findFirst({
        where: { ...who, status: "APPROVED", passwordHash: { not: null } },
        orderBy: { decidedAt: "desc" },
      })
    : null;

  if (!row || !row.passwordHash) {
    verifyPasscode(password, dummyHash());
    return { error: generic };
  }
  if (row.lockedUntil && row.lockedUntil > new Date()) {
    return { error: "Too many wrong attempts. Try again in a few minutes." };
  }

  if (!verifyPasscode(password, row.passwordHash)) {
    const attempts = row.failedAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await db.joinRequest.update({
      where: { id: row.id },
      data: {
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return { error: generic };
  }

  if (row.failedAttempts > 0 || row.lockedUntil) {
    await db.joinRequest.update({ where: { id: row.id }, data: { failedAttempts: 0, lockedUntil: null } });
  }
  await setMemberCookie(row.id);
  redirect("/");
}

export async function memberLogout() {
  (await cookies()).delete(MEMBER_COOKIE);
  redirect("/members");
}
