import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { formatListingId, formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { canManageListing } from "@/lib/memberAccess";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";

export const dynamic = "force-dynamic";

export default async function Done({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const listing = id ? await db.listing.findUnique({ where: { id } }) : null;
  if (!listing || !(await canManageListing(listing))) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl font-bold">Your listing is posted</h1>
      <p>
        <StatusBadge status={listing.status} />
      </p>
      <p>
        {listing.status === "APPROVED"
          ? "It's live now."
          : "We'll review it first. You can still edit it while you wait."}
      </p>

      <div className="rounded-lg border border-line bg-white p-4">
        <p className="font-semibold">Your post number</p>
        <p className="mt-1 rounded bg-paper p-2 font-mono text-lg">{formatListingId(listing.listingNumber)}</p>
        <p className="mt-1 text-sm text-muted">Posted {formatPosted(listing.createdAt, true)}</p>
        <p className="mt-2 text-sm text-muted">
          This listing is saved in your account. Find it any time under My account, where you can edit it, mark it
          pending or sold, or delete it.
        </p>
      </div>

      {listing.status === "APPROVED" && (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="font-semibold">Tell your WhatsApp group</p>
          <p className="mt-1 text-sm text-muted">Opens WhatsApp so you can pick the group and send it.</p>
          <ShareToWhatsApp listing={listing} className="btn-primary mt-3" />
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/account" className="btn-primary">
          Go to my account
        </Link>
        <Link href={`/manage/${listing.id}`} className="btn-ghost">
          Edit listing
        </Link>
        <Link href="/" className="btn-ghost">
          Browse listings
        </Link>
      </div>
    </div>
  );
}
