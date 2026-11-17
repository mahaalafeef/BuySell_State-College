import Link from "next/link";
import { Stars } from "@/components/Stars";
import { db } from "@/lib/db";
import { publicName, sellerStats } from "@/lib/seller";

/** "Sold by Sam K." with the seller's star rating, linking to their profile and reviews. */
export async function SellerPanel({ ownerId }: { ownerId: string | null }) {
  if (!ownerId) return null;
  const seller = await db.joinRequest.findUnique({ where: { id: ownerId }, select: { name: true, status: true } });
  if (!seller || seller.status !== "APPROVED") return null;
  const stat = (await sellerStats([ownerId])).get(ownerId);

  return (
    <Link
      href={`/seller/${ownerId}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-paper p-3 transition-colors hover:bg-line/50"
    >
      <span className="font-semibold">Sold by {publicName(seller.name)}</span>
      {stat && stat.count > 0 ? (
        <span className="flex items-center gap-1.5 text-sm">
          <Stars value={stat.average} />
          <span>
            {stat.average.toFixed(1)} ({stat.count} {stat.count === 1 ? "review" : "reviews"})
          </span>
        </span>
      ) : (
        <span className="text-sm text-muted">No reviews yet</span>
      )}
      <span className="ml-auto text-sm font-semibold text-brand underline">View profile</span>
    </Link>
  );
}
