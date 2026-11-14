import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { PageHero } from "@/components/PageHero";
import { CATEGORIES, HERO_SUBTITLE, HERO_TITLE, SALE_CATEGORIES } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const term = q?.trim() || undefined;
  const activeCategory = category && (CATEGORIES as readonly string[]).includes(category) ? category : undefined;

  const listings = await db.listing.findMany({
    where: {
      status: "APPROVED",
      ...(activeCategory ? { category: activeCategory } : { category: { in: [...SALE_CATEGORIES] } }),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" as const } },
              { description: { contains: term, mode: "insensitive" as const } },
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
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-8">
      <PageHero title={HERO_TITLE} subtitle={HERO_SUBTITLE}>
        <form action="/" className="flex max-w-xl gap-2">
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          <input
            name="q"
            defaultValue={term}
            placeholder="Search for something to buy"
            aria-label="Search listings"
            className="input border-transparent"
          />
          <button className="btn bg-tag text-ink hover:brightness-95">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sell" className="btn bg-white text-brand hover:bg-white/90">
            Post a listing
          </Link>
          <Link href="/housing" className="btn border border-white/40 text-white hover:bg-white/10">
            Browse housing
          </Link>
        </div>
      </PageHero>

      <section className="space-y-4">
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          {[undefined, ...SALE_CATEGORIES].map((cat) => {
            const active = cat === activeCategory;
            return (
              <Link
                key={cat ?? "all"}
                href={hrefFor(cat)}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand hover:text-brand"
                }`}
              >
                {cat ?? "All"}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">{term || activeCategory ? "Results" : "Latest listings"}</h2>
          <p className="text-sm text-muted">
            {listings.length} {listings.length === 1 ? "listing" : "listings"}
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
            <p className="text-lg font-semibold">Nothing here yet</p>
            <p className="mt-1 text-muted">
              {term || activeCategory ? "Try a different search or category." : "List the first item and it will show up here."}
            </p>
            <Link href="/sell?type=item" className="btn-primary mt-4">
              Sell an item
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
