"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JoinRequest } from "@prisma/client";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/config";
import { db } from "@/lib/db";
import { codeMatches, MEMBER_COOKIE, setMemberCookie } from "@/lib/members";
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

/** Log in with the email (or the WhatsApp number used to join) plus the member's password. */
export async function memberLogin(_prev: MemberFormState, fd: FormData): Promise<MemberFormState> {
  const idRaw = String(fd.get("identifier") ?? fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const generic = "That email, number or password didn't match.";
  if (!idRaw || !password) return { error: "Enter your email (or WhatsApp number) and password." };

  const hash = ipHash(await headers());
  if (await checkLimit("login", hash, 20)) return { error: "Too many attempts. Please wait a while and try again." };
  await recordEvent("login", hash);

  let row: JoinRequest | null = null;
  if (/^[^\s@]+@[^\s@]+$/.test(idRaw)) {
    // An email address
    row = await db.joinRequest.findFirst({
      where: { email: idRaw.toLowerCase(), status: "APPROVED", passwordHash: { not: null } },
    });
  } else {
    // A WhatsApp number or username (members who joined through the WhatsApp request form)
    const whatsapp = normalizeWhatsapp(idRaw);
    row = whatsapp
      ? await db.joinRequest.findFirst({
          where: { whatsapp, status: "APPROVED", passwordHash: { not: null } },
          orderBy: { decidedAt: "desc" },
        })
      : null;
  }

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
