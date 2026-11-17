"use server";

import type { ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyAdminPending } from "@/lib/email";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS, parseListingId } from "@/lib/config";
import { canManageListing, getActiveMember } from "@/lib/memberAccess";
import { db } from "@/lib/db";
import { hashPasscode, normalizePhone, safeEqual, verifyPasscode } from "@/lib/security";
import {
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

/** Form fields as an object. Photos repeat under one name, so they are collected into a list. */
function rawForm(fd: FormData) {
  return {
    ...Object.fromEntries(fd),
    images: fd.getAll("images").filter((x): x is string => typeof x === "string" && x !== ""),
  };
}

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
  revalidatePath("/account");
  revalidatePath("/admin");
}

/* =====================================================================
   Approval rules
   ===================================================================== */

/** What status a listing gets after being created, edited, or relisted. */
async function statusAfterChange(current: ListingStatus | null): Promise<ListingStatus> {
  if (current === "SOLD") return "SOLD";
  // A listing the seller marked "pending" stays pending when it is edited, as long as it doesn't need re-approval
  const keep: ListingStatus = current === "SALE_PENDING" ? "SALE_PENDING" : "APPROVED";
  if (await getAutoApprove()) return keep;
  if ((current === "APPROVED" || current === "SALE_PENDING") && process.env.REQUIRE_REAPPROVAL_ON_EDIT === "false") {
    return keep;
  }
  return "PENDING";
}

/* =====================================================================
   Sellers: create / prove ownership / edit
   ===================================================================== */

export async function createListing(_prev: FormState, fd: FormData): Promise<FormState> {
  // Honeypot: real people never fill this hidden field
  if (String(fd.get("website") ?? "") !== "") redirect("/");

  // Only approved members (checked live) can post. The listing is saved to their account.
  const me = await getActiveMember();
  if (!me && !(await isAdmin())) redirect("/members");

  const values = formValues(fd);
  if (fd.get("terms") !== "on") {
    return { fieldErrors: { terms: ["Please agree to the Terms of Use and Privacy Policy to post."] }, values };
  }
  const parsed = createSchema.safeParse(rawForm(fd));
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
      images: d.images,
      imageUrl: d.images[0] ?? null,
      contact: d.contact,
      whatsapp: normalizeWhatsapp(d.whatsapp) ?? null,
      phone,
      passcodeHash: hashPasscode(d.passcode),
      status: await statusAfterChange(null),
      ownerId: me?.id ?? null,
    },
  });

  if (listing.status === "PENDING") await notifyAdminPending(listing, "new");
  await updateUserSession({ addId: listing.id }); // let them edit right away
  refresh();
  redirect(`/sell/done?id=${listing.id}`);
}

export async function verifyAccess(_prev: FormState, fd: FormData): Promise<FormState> {
  const rawId = String(fd.get("id") ?? "").trim();
  const credential = String(fd.get("credential") ?? "").trim();
  const values = { id: rawId };

  // People can type the post number (BSC-0042 or 42) or the long listing ID
  let id = rawId;
  const postNumber = parseListingId(rawId);
  if (postNumber !== null) {
    const found = await db.listing.findFirst({ where: { listingNumber: postNumber }, select: { id: true } });
    id = found?.id ?? "no-such-listing";
  }
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
    // If they're signed in as a member, an older listing moves into their account
    const me = await getActiveMember();
    if (me && !listing.ownerId) await db.listing.update({ where: { id }, data: { ownerId: me.id } });
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
  const me = await getActiveMember();
  if (me) await db.listing.updateMany({ where: { phone, ownerId: null }, data: { ownerId: me.id } });
  redirect("/manage");
}

async function requireOwner(id: string) {
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) redirect("/manage");
  if (!(await canManageListing(listing))) redirect(`/manage?id=${id}`);
  return listing;
}

export async function updateListing(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const listing = await requireOwner(id);

  const values = formValues(fd);
  const parsed = editSchema.safeParse(rawForm(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: ["Enter a valid phone number"] }, values };

  const d = parsed.data;
  const updated = await db.listing.update({
    where: { id },
    data: {
      title: d.title,
      description: d.description,
      priceCents: toCents(d.price),
      category: d.category,
      condition: d.condition,
      location: d.location,
      images: d.images,
      imageUrl: d.images[0] ?? null,
      contact: d.contact,
      whatsapp: normalizeWhatsapp(d.whatsapp) ?? null,
      phone,
      ...(d.passcode ? { passcodeHash: hashPasscode(d.passcode) } : {}),
      status: await statusAfterChange(listing.status),
      rejectionReason: null,
    },
  });

  if (updated.status === "PENDING") await notifyAdminPending(updated, "edited");

  refresh();
  revalidatePath(`/listings/${id}`);
  redirect(`/manage/${id}?saved=1`);
}

/**
 * The seller moves a listing between Available, Pending (a buyer is lined up) and Sold.
 * Only listings that have already been approved can be switched, so this can't skip the admin's review.
 * Relisting something that was sold follows the normal approval rules.
 */
export async function setListingStatus(id: string, next: "APPROVED" | "SALE_PENDING" | "SOLD") {
  const listing = await requireOwner(id);
  const current = listing.status;
  let status: ListingStatus | null = null;

  if (current === "APPROVED" || current === "SALE_PENDING") {
    if (next === "SOLD" || next === "APPROVED" || next === "SALE_PENDING") status = next;
  } else if (current === "SOLD" && next === "APPROVED") {
    status = await statusAfterChange(null);
  }

  if (status && status !== current) {
    const updated = await db.listing.update({ where: { id }, data: { status } });
    if (updated.status === "PENDING") await notifyAdminPending(updated, "edited");
  }
  refresh();
  revalidatePath(`/listings/${id}`);
}

export async function deleteMyListing(id: string) {
  await requireOwner(id);
  await db.listing.delete({ where: { id } });
  refresh();
  redirect((await getActiveMember()) ? "/account" : "/manage");
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
