import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareButton } from "@/components/ShareButton";
import { formatListingId, formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { canManageListing } from "@/lib/memberAccess";

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

      {listing.status === "APPROVED" ? (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="font-semibold">Tell the WhatsApp group</p>
          <p className="mt-1 text-sm text-muted">
            Your listing is live. Tap the button, choose the group, and send. Your contact details are not included.
          </p>
          <ShareButton listing={listing} label="Share to a WhatsApp group" className="btn-primary mt-3" />
        </div>
      ) : (
        <p className="text-sm text-muted">
          Once your listing is approved, you can share it to the WhatsApp group from My account.
        </p>
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
