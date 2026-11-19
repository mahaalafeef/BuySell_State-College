import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewMessageForm } from "@/components/MessageForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ShareButton } from "@/components/ShareButton";
import { Stars } from "@/components/Stars";
import { StatusBadge } from "@/components/StatusBadge";
import { formatListingId, formatListingPrice, formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { canManageListing, getActiveMember, hasMemberAccess } from "@/lib/memberAccess";
import { MESSAGE_NOTICE } from "@/lib/messages";
import { displayName, getSellerRating, reviewCountText } from "@/lib/reviews";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const l = await db.listing.findUnique({
    where: { id },
    select: {
      title: true,
      status: true,
      description: true,
      priceCents: true,
      category: true,
      location: true,
      images: true,
      imageUrl: true,
    },
  });
  if (!l || (l.status !== "APPROVED" && l.status !== "SALE_PENDING")) return { title: "Listing" };

  // This is what WhatsApp shows when the link is shared: the photo, the title, and the price and area
  const image = l.images[0] ?? l.imageUrl;
  const summary = `${formatListingPrice(l.priceCents, l.category)} · ${l.location}. ${l.description.slice(0, 140)}`;
  return {
    title: l.title,
    description: summary,
    openGraph: { title: l.title, description: summary, type: "website", ...(image ? { images: [{ url: image }] } : {}) },
  };
}

export default async function ListingPage({ params }: Params) {
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  const owner = await canManageListing(listing);
  const admin = await isAdmin();
  const isMember = await hasMemberAccess(); // approved member (checked live) or admin
  const publicStatus = listing.status === "APPROVED" || listing.status === "SALE_PENDING" || listing.status === "SOLD";
  if (!publicStatus && !owner && !admin) notFound();

  // Seller details and rating are for approved members only
  const seller =
    isMember && listing.ownerId
      ? await db.joinRequest.findFirst({ where: { id: listing.ownerId, status: "APPROVED" }, select: { id: true, name: true } })
      : null;
  const rating = seller ? await getSellerRating(seller.id) : null;

  // In-site messaging: a signed-in member can message the seller of a listing that belongs to a member account
  const me = await getActiveMember();
  const canMessage =
    !!me && !!seller && seller.id !== me.id && (listing.status === "APPROVED" || listing.status === "SALE_PENDING");
  const existingChat =
    me && canMessage
      ? await db.conversation.findFirst({ where: { listingId: listing.id, buyerId: me.id }, select: { id: true } })
      : null;

  const photos = listing.images.length ? listing.images : listing.imageUrl ? [listing.imageUrl] : [];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <PhotoGallery photos={photos} title={listing.title} />

      <div className="space-y-5">
        {(owner || admin) && listing.status !== "APPROVED" && (
          <div className="rounded-lg bg-amber-100 p-3 text-amber-900">
            <StatusBadge status={listing.status} />
            {listing.status === "REJECTED" && listing.rejectionReason && (
              <p className="mt-1 text-sm">Reason: {listing.rejectionReason}</p>
            )}
            {listing.status === "PENDING" && <p className="mt-1 text-sm">Only you can see this until it's approved.</p>}
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">{listing.title}</h1>
          <p className="mt-2 inline-block rounded-md sticker px-3 py-1 font-display text-2xl font-bold">
            {listing.status === "SOLD" ? "Sold" : formatListingPrice(listing.priceCents, listing.category)}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-muted">Category</dt>
          <dd className="col-span-2">{listing.category}</dd>
          <dt className="text-muted">Condition</dt>
          <dd className="col-span-2">{listing.condition}</dd>
          <dt className="text-muted">Location</dt>
          <dd className="col-span-2">{listing.location}</dd>
          <dt className="text-muted">Post ID</dt>
          <dd className="col-span-2 font-mono">{formatListingId(listing.listingNumber)}</dd>
          <dt className="text-muted">Posted</dt>
          <dd className="col-span-2">{formatPosted(listing.createdAt, true)}</dd>
          <dt className="text-muted">Status</dt>
          <dd className="col-span-2">
            <StatusBadge status={listing.status} />
          </dd>
        </dl>

        <p className="max-w-prose whitespace-pre-wrap">{listing.description}</p>

        {seller && rating && (
          <div className="rounded-lg border border-line bg-white p-4 text-sm">
            <p className="font-semibold">Seller</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <Link href={`/sellers/${seller.id}`} className="underline">
                {displayName(seller.name)}
              </Link>
              {rating.count > 0 ? (
                <>
                  <Stars rating={rating.average} />
                  <span>
                    {rating.average.toFixed(1)} ({reviewCountText(rating.count)})
                  </span>
                </>
              ) : (
                <span className="text-muted">No reviews yet</span>
              )}
            </p>
            <Link href={`/sellers/${seller.id}#reviews`} className="mt-2 inline-block underline">
              See reviews or leave one
            </Link>
          </div>
        )}

        {canMessage && (
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold">Message the seller</p>
            {existingChat ? (
              <Link href={`/messages/${existingChat.id}`} className="btn-primary mt-3">
                Open your conversation
              </Link>
            ) : (
              <div className="mt-2">
                <NewMessageForm listingId={listing.id} />
              </div>
            )}
            <p className="mt-2 text-xs text-muted">{MESSAGE_NOTICE}</p>
          </div>
        )}

        {listing.status !== "SOLD" &&
          (isMember ? (
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="font-semibold">Contact the seller</p>
              <p className="mt-1 break-words">{listing.contact}</p>
              {listing.status === "SALE_PENDING" && (
                <p className="mt-2 rounded-md bg-blue-100 p-2 text-sm text-blue-900">
                  The seller has a sale pending, so this may no longer be available.
                </p>
              )}
              {listing.whatsapp && (listing.status === "APPROVED" || listing.status === "SALE_PENDING") && (
                <a
                  href={`/contact/${listing.id}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="btn-primary mt-3"
                >
                  Message on WhatsApp
                </a>
              )}
              <p className="mt-3 text-xs text-muted">
                This site only connects people and is not part of any sale or rental. Meet in a public place, inspect
                before you pay, and beware of scams. See the{" "}
                <Link href="/terms" className="underline">
                  Terms of Use
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="font-semibold">Contact details are for members</p>
              <p className="mt-1 text-sm text-muted">Log in or create a free account to see how to reach the seller.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/signup" className="btn-primary">Create account</Link>
                <Link href="/login" className="btn-ghost">Member log in</Link>
              </div>
            </div>
          ))}

        {(listing.status === "APPROVED" || listing.status === "SALE_PENDING") && <ShareButton listing={listing} />}

        {owner && (
          <Link href={`/manage/${listing.id}`} className="btn-ghost">
            Edit this listing
          </Link>
        )}
      </div>
    </div>
  );
}
