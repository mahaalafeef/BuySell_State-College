"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { emailApproved, emailJoinReceived, notifyAdminJoin } from "@/lib/email";
import { canonicalGmail } from "@/lib/emailAddress";
import { BAN_REASON, JOIN_REQUIRES_PROOF, JOIN_ROLES, MAX_PROOF_BYTES } from "@/lib/join";
import { memberLink, memberPath, setRequestCookie } from "@/lib/members";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/session";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type JoinState =
  | {
      ok?: boolean;
      path?: string;
      error?: string;
      fieldErrors?: Record<string, string>;
      // This WhatsApp number already has an account, or a request that is still being reviewed
      exists?: "account" | "pending";
      number?: string;
      // The personal link was emailed to this Gmail address (so it is not shown on screen)
      emailed?: boolean;
      email?: string;
    }
  | undefined;

/** Public: someone asks to join the group. */
export async function submitJoin(fd: FormData): Promise<JoinState> {
  if (String(fd.get("website") ?? "") !== "") return { ok: true }; // spam trap

  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const whatsappRaw = String(fd.get("whatsapp") ?? "").trim();
  const emailRaw = String(fd.get("email") ?? "").trim();
  const role = String(fd.get("role") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  const consent = fd.get("consent") === "on";
  const proof = fd.get("proof");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  const whatsapp = normalizeWhatsapp(whatsappRaw);
  if (!whatsapp) fieldErrors.whatsapp = "Enter your WhatsApp number with country code (+1 555 123 4567), or your WhatsApp username.";
  const email = canonicalGmail(emailRaw);
  if (!email) fieldErrors.email = "Enter your Gmail address (like name@gmail.com).";
  if (!(JOIN_ROLES as readonly string[]).includes(role)) fieldErrors.role = "Choose one.";
  if (!consent) fieldErrors.consent = "Please tick the box to continue.";

  let bytes: Uint8Array<ArrayBuffer> | null = null;
  if (!JOIN_REQUIRES_PROOF) {
    // Proof photos are switched off: ignore any file that was sent
  } else if (!(proof instanceof File) || proof.size === 0) {
    fieldErrors.proof = "Please add a photo of your proof.";
  } else if (proof.type !== "image/jpeg") {
    fieldErrors.proof = "Please choose a photo again. We convert it automatically.";
  } else if (proof.size > MAX_PROOF_BYTES) {
    fieldErrors.proof = "That photo is too large. Try a smaller one.";
  } else {
    bytes = new Uint8Array(await proof.arrayBuffer());
  }

  if (Object.keys(fieldErrors).length > 0 || !whatsapp || !email || (JOIN_REQUIRES_PROOF && !bytes)) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const hash = ipHash(await headers());
  if (await checkLimit("join", hash, 3)) {
    return { error: "You've sent several requests already. Please wait a while before trying again." };
  }
  await recordEvent("join", hash);

  // One account per Gmail address and per WhatsApp number. Someone who already has an account is sent to log in or
  // reset their password, and someone who was banned gets the same quiet "received" answer as before.
  const same = await db.joinRequest.findMany({
    where: { status: { in: ["APPROVED", "PENDING", "BANNED"] }, OR: [{ whatsapp }, { email }] },
    select: { status: true },
  });
  if (same.some((r) => r.status === "BANNED")) return { ok: true };
  if (same.some((r) => r.status === "APPROVED")) return { exists: "account", number: whatsapp, email };
  if (same.some((r) => r.status === "PENDING")) return { exists: "pending", number: whatsapp, email };

  const created = await db.joinRequest.create({
    data: { name, whatsapp, email, role, note: note || null, proof: bytes, hasProof: bytes !== null },
  });
  await setRequestCookie(created.id); // lets them check on it later from this browser
  await notifyAdminJoin({ name, role });
  revalidatePath("/admin/join");
  revalidatePath("/admin");

  // The personal link goes only to their Gmail inbox. That is how we know the address really is theirs.
  // If email isn't working, fall back to showing the link on screen so nobody is stuck.
  const emailed = await emailJoinReceived({ to: email, name, link: memberLink(created.id) });
  return emailed ? { ok: true, emailed: true, email } : { ok: true, path: memberPath(created.id) };
}

/* ---------------- Admin ---------------- */

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

function refresh() {
  revalidatePath("/admin/join");
  revalidatePath("/admin/sellers");
  revalidatePath("/admin/resets");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/housing");
}

// Deciding a request also deletes the proof photo, so we keep as little personal data as possible.

export async function approveJoin(id: string) {
  await requireAdmin();
  // A number can only have one account. If this one already has one, this request is closed instead of approved.
  const row = await db.joinRequest.findUnique({ where: { id }, select: { whatsapp: true } });
  if (!row) return;
  const other = await db.joinRequest.count({ where: { whatsapp: row.whatsapp, status: "APPROVED", id: { not: id } } });
  if (other > 0) {
    await db.joinRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        proof: null,
        hasProof: false,
        decidedAt: new Date(),
        decidedNote: "This WhatsApp number already has an account",
      },
    });
    refresh();
    return;
  }
  const approved = await db.joinRequest.update({
    where: { id },
    data: { status: "APPROVED", proof: null, hasProof: false, decidedAt: new Date(), decidedNote: null },
    select: { id: true, name: true, email: true },
  });
  // Email them the link to choose a password. (If there is no email on file, or email isn't working, the admin
  // can still send the link on WhatsApp from the Approved list.)
  if (approved.email) await emailApproved({ to: approved.email, name: approved.name, link: memberLink(approved.id) });
  refresh();
}

