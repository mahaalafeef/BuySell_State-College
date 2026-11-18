import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { dayKey, STATS_TZ } from "@/lib/stats";

export const metadata: Metadata = { title: "Visitors and members" };
export const dynamic = "force-dynamic";

function Card({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default async function StatsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const today = dayKey();
  const days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(Date.now() - (13 - i) * 86_400_000)));
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [stats, joinCounts, listingCounts, newMembers] = await Promise.all([
    db.dailyStat.findMany({ orderBy: { day: "desc" }, take: 30 }),
    db.joinRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.joinRequest.count({ where: { status: "APPROVED", decidedAt: { gte: weekAgo } } }),
  ]);

  const byDay = new Map<string, { visitors: number; memberVisitors: number; views: number }>(
    stats.map((s) => [s.day, { visitors: s.visitors, memberVisitors: s.memberVisitors, views: s.views }] as [string, { visitors: number; memberVisitors: number; views: number }]),
  );
  const get = (d: string) => byDay.get(d) ?? { visitors: 0, memberVisitors: 0, views: 0 };
  const now = get(today);
  const series = days.map((d) => ({ day: d, ...get(d) }));
  const max = Math.max(1, ...series.map((s) => s.visitors));

  const last7 = series.slice(-7);
  const visits7 = last7.reduce((n, s) => n + s.visitors, 0);
  const views7 = last7.reduce((n, s) => n + s.views, 0);
  const visits30 = stats.reduce((n, s) => n + s.visitors, 0);

  const join = (s: string) => joinCounts.find((c) => c.status === s)?._count._all ?? 0;
  const listings = (s: string) => listingCounts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Visitors and members</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>

      <section aria-label="Today" className="space-y-3">
        <h2 className="text-2xl font-bold">Today</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card label="Visitors today" value={now.visitors} hint="Each person counted once a day" />
          <Card label="Members who visited" value={now.memberVisitors} hint="Visitors who were logged in" />
          <Card label="Page views today" value={now.views} />
        </div>
      </section>

      <section aria-label="Recent visitors" className="space-y-3">
        <h2 className="text-2xl font-bold">Last 14 days</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card label="Visitors, last 7 days" value={visits7} hint="Daily visitors added up" />
          <Card label="Page views, last 7 days" value={views7} />
          <Card label="Visitors, last 30 days" value={visits30} hint="Daily visitors added up" />
        </div>

        <div role="img" aria-label="Visitors per day for the last 14 days" className="rounded-xl border border-line bg-white p-4">
          <div className="flex h-36 items-end gap-1.5">
            {series.map((s) => (
              <div key={s.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-muted">{s.visitors || ""}</span>
                <div
                  className="w-full rounded-t bg-brand"
                  style={{ height: s.visitors ? Math.max(4, Math.round((s.visitors / max) * 100)) : 0 }}
                />
                <span className="text-[10px] text-muted">{s.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper">
              <tr>
                <th className="p-3">Day</th>
                <th className="p-3">Visitors</th>
                <th className="p-3">Members</th>
                <th className="p-3">Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((s) => (
                <tr key={s.day} className="border-t border-line">
                  <td className="p-3">{s.day}</td>
                  <td className="p-3">{s.visitors}</td>
                  <td className="p-3">{s.memberVisitors}</td>
                  <td className="p-3">{s.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Visitors are counted once per day without cookies or stored IP addresses, so the numbers are close but not
          exact. Link previews and search bots are not counted, and neither are your own visits. Days change at
          midnight in {STATS_TZ}.
        </p>
      </section>

      <section aria-label="Members and listings" className="space-y-3">
        <h2 className="text-2xl font-bold">Members and listings</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Card label="Approved members" value={join("APPROVED")} />
          <Card label="New members, last 7 days" value={newMembers} />
          <Card label="Join requests waiting" value={join("PENDING")} />
          <Card label="Not approved" value={join("REJECTED")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card label="Live listings" value={listings("APPROVED")} />
          <Card label="Listings waiting for approval" value={listings("PENDING")} />
          <Card label="Not approved listings" value={listings("REJECTED")} />
        </div>
      </section>
    </div>
  );
}
