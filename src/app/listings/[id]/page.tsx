import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/config";
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

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt={listing.title} className="w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-muted">No photo</div>
        )}
      </div>

      <div className="space-y-5">
        {(owner || admin) && listing.status !== "APPROVED" && (
          <div className="rounded-lg bg-tag/30 p-3">
            <StatusBadge status={listing.status} />
            {listing.status === "REJECTED" && listing.rejectionReason && (
              <p className="mt-1 text-sm">Reason: {listing.rejectionReason}</p>
            )}
            {listing.status === "PENDING" && <p className="mt-1 text-sm">Only you can see this until it's approved.</p>}
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">{listing.title}</h1>
          <p className="mt-2 inline-block rounded-sm bg-tag px-3 py-1 font-display text-2xl font-bold">
            {listing.status === "SOLD" ? "Sold" : formatPrice(listing.priceCents)}
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
