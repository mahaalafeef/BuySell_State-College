import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMyListing, setSold, updateListing } from "@/app/actions";
import { ListingForm } from "@/components/ListingForm";
import { StatusBadge } from "@/components/StatusBadge";
import { db } from "@/lib/db";
import { canManage } from "@/lib/session";

export const metadata: Metadata = { title: "Edit listing" };
export const dynamic = "force-dynamic";

export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) redirect("/manage");
  if (!(await canManage(listing))) redirect(`/manage?id=${id}`);

  const initial = {
    title: listing.title,
    description: listing.description,
    price: Number.isInteger(listing.priceCents / 100)
      ? String(listing.priceCents / 100)
      : (listing.priceCents / 100).toFixed(2),
    category: listing.category,
    condition: listing.condition,
    location: listing.location,
    imageUrl: listing.imageUrl ?? "",
    contact: listing.contact,
    phone: listing.phone,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Edit listing</h1>
        <StatusBadge status={listing.status} />
      </div>

      {saved && (
        <p role="status" className="rounded-md bg-ok/10 p-3 text-ok">
          Changes saved.
        </p>
      )}
      {listing.status === "REJECTED" && (
        <p className="rounded-md bg-danger/10 p-3 text-danger">
          This listing wasn't approved{listing.rejectionReason ? `: ${listing.rejectionReason}` : "."} Update it and
          save to send it back for review.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/listings/${listing.id}`} className="btn-ghost">
          View listing
        </Link>
        <form action={setSold.bind(null, listing.id, listing.status !== "SOLD")}>
          <button className="btn-ghost">{listing.status === "SOLD" ? "Relist" : "Mark as sold"}</button>
        </form>
        <form action={deleteMyListing.bind(null, listing.id)}>
          <button className="btn-danger">Delete</button>
        </form>
      </div>

      <ListingForm mode="edit" action={updateListing.bind(null, listing.id)} initial={initial} />
    </div>
  );
}
