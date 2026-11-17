import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMyListing } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ListingStatusActions } from "@/components/ListingStatusActions";
import { Stars } from "@/components/Stars";
import { StatusBadge } from "@/components/StatusBadge";
import { formatListingId, formatPosted, formatPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { getActiveMember } from "@/lib/memberAccess";
import { displayName, getSellerRating, reviewCountText } from "@/lib/reviews";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await getActiveMember();
  if (!me) redirect("/members");

  const [listings, rating, reviews] = await Promise.all([
    db.listing.findMany({ where: { ownerId: me.id }, orderBy: { createdAt: "desc" } }),
    getSellerRating(me.id),
    db.review.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { reviewer: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">My account</h1>
        <p className="text-lg">{displayName(me.name)}</p>
        <p className="flex flex-wrap items-center gap-2">
          {rating.count > 0 ? (
            <>
              <Stars rating={rating.average} className="text-xl" />
              <strong>{rating.average.toFixed(1)}</strong>
              <span className="text-muted">({reviewCountText(rating.count)})</span>
            </>
          ) : (
            <span className="text-muted">No reviews yet</span>
          )}
          <Link href={`/sellers/${me.id}`} className="text-sm underline">
            See my public profile
          </Link>
        </p>
      </header>

      <section aria-labelledby="my-listings" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-listings" className="text-xl font-bold">
            My listings
          </h2>
          <Link href="/sell" className="btn-primary">
            Post a listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="rounded-lg border border-line bg-white p-4 text-muted">
            You haven&rsquo;t posted anything yet. Listings you post are saved here, and you can edit them, mark them
            pending or sold, or delete them.
          </p>
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => (
              <li key={l.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/listings/${l.id}`} className="block truncate font-semibold hover:underline">
                      {l.title}
                    </Link>
                    <p className="text-sm text-muted">{formatPrice(l.priceCents)}</p>
                    <p className="text-xs text-muted">
                      {formatListingId(l.listingNumber)} · Posted {formatPosted(l.createdAt, true)}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>

                {l.status === "PENDING" && (
                  <p className="mt-2 text-sm text-muted">Waiting for approval. Only you can see it until then.</p>
                )}
                {l.status === "REJECTED" && (
                  <p className="mt-2 text-sm text-danger">
                    Not approved{l.rejectionReason ? `: ${l.rejectionReason}` : "."} Edit it and save to send it back
                    for review.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ListingStatusActions id={l.id} status={l.status} />
                  <Link href={`/manage/${l.id}`} className="btn-ghost">
                    Edit
                  </Link>
                  <form action={deleteMyListing.bind(null, l.id)}>
                    <ConfirmButton message="Delete this listing? This can't be undone." className="btn-danger">
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-reviews" className="space-y-3">
        <h2 id="my-reviews" className="text-xl font-bold">
          Recent reviews about you
        </h2>
        {reviews.length === 0 ? (
          <p className="text-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-white p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  <strong>{displayName(r.reviewer.name)}</strong>
                  <span className="text-sm text-muted">{formatPosted(r.createdAt)}</span>
                </p>
                {r.comment && <p className="mt-2 whitespace-pre-wrap">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
