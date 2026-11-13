"use server";

import type { ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notifyAdminPending } from "@/lib/email";
import { redirect } from "next/navigation";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/config";
import { db } from "@/lib/db";
import { hashPasscode, normalizePhone, safeEqual, verifyPasscode } from "@/lib/security";
import {
  canManage,
  clearAdminSession,
  clearUserSession,
  isAdmin,
  setAdminSession,
  updateUserSession,
} from "@/lib/session";
import { getAutoApprove, setAutoApprove } from "@/lib/settings";
import { createSchema, editSchema, toCents } from "@/lib/validation";

export type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
    }
  | undefined;

function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && k !== "passcode") out[k] = v;
  }
  return out;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/manage");
  revalidatePath("/admin");
}

/* =====================================================================
   Approval rules
   ===================================================================== */

/** What status a listing gets after being created, edited, or relisted. */
async function statusAfterChange(current: ListingStatus | null): Promise<ListingStatus> {
  if (current === "SOLD") return "SOLD";
  if (await getAutoApprove()) return "APPROVED";
  if (current === "APPROVED" && process.env.REQUIRE_REAPPROVAL_ON_EDIT === "false") return "APPROVED";
  return "PENDING";
}

/* =====================================================================
   Sellers: create / prove ownership / edit
   ===================================================================== */

export async function createListing(_prev: FormState, fd: FormData): Promise<FormState> {
  // Honeypot: real people never fill this hidden field
  if (String(fd.get("website") ?? "") !== "") redirect("/");

  const values = formValues(fd);
  const parsed = createSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: ["Enter a valid phone number"] }, values };

  const d = parsed.data;
  const listing = await db.listing.create({
    data: {
      title: d.title,
      description: d.description,
      priceCents: toCents(d.price),
      category: d.category,
      condition: d.condition,
      location: d.location,
      imageUrl: d.imageUrl || null,
      contact: d.contact,
      phone,
      passcodeHash: hashPasscode(d.passcode),
      status: await statusAfterChange(null),
    },
  });
  
  if (listing.status === "PENDING") await notifyAdminPending(listing, "new");
  await updateUserSession({ addId: listing.id }); // let them edit right away
  refresh();
  redirect(`/sell/done?id=${listing.id}`);
}

export async function verifyAccess(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get("id") ?? "").trim();
  const credential = String(fd.get("credential") ?? "").trim();
  const values = { id };
  const generic = "That didn't match. Check the listing ID and try again.";

  if (!credential) return { error: "Enter your passcode or phone number.", values };

  if (id) {
    // A specific listing: passcode OR phone number unlocks it
    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) return { error: generic, values };

    if (listing.lockedUntil && listing.lockedUntil > new Date()) {
      return { error: "Too many wrong attempts. Try again in a few minutes.", values };
    }

    const phone = normalizePhone(credential);
    const ok = verifyPasscode(credential, listing.passcodeHash) || (phone !== null && phone === listing.phone);

    if (!ok) {
      const attempts = listing.failedAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await db.listing.update({
        where: { id },
        data: {
          failedAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      return { error: generic, values };
    }

    if (listing.failedAttempts > 0 || listing.lockedUntil) {
      await db.listing.update({ where: { id }, data: { failedAttempts: 0, lockedUntil: null } });
    }
    await updateUserSession({ addId: id });
    redirect(`/manage/${id}`);
  }

  // No listing ID: treat the input as a phone number and show all of their listings
  const phone = normalizePhone(credential);
  if (!phone) {
    return { error: "Enter your phone number, or add a listing ID to use a passcode.", values };
  }
  const count = await db.listing.count({ where: { phone } });
  if (count === 0) return { error: "We couldn't find listings for that phone number.", values };

  await updateUserSession({ phone });
  redirect("/manage");
}

async function requireOwner(id: string) {
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) redirect("/manage");
  if (!(await canManage(listing))) redirect(`/manage?id=${id}`);
  return listing;
}

export async function updateListing(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const listing = await requireOwner(id);

  const values = formValues(fd);
  const parsed = editSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: ["Enter a valid phone number"] }, values };

  const d = parsed.data;
  await db.listing.update({
    where: { id },
    data: {
      title: d.title,
      description: d.description,
      priceCents: toCents(d.price),
      category: d.category,
      condition: d.condition,
      location: d.location,
      imageUrl: d.imageUrl || null,
      contact: d.contact,
      phone,
      ...(d.passcode ? { passcodeHash: hashPasscode(d.passcode) } : {}),
      status: await statusAfterChange(listing.status),
      rejectionReason: null,
    },
  });

  refresh();
  revalidatePath(`/listings/${id}`);
  redirect(`/manage/${id}?saved=1`);
}

export async function setSold(id: string, sold: boolean) {
  const listing = await requireOwner(id);
  await db.listing.update({
    where: { id },
    data: { status: sold ? "SOLD" : await statusAfterChange(listing.status === "SOLD" ? null : listing.status) },
  });
  refresh();
  revalidatePath(`/listings/${id}`);
  redirect(`/manage/${id}`);
}

export async function deleteMyListing(id: string) {
  await requireOwner(id);
  await db.listing.delete({ where: { id } });
  refresh();
  redirect("/manage");
}

export async function signOut() {
  await clearUserSession();
  redirect("/manage");
}

/* =====================================================================
   Admin
   ===================================================================== */

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function adminLogin(_prev: FormState, fd: FormData): Promise<FormState> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "ADMIN_PASSWORD isn't set on the server yet." };
  if (!safeEqual(String(fd.get("password") ?? ""), expected)) return { error: "Wrong password." };
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function approveListing(id: string) {
  await requireAdmin();
  await db.listing.update({ where: { id }, data: { status: "APPROVED", rejectionReason: null } });
  refresh();
  revalidatePath(`/listings/${id}`);
}

export async function rejectListing(id: string, fd: FormData) {
  await requireAdmin();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  await db.listing.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: reason || null },
  });
  refresh();
  revalidatePath(`/listings/${id}`);
}

export async function adminDeleteListing(id: string) {
  await requireAdmin();
  await db.listing.delete({ where: { id } });
  refresh();
}

export async function approveAllPending() {
  await requireAdmin();
  await db.listing.updateMany({ where: { status: "PENDING" }, data: { status: "APPROVED" } });
  refresh();
}

export async function setApprovalMode(auto: boolean) {
  await requireAdmin();
  await setAutoApprove(auto);
  refresh();
}
