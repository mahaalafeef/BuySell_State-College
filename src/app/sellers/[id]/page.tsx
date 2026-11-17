import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteReview, saveReview } from "@/app/review-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ListingCard } from "@/components/ListingCard";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember, hasMemberAccess } from "@/lib/memberAccess";
import { displayName, getSellerRating, reviewCountText } from "@/lib/reviews";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Seller reviews" };
export const dynamic = "force-dynamic";

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasMemberAccess())) redirect("/members"); // seller profiles are for approved members

  const seller = await db.joinRequest.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, createdAt: true, decidedAt: true },
  });
  if (!seller || seller.status !== "APPROVED") notFound();

  const [me, admin, rating, reviews, listings] = await Promise.all([
    getActiveMember(),
    isAdmin(),
    getSellerRating(id),
    db.review.findMany({
      where: { sellerId: id, reviewer: { status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reviewer: { select: { name: true } } },
    }),
    db.listing.findMany({
      where: { ownerId: id, status: { in: ["APPROVED", "SALE_PENDING"] } },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  const isSelf = me?.id === id;
  const mine = me ? reviews.find((r) => r.reviewerId === me.id) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{displayName(seller.name)}</h1>
        <p className="text-sm text-muted">Member since {formatPosted(seller.decidedAt ?? seller.createdAt)}</p>
        <p className="flex flex-wrap items-center gap-2 text-lg">
          {rating.count > 0 ? (
            <>
              <Stars rating={rating.average} className="text-2xl" />
              <strong>{rating.average.toFixed(1)}</strong>
              <span className="text-muted">({reviewCountText(rating.count)})</span>
            </>
          ) : (
            <span className="text-muted">No reviews yet</span>
          )}
        </p>
        {isSelf && (
          <p className="text-sm">
            This is how other members see your profile.{" "}
            <Link href="/account" className="underline">
              Back to my account
            </Link>
          </p>
        )}
      </header>

      <section aria-labelledby="reviews" className="space-y-4">
        <h2 id="reviews" className="text-xl font-bold">
          Reviews
        </h2>

        {me && !isSelf && (
          <ReviewForm
            action={saveReview.bind(null, id)}
            initialRating={mine?.rating}
            initialComment={mine?.comment ?? undefined}
          />
        )}
        {!me && !admin && <p className="text-sm text-muted">Log in as a member to leave a review.</p>}

        {reviews.length === 0 ? (
          <p className="text-muted">Nobody has reviewed this seller yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <strong>{displayName(r.reviewer.name)}</strong>
                  </p>
                  <p className="text-sm text-muted">{formatPosted(r.createdAt)}</p>
                </div>
                {r.comment && <p className="mt-2 whitespace-pre-wrap">{r.comment}</p>}
                {(admin || r.reviewerId === me?.id) && (
                  <form action={deleteReview.bind(null, r.id)} className="mt-2">
                    <ConfirmButton message="Delete this review?" className="text-sm text-danger underline">
                      {admin && r.reviewerId !== me?.id ? "Delete review (admin)" : "Delete my review"}
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          Reviews are opinions of members, not of this site. Members are shown by first name and last initial.
        </p>
      </section>

      <section aria-labelledby="their-listings" className="space-y-4">
        <h2 id="their-listings" className="text-xl font-bold">
          Listings from this seller
        </h2>
        {listings.length === 0 ? (
          <p className="text-muted">No listings right now.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {listings.map((l) => (
              <ListingCard key={l.id} {...l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