export async function rejectJoin(id: string, fd: FormData) {
  await requireAdmin();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  await db.joinRequest.update({
    where: { id },
    data: { status: "REJECTED", proof: null, hasProof: false, decidedAt: new Date(), decidedNote: reason || null },
  });
  refresh();
}

/** Removes an approved member's access to the site. */
export async function revokeJoin(id: string) {
  await requireAdmin();
  await db.joinRequest.update({
    where: { id },
    data: { status: "REJECTED", decidedNote: "Access removed", decidedAt: new Date() },
  });
  refresh();
}

/**
 * Bans a member. They are logged out at once and can't log back in or apply again with the same number,
 * and all their live listings are hidden. Unbanning puts those listings back in the review list.
 */
export async function banMember(id: string, fd: FormData) {
  await requireAdmin();
  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true } });
  if (row?.status !== "APPROVED") return;
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  await db.joinRequest.update({ where: { id }, data: { status: "BANNED", decidedNote: reason || "Banned" } });
  await db.listing.updateMany({
    where: { ownerId: id, status: { in: ["PENDING", "APPROVED", "SALE_PENDING"] } },
    data: { status: "REJECTED", rejectionReason: BAN_REASON },
  });
  refresh();
}

export async function unbanMember(id: string) {
  await requireAdmin();
  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true } });
  if (row?.status !== "BANNED") return;
  await db.joinRequest.update({ where: { id }, data: { status: "APPROVED", decidedNote: null } });
  // Their hidden listings go back to "awaiting approval", so nothing goes live without a look
  await db.listing.updateMany({
    where: { ownerId: id, status: "REJECTED", rejectionReason: BAN_REASON },
    data: { status: "PENDING", rejectionReason: null },
  });
  refresh();
}

/** Clears a member's password, so their personal link lets them choose a new one. */
export async function resetMemberPassword(id: string) {
  await requireAdmin();
  await db.joinRequest.update({
    where: { id },
    data: { passwordHash: null, failedAttempts: 0, lockedUntil: null, resetRequestedAt: null },
  });
  refresh();
}

/** Closes a password reset request without changing anything (for example, if it wasn't the member). */
export async function dismissReset(id: string) {
  await requireAdmin();
  await db.joinRequest.update({ where: { id }, data: { resetRequestedAt: null } });
  refresh();
}

export async function deleteJoin(id: string) {
  await requireAdmin();
  await db.joinRequest.delete({ where: { id } });
  refresh();
}
