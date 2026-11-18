import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatListingPrice, SITE_NAME } from "@/lib/config";
import { maskContacts } from "@/lib/mask";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// A small public preview page. WhatsApp reads its title and photo to show a preview card in the group.
// It never shows contact details, so it is safe to open for anyone.
const isSold = (l: object) => (l as { availability?: string }).availability === "SOLD";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id } });
  if (!l || l.status !== "APPROVED" || isSold(l)) return { title: "Listing", robots: { index: false } };

  const title = `${maskContacts(l.title)} - ${formatListingPrice(l.priceCents, l.category)}`;
  const description = maskContacts(l.description).replace(/\s+/g, " ").slice(0, 160);
  const photo = l.images[0] ?? l.imageUrl;
  return {
    title,
    description,
    robots: { index: false }, // the real listing page is the one search engines should show
    openGraph: { title, description, siteName: SITE_NAME, type: "website", ...(photo ? { images: [{ url: photo }] } : {}) },
    twitter: { card: photo ? "summary_large_image" : "summary", title, description },
  };
}

export default async function SharePage({ params }: Params) {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id } });
  if (!l || l.status !== "APPROVED" || isSold(l)) notFound();

  const photo = l.images[0] ?? l.imageUrl;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={maskContacts(l.title)} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-paper text-muted">No photo</div>
        )}
        <div className="space-y-2 p-5">
          <h1 className="text-2xl font-bold">{maskContacts(l.title)}</h1>
          <p className="inline-block rounded-md sticker px-3 py-1 font-display text-xl font-bold">
            {formatListingPrice(l.priceCents, l.category)}
          </p>
          {l.location && <p className="text-muted">{l.location}</p>}
          <p className="whitespace-pre-wrap">{maskContacts(l.description).slice(0, 300)}</p>
          <Link href={`/listings/${l.id}`} className="btn-primary w-full">
            View full listing
          </Link>
        </div>
      </div>
    </div>
  );
}
