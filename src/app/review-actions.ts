"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { isAdmin } from "@/lib/session";

export type ReviewState = { ok?: boolean; error?: string } | undefined;

/** An approved member rates a seller from 1 to 5 stars. Saving again updates their earlier review. */
export async function saveReview(sellerId: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const me = await getActiveMember();
  if (!me) redirect("/members");
  if (me.id === sellerId) return { error: "You can't review yourself." };

  const seller = await db.joinRequest.findUnique({ where: { id: sellerId }, select: { status: true } });
  if (seller?.status !== "APPROVED") return { error: "This seller isn't available to review." };

  const rating = Number(fd.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 500);

  await db.review.upsert({
    where: { sellerId_reviewerId: { sellerId, reviewerId: me.id } },
    update: { rating, comment: comment || null },
    create: { sellerId, reviewerId: me.id, rating, comment: comment || null },
  });

  revalidatePath(`/sellers/${sellerId}`);
  revalidatePath("/account");
  return { ok: true };
}

/** The person who wrote a review can delete it, and so can the admin. */
export async function deleteReview(reviewId: string) {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, sellerId: true, reviewerId: true },
  });
  if (!review) return;

  const me = await getActiveMember();
  if (!(await isAdmin()) && me?.id !== review.reviewerId) return;

  await db.review.delete({ where: { id: review.id } });
  revalidatePath(`/sellers/${review.sellerId}`);
  revalidatePath("/account");
}
