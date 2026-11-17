import { db } from "./db";

/** "Sam Kirk" becomes "Sam K." so members are recognisable without showing full names. */
export function publicName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${parts[0]} ${last[0].toUpperCase()}.` : parts[0];
}

export type SellerStats = { average: number; count: number };

/** Average star rating and number of reviews for each seller id. */
export async function sellerStats(ids: string[]): Promise<Map<string, SellerStats>> {
  const out = new Map<string, SellerStats>();
  if (ids.length === 0) return out;
  const rows = await db.review.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const r of rows) out.set(r.sellerId, { average: r._avg.rating ?? 0, count: r._count._all });
  return out;
}
