import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { CATEGORIES } from "@/lib/config";
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
      ...(activeCategory ? { category: activeCategory } : {}),
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold sm:text-4xl">For sale</h1>
        <form action="/" className="flex w-full gap-2 sm:max-w-md">
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          <input
            name="q"
            defaultValue={term}
            placeholder="Search listings"
            aria-label="Search listings"
            className="input"
          />
          <button className="btn-primary">Search</button>
        </form>
      </div>

      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {[undefined, ...CATEGORIES].map((cat) => {
          const active = cat === activeCategory;
          return (
            <Link
              key={cat ?? "all"}
              href={hrefFor(cat)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                active ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-paper"
              }`}
            >
              {cat ?? "All"}
            </Link>
          );
        })}
      </nav>

      {listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
          <p className="text-lg font-semibold">Nothing here yet</p>
          <p className="mt-1 text-muted">
            {term || activeCategory ? "Try a different search or category." : "List the first item and it will show up here."}
          </p>
          <Link href="/sell" className="btn-primary mt-4">
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
    </div>
  );
}
