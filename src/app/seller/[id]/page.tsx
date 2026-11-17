import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteReview } from "@/app/account-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ListingCard } from "@/components/ListingCard";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import { currentMemberId, viewerIsMember } from "@/lib/accountAuth";
import { db } from "@/lib/db";
import { maskContacts } from "@/lib/mask";
import { publicName, sellerStats } from "@/lib/seller";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const s = await db.joinRequest.findUnique({ where: { id }, select: { name: true, status: true } });
  return { title: s && s.status === "APPROVED" ? `${publicName(s.name)}'s profile` : "Seller" };
}

export default async function SellerPage({ params }: Params) {
  const { id } = await params;
  const seller = await db.joinRequest.findUnique({ where: { id }, select: { name: true, status: true } });
  if (!seller || seller.status !== "APPROVED") notFound();

  const [viewerId, member, admin, reviews, listings, stats] = await Promise.all([
    currentMemberId(),
    viewerIsMember(),
    isAdmin(),
    db.review.findMany({ where: { sellerId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.listing.findMany({
      where: { ownerId: id, status: "APPROVED", availability: { not: "SOLD" } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    sellerStats([id]),
  ]);
  const stat = stats.get(id);

  const reviewers = await db.joinRequest.findMany({
    where: { id: { in: reviews.map((r) => r.reviewerId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map<string, string>(reviewers.map((r) => [r.id, publicName(r.name)] as [string, string]));

  const isSelf = viewerId === id;
  const canReview = member && !!viewerId && !isSelf;
  const mine = reviews.find((r) => r.reviewerId === viewerId);
  const shown = member ? listings : listings.map((l) => ({ ...l, title: maskContacts(l.title) }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{publicName(seller.name)}</h1>
        {stat && stat.count > 0 ? (
          <p className="flex flex-wrap items-center gap-2 text-lg">
            <Stars value={stat.average} className="text-2xl" />
            <span className="font-semibold">{stat.average.toFixed(1)}</span>
            <span className="text-muted">
              ({stat.count} {stat.count === 1 ? "review" : "reviews"})
            </span>
          </p>
        ) : (
          <p className="text-muted">No reviews yet</p>
        )}
      </header>

      <section aria-label="Reviews" className="space-y-4">
        <h2 className="text-2xl font-bold">Reviews</h2>

        {canReview && <ReviewForm sellerId={id} existing={mine ? { rating: mine.rating, comment: mine.comment ?? "" } : undefined} />}
        {!member && (
          <p className="rounded-xl bg-paper p-4 text-sm">
            Only members can leave reviews.{" "}
            <Link href="/login" className="font-semibold text-brand underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/join" className="font-semibold text-brand underline">
              request to join
            </Link>
            .
          </p>
        )}
        {isSelf && <p className="text-sm text-muted">This is your public profile. You can&rsquo;t review yourself.</p>}

        {reviews.length === 0 ? (
          <p className="text-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-1 rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-semibold">{nameOf.get(r.reviewerId) ?? "Member"}</span>
                  </p>
                  <p className="text-sm text-muted">{r.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                </div>
                {r.comment && <p className="whitespace-pre-wrap">{maskContacts(r.comment)}</p>}
                {(admin || r.reviewerId === viewerId) && (
                  <form action={deleteReview.bind(null, r.id)}>
                    <ConfirmButton message="Delete this review?" className="text-sm font-semibold text-danger underline">
                      Delete review
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {shown.length > 0 && (
        <section aria-label="Listings" className="space-y-4">
          <h2 className="text-2xl font-bold">Listings from {publicName(seller.name)}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((l) => (
              <ListingCard key={l.id} {...l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
