import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { PageHero } from "@/components/PageHero";
import { HOUSING_CATEGORIES } from "@/lib/config";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Housing and subleases" };
export const dynamic = "force-dynamic";

export default async function HousingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const term = q?.trim() || undefined;
  const active = category && (HOUSING_CATEGORIES as readonly string[]).includes(category) ? category : undefined;

  const listings = await db.listing.findMany({
    where: {
      status: "APPROVED",
      category: active ? active : { in: [...HOUSING_CATEGORIES] },
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" as const } },
              { description: { contains: term, mode: "insensitive" as const } },
              { location: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const hrefFor = (cat?: string) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (cat) params.set("category", cat);
    const s = params.toString();
    return s ? `/housing?${s}` : "/housing";
  };

  return (
    <div className="space-y-8">
      <PageHero title="Housing and subleases" subtitle="Rooms, apartments, and subleases from people nearby.">
        <form action="/housing" className="flex max-w-xl gap-2">
          {active && <input type="hidden" name="category" value={active} />}
          <input
            name="q"
            defaultValue={term}
            placeholder="Search by place or keyword"
            aria-label="Search housing"
            className="input border-transparent"
          />
          <button className="btn bg-tag text-ink hover:brightness-95">Search</button>
        </form>
        <div className="mt-4">
          <Link href="/sell?type=housing" className="btn bg-white text-brand hover:bg-white/90">
            Post housing
          </Link>
        </div>
      </PageHero>

      <section className="space-y-4">
        <nav aria-label="Housing type" className="flex flex-wrap gap-2">
          {[undefined, ...HOUSING_CATEGORIES].map((cat) => {
            const isActive = cat === active;
            return (
              <Link
                key={cat ?? "all"}
                href={hrefFor(cat)}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  isActive ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand hover:text-brand"
                }`}
              >
                {cat ?? "All"}
              </Link>
            );
          })}
        </nav>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
            <p className="text-lg font-semibold">No housing listed yet</p>
            <p className="mt-1 text-muted">
              {term || active ? "Try a different search or type." : "Have a room or sublease? Post it here."}
            </p>
            <Link href="/sell?type=housing" className="btn-primary mt-4">
              Post housing
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} {...l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
