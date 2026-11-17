import { db } from "@/lib/db";

/** "Maha Alafeef" becomes "Maha A.", so members' full names are not shown to everyone. */
export function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export async function getSellerRating(sellerId: string): Promise<{ average: number; count: number }> {
  const agg = await db.review.aggregate({
    where: { sellerId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { average: agg._avg.rating ?? 0, count: agg._count._all };
}

export function reviewCountText(count: number): string {
  return count === 1 ? "1 review" : `${count} reviews`;
}
