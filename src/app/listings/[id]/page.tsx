import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/PhotoGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { formatListingPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { canManage, isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id }, select: { title: true, status: true } });
  return { title: l && l.status === "APPROVED" ? l.title : "Listing" };
}

export default async function ListingPage({ params }: Params) {
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  const owner = await canManage(listing);
  const admin = await isAdmin();
  const publicStatus = listing.status === "APPROVED" || listing.status === "SOLD";
  if (!publicStatus && !owner && !admin) notFound();

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
          <dt className="text-muted">Posted</dt>
          <dd className="col-span-2">{listing.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</dd>
        </dl>

        <p className="max-w-prose whitespace-pre-wrap">{listing.description}</p>

        {listing.status !== "SOLD" && (
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold">Contact the seller</p>
            <p className="mt-1 break-words">{listing.contact}</p>
            {listing.whatsapp && listing.status === "APPROVED" && (
              <a
                href={`/contact/${listing.id}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="btn-primary mt-3"
              >
                Message on WhatsApp
              </a>
            )}
          </div>
        )}

        {owner && (
          <Link href={`/manage/${listing.id}`} className="btn-ghost">
            Edit this listing
          </Link>
        )}
      </div>
    </div>
  );
}
