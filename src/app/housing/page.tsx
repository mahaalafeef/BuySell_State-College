import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold sm:text-4xl">Housing and subleases</h1>
        <form action="/housing" className="flex w-full gap-2 sm:max-w-md">
          {active && <input type="hidden" name="category" value={active} />}
          <input
            name="q"
            defaultValue={term}
            placeholder="Search by place or keyword"
            aria-label="Search housing"
            className="input"
          />
          <button className="btn-primary">Search</button>
        </form>
      </div>

      <nav aria-label="Housing type" className="flex flex-wrap gap-2">
        {[undefined, ...HOUSING_CATEGORIES].map((cat) => {
          const isActive = cat === active;
          return (
            <Link
              key={cat ?? "all"}
              href={hrefFor(cat)}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                isActive ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-paper"
              }`}
            >
              {cat ?? "All"}
            </Link>
          );
        })}
      </nav>

      {listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
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
    </div>
  );
}
