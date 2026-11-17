"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "./actions";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/config";
import { db } from "@/lib/db";
import { notifyAdminPending } from "@/lib/email";
import { currentMemberId } from "@/lib/accountAuth";
import { hashPasscode, normalizePhone, verifyPasscode } from "@/lib/security";
import { isAdmin } from "@/lib/session";
import { getAutoApprove } from "@/lib/settings";
import { listingInput, toCents } from "@/lib/listingInput";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type Availability = "AVAILABLE" | "PENDING_SALE" | "SOLD";
export type ReviewState = { ok?: boolean; error?: string } | undefined;
export type ClaimState = { ok?: boolean; error?: string } | undefined;

/* ---------- guards ---------- */

async function requireMemberId(): Promise<string> {
  const id = await currentMemberId();
  if (!id) redirect("/members");
  return id;
}

async function requireOwned(listingId: string) {
  const memberId = await requireMemberId();
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.ownerId !== memberId) redirect("/account");
  return listing;
}

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/housing");
  revalidatePath("/account");
  revalidatePath("/admin");
  if (id) revalidatePath(`/listings/${id}`);
}

/** The same approval rules as everywhere else: edits may need the admin to approve again. */
async function statusAfterEdit(current: string): Promise<"PENDING" | "APPROVED" | "SOLD"> {
  if (current === "SOLD") return "SOLD"; // older-style sold listing
  if (await getAutoApprove()) return "APPROVED";
  if (current === "APPROVED" && process.env.REQUIRE_REAPPROVAL_ON_EDIT === "false") return "APPROVED";
  return "PENDING";
}

/* ---------- a member's own listings ---------- */

/** Available / Sale pending / Sold. This is separate from the admin's approval. */
export async function setAvailability(id: string, value: Availability) {
  const listing = await requireOwned(id);
  if (!["AVAILABLE", "PENDING_SALE", "SOLD"].includes(value)) return;

  const data: { availability: Availability; status?: "APPROVED" | "PENDING" } = { availability: value };
  // An older listing marked sold the old way goes back through the normal approval rules
  if (listing.status === "SOLD" && value !== "SOLD") data.status = (await getAutoApprove()) ? "APPROVED" : "PENDING";

  await db.listing.update({ where: { id }, data });
  refresh(id);
}

export async function updateOwnedListing(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const listing = await requireOwned(id);

  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "passcode") values[k] = v;

  const parsed = listingInput.safeParse({
    ...Object.fromEntries(fd),
    images: fd.getAll("images").filter((x): x is string => typeof x === "string" && x !== ""),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const d = parsed.data;

  // The private phone is optional here: blank keeps the one the listing already has
  let phone = listing.phone;
  if (d.phone) {
    const cleaned = normalizePhone(d.phone);
    if (!cleaned) return { fieldErrors: { phone: ["Enter a valid phone number"] }, values };
    phone = cleaned;
  }

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
      status: await statusAfterEdit(listing.status),
      rejectionReason: null,
    },
  });

  if (updated.status === "PENDING") await notifyAdminPending(updated, "edited");
  refresh(id);
  redirect(`/account/listings/${id}?saved=1`);
}

export async function deleteOwnedListing(id: string) {
  const listing = await requireOwned(id);

  // Tidy up the photos too (best effort: a failure here never blocks the delete)
  try {
    const urls = [...listing.images, ...(listing.imageUrl ? [listing.imageUrl] : [])].filter((u: string) =>
      u.includes("blob.vercel-storage.com"),
    );
    if (urls.length > 0) await del([...new Set(urls)]);
  } catch (err) {
    console.error("Photo cleanup failed:", err);
  }

  await db.listing.delete({ where: { id } });
  refresh();
  redirect("/account");
}

/** Link an older listing (made before accounts existed) to this member's account. */
export async function claimListing(_prev: ClaimState, fd: FormData): Promise<ClaimState> {
  const memberId = await requireMemberId();
  const id = String(fd.get("id") ?? "").trim();
  const credential = String(fd.get("credential") ?? "").trim();
  const generic = "That didn't match. Check the listing ID and try again.";
  if (!id || !credential) return { error: "Enter the listing ID and your passcode or phone number." };

  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) return { error: generic };
  if (listing.ownerId === memberId) return { ok: true };
  if (listing.ownerId) return { error: generic }; // already belongs to someone

  if (listing.lockedUntil && listing.lockedUntil > new Date()) {
    return { error: "Too many wrong attempts. Try again in a few minutes." };
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
    return { error: generic };
  }

  await db.listing.update({ where: { id }, data: { ownerId: memberId, failedAttempts: 0, lockedUntil: null } });
  refresh(id);
  return { ok: true };
}

/* ---------- reviews ---------- */

/** One review per member per seller. Writing again edits the earlier one. */
export async function saveReview(sellerId: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const reviewerId = await requireMemberId();
  if (reviewerId === sellerId) return { error: "You can't review yourself." };

  const seller = await db.joinRequest.findUnique({ where: { id: sellerId }, select: { status: true } });
  if (seller?.status !== "APPROVED") return { error: "This member can't be reviewed." };

  const rating = Number(fd.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose 1 to 5 stars." };
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 600);

  await db.review.upsert({
    where: { sellerId_reviewerId: { sellerId, reviewerId } },
    create: { sellerId, reviewerId, rating, comment: comment || null },
    update: { rating, comment: comment || null },
  });
  revalidatePath(`/seller/${sellerId}`);
  return { ok: true };
}

/** The author can remove their own review, and the admin can remove any review. */
export async function deleteReview(id: string) {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) return;
  const admin = await isAdmin();
  if (!admin && review.reviewerId !== (await currentMemberId())) redirect("/members");

  await db.review.delete({ where: { id } });
  revalidatePath(`/seller/${review.sellerId}`);
}
