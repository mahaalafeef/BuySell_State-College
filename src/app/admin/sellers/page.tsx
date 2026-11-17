import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { banMember, unbanMember } from "@/app/join-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Stars } from "@/components/Stars";
import { formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { reviewCountText } from "@/lib/reviews";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sellers" };
export const dynamic = "force-dynamic";

const TABS = ["SELLERS", "MEMBERS", "BANNED"] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { SELLERS: "Sellers", MEMBERS: "All members", BANNED: "Banned" };

function show(whatsapp: string) {
  return /^\d+$/.test(whatsapp) ? `+${whatsapp}` : `@${whatsapp}`;
}

export default async function SellersAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { status } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(status ?? "") ? (status as Tab) : "SELLERS";

  const where: Prisma.JoinRequestWhereInput =
    tab === "BANNED"
      ? { status: "BANNED" }
      : tab === "SELLERS"
        ? { status: "APPROVED", listings: { some: {} } }
        : { status: "APPROVED" };

  const [members, nSellers, nMembers, nBanned] = await Promise.all([
    db.joinRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, whatsapp: true, role: true, createdAt: true, decidedAt: true, decidedNote: true },
    }),
    db.joinRequest.count({ where: { status: "APPROVED", listings: { some: {} } } }),
    db.joinRequest.count({ where: { status: "APPROVED" } }),
    db.joinRequest.count({ where: { status: "BANNED" } }),
  ]);
  const counts: Record<Tab, number> = { SELLERS: nSellers, MEMBERS: nMembers, BANNED: nBanned };

  const ids = members.map((m) => m.id);
  const [byStatus, ratings] = await Promise.all([
    db.listing.groupBy({ by: ["ownerId", "status"], where: { ownerId: { in: ids } }, _count: { _all: true } }),
    db.review.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: ids }, reviewer: { status: "APPROVED" } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const listingStats = (id: string) => {
    let live = 0, sold = 0, total = 0;
    for (const g of byStatus) {
      if (g.ownerId !== id) continue;
      const n = g._count._all;
      total += n;
      if (g.status === "APPROVED" || g.status === "SALE_PENDING") live += n;
      else if (g.status === "SOLD") sold += n;
    }
    return { live, sold, total };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Sellers</h1>
        <div className="flex gap-2">
          <Link href="/admin/join" className="btn-ghost">
            Join requests
          </Link>
          <Link href="/admin" className="btn-ghost">
            Back to listings
          </Link>
        </div>
      </div>

      <nav aria-label="Member lists" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/sellers?status=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={t === tab ? "btn-primary" : "btn-ghost"}
          >
            {LABELS[t]} ({counts[t]})
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">
        Banning someone logs them out right away, hides all their live listings, and stops them from applying again
        with the same WhatsApp number. You can unban them later; their hidden listings then go back to your review
        list.
      </p>

      {members.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-5 text-muted">Nobody here yet.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const stats = listingStats(m.id);
            const r = ratings.find((x) => x.sellerId === m.id);
            return (
              <li key={m.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-sm text-muted">
                      {show(m.whatsapp)} · {m.role}
                    </p>
                    <p className="text-xs text-muted">Member since {formatPosted(m.decidedAt ?? m.createdAt)}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>
                      {stats.total} {stats.total === 1 ? "listing" : "listings"}
                      <span className="text-muted">
                        {" "}
                        ({stats.live} live, {stats.sold} sold)
                      </span>
                    </p>
                    <p className="mt-0.5">
                      {r && r._count._all > 0 ? (
                        <>
                          <Stars rating={r._avg.rating ?? 0} /> {(r._avg.rating ?? 0).toFixed(1)}{" "}
                          <span className="text-muted">({reviewCountText(r._count._all)})</span>
                        </>
                      ) : (
                        <span className="text-muted">No reviews</span>
                      )}
                    </p>
                  </div>
                </div>

                {tab === "BANNED" && m.decidedNote && (
                  <p className="mt-2 text-sm text-danger">Reason: {m.decidedNote}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {tab !== "BANNED" && (
                    <>
                      <Link href={`/sellers/${m.id}`} className="btn-ghost">
                        Profile and reviews
                      </Link>
                      <a
                        href={`https://wa.me/${m.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                      >
                        Open WhatsApp chat
                      </a>
                      <form action={banMember.bind(null, m.id)} className="flex flex-wrap gap-2">
                        <input
                          name="reason"
                          placeholder="Reason (only you see this)"
                          aria-label={`Reason for banning ${m.name}`}
                          className="input w-52"
                        />
                        <ConfirmButton
                          message={`Ban ${m.name}? They will be logged out and all their live listings will be hidden.`}
                          className="btn-danger"
                        >
                          Ban
                        </ConfirmButton>
                      </form>
                    </>
                  )}
                  {tab === "BANNED" && (
                    <form action={unbanMember.bind(null, m.id)}>
                      <ConfirmButton
                        message={`Unban ${m.name}? Their hidden listings go back to your review list.`}
                        className="btn-ghost"
                      >
                        Unban
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
