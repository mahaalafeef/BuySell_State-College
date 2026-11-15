"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifyAdminJoin } from "@/lib/email";
import { JOIN_REQUIRES_PROOF, JOIN_ROLES, MAX_PROOF_BYTES } from "@/lib/join";
import { memberPath, setRequestCookie } from "@/lib/members";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { isAdmin } from "@/lib/session";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type JoinState = { ok?: boolean; path?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

/** Public: someone asks to join the group. */
export async function submitJoin(fd: FormData): Promise<JoinState> {
  if (String(fd.get("website") ?? "") !== "") return { ok: true }; // spam trap

  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const whatsappRaw = String(fd.get("whatsapp") ?? "").trim();
  const role = String(fd.get("role") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  const consent = fd.get("consent") === "on";
  const proof = fd.get("proof");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  const whatsapp = normalizeWhatsapp(whatsappRaw);
  if (!whatsapp) fieldErrors.whatsapp = "Enter your WhatsApp number with country code (+1 555 123 4567), or your WhatsApp username.";
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

  if (Object.keys(fieldErrors).length > 0 || !whatsapp || (JOIN_REQUIRES_PROOF && !bytes)) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const hash = ipHash(await headers());
  if (await checkLimit("join", hash, 3)) {
    return { error: "You've sent several requests already. Please wait a while before trying again." };
  }
  await recordEvent("join", hash);

  // Don't create duplicates for the same person
  const existing = await db.joinRequest.count({ where: { whatsapp, status: "PENDING" } });
  if (existing > 0) return { ok: true };

  const created = await db.joinRequest.create({
    data: { name, whatsapp, role, note: note || null, proof: bytes, hasProof: bytes !== null },
  });
  await setRequestCookie(created.id); // lets them check on it later from this browser
  await notifyAdminJoin({ name, role });
  revalidatePath("/admin/join");
  revalidatePath("/admin");
  return { ok: true, path: memberPath(created.id) };
}

/* ---------------- Admin ---------------- */

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

function refresh() {
  revalidatePath("/admin/join");
  revalidatePath("/admin");
}

// Deciding a request also deletes the proof photo, so we keep as little personal data as possible.

export async function approveJoin(id: string) {
  await requireAdmin();
  await db.joinRequest.update({
    where: { id },
    data: { status: "APPROVED", proof: null, hasProof: false, decidedAt: new Date(), decidedNote: null },
  });
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

/** Clears a member's password, so their personal link lets them choose a new one. */
export async function resetMemberPassword(id: string) {
  await requireAdmin();
  await db.joinRequest.update({ where: { id }, data: { passwordHash: null, failedAttempts: 0, lockedUntil: null } });
  refresh();
}

export async function deleteJoin(id: string) {
  await requireAdmin();
  await db.joinRequest.delete({ where: { id } });
  refresh();
}
